import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiClientError, apiDelete, apiGet, apiPost, apiPut } from "../services/apiClient";

export type TenantUserRole = "tenant_user";
export type TenantUserStatus = "active" | "inactive";

export interface ApiTenantUser {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: TenantUserRole;
  status: TenantUserStatus;
  updatedAt: string;
}

export interface CreateTenantUserInput {
  email: string;
  name: string;
  password: string;
  role?: TenantUserRole;
  status?: TenantUserStatus;
}

export interface UpdateTenantUserInput {
  email?: string;
  name?: string;
  password?: string;
  role?: TenantUserRole;
  status?: TenantUserStatus;
}

export const useTenantUserStore = defineStore("tenantUsers", () => {
  const users = ref<ApiTenantUser[]>([]);
  const errorMessage = ref<string | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const activeUserCount = computed(() => users.value.filter((user) => user.status === "active").length);

  async function fetchUsers(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      users.value = await apiGet<ApiTenantUser[]>("/api/v1/tenant-users");
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil user tenant.");
      users.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createUser(input: CreateTenantUserInput): Promise<ApiTenantUser | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const created = await apiPost<ApiTenantUser>("/api/v1/tenant-users", input);
      users.value = [created, ...users.value.filter((user) => user.id !== created.id)];
      return created;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal menambahkan user tenant.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateUser(userId: string, input: UpdateTenantUserInput): Promise<ApiTenantUser | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const updated = await apiPut<ApiTenantUser>(`/api/v1/tenant-users/${encodeURIComponent(userId)}`, input);
      users.value = users.value.map((user) => user.id === updated.id ? updated : user);
      return updated;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal memperbarui user tenant.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteUser(userId: string): Promise<boolean> {
    errorMessage.value = null;

    try {
      await apiDelete<void>(`/api/v1/tenant-users/${encodeURIComponent(userId)}`);
      users.value = users.value.filter((user) => user.id !== userId);
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal menghapus user tenant.");
      return false;
    }
  }

  function clearError(): void {
    errorMessage.value = null;
  }

  return {
    activeUserCount,
    clearError,
    createUser,
    deleteUser,
    errorMessage,
    fetchUsers,
    isLoading,
    isSaving,
    updateUser,
    users
  };
});

function normalizeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? "Sesi login berakhir. Silakan login ulang." : error.message;
  }

  if (error instanceof TypeError) {
    return "API backend belum dapat dihubungi. Pastikan Fastify lokal sedang berjalan.";
  }

  return fallback;
}
