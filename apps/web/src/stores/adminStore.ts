import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiClientError, apiDelete, apiGet, apiPost, apiPut } from "../services/apiClient";

export type TenantLicenseStatus = "trial" | "active" | "suspended" | "revoked";

export interface AdminTenantLicense {
  accountName: string;
  createdAt: string;
  id: string;
  licenseExpiresAt: string | null;
  licenseStatus: TenantLicenseStatus;
  maxDevices: number;
  maxPlots: number;
  ownerEmail: string;
  updatedAt: string;
}

export interface CreateTenantLicenseInput {
  accountName: string;
  licenseExpiresAt?: string | null;
  licenseStatus?: TenantLicenseStatus;
  maxDevices: number;
  maxPlots: number;
  ownerEmail: string;
  password: string;
  tenantId?: string;
}

export interface UpdateTenantLicenseInput {
  accountName?: string;
  licenseExpiresAt?: string | null;
  licenseStatus?: TenantLicenseStatus;
  maxDevices?: number;
  maxPlots?: number;
  ownerEmail?: string;
  password?: string;
}

export interface AdminOverview {
  activeLicenses: number;
  licenseBreakdown: Record<TenantLicenseStatus, number>;
  systemHealth: {
    api: string;
    database: string;
    mqttIngestor: string;
  };
  totalTenants: number;
}

export const useAdminStore = defineStore("admin", () => {
  const tenants = ref<AdminTenantLicense[]>([]);
  const overview = ref<AdminOverview | null>(null);
  const errorMessage = ref<string | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const activeLicenseCount = computed(() => tenants.value.filter((tenant) => tenant.licenseStatus === "active" || tenant.licenseStatus === "trial").length);
  const revokedLicenseCount = computed(() => tenants.value.filter((tenant) => tenant.licenseStatus === "revoked").length);
  const suspendedLicenseCount = computed(() => tenants.value.filter((tenant) => tenant.licenseStatus === "suspended").length);

  async function fetchOverview(): Promise<void> {
    errorMessage.value = null;

    try {
      overview.value = await apiGet<AdminOverview>("/api/admin/overview");
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil ringkasan sistem.");
      overview.value = null;
    }
  }

  async function fetchTenants(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      tenants.value = await apiGet<AdminTenantLicense[]>("/api/admin/tenants");
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil lisensi tenant.");
      tenants.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createTenantLicense(input: CreateTenantLicenseInput): Promise<AdminTenantLicense | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const created = await apiPost<AdminTenantLicense>("/api/admin/tenants", input);
      tenants.value = [created, ...tenants.value.filter((tenant) => tenant.id !== created.id)];
      void fetchOverview();
      return created;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal membuat lisensi tenant.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateTenantLicense(tenantId: string, input: UpdateTenantLicenseInput): Promise<AdminTenantLicense | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const updated = await apiPut<AdminTenantLicense>(`/api/admin/tenants/${encodeURIComponent(tenantId)}`, input);
      tenants.value = tenants.value.map((tenant) => tenant.id === updated.id ? updated : tenant);
      void fetchOverview();
      return updated;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal memperbarui lisensi tenant.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function revokeTenantLicense(tenantId: string): Promise<AdminTenantLicense | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const revoked = await apiDelete<AdminTenantLicense>(`/api/admin/tenants/${encodeURIComponent(tenantId)}`);
      tenants.value = tenants.value.map((tenant) => tenant.id === revoked.id ? revoked : tenant);
      void fetchOverview();
      return revoked;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mencabut lisensi tenant.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  function clearError(): void {
    errorMessage.value = null;
  }

  return {
    activeLicenseCount,
    clearError,
    createTenantLicense,
    errorMessage,
    fetchOverview,
    fetchTenants,
    isLoading,
    isSaving,
    overview,
    revokedLicenseCount,
    revokeTenantLicense,
    suspendedLicenseCount,
    tenants,
    updateTenantLicense
  };
});

function normalizeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? "Sesi admin berakhir. Silakan login ulang." : error.message;
  }

  if (error instanceof TypeError) {
    return "API backend belum dapat dihubungi. Pastikan Fastify lokal sedang berjalan.";
  }

  return fallback;
}
