import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiClientError, apiGet } from "../services/apiClient";

export interface TenantFieldProfile {
  areaHectares: number | null;
  areaLabel: string;
  bmkgAdm4Code: string;
  cropId: string | null;
  cropLabel: string;
  id: string;
  name: string;
  polygonGeojson: unknown;
  regionLabel: string;
}

interface ApiPlotProfile {
  areaHectares: number | null;
  areaLabel: string;
  bmkgAdm4Code: string | null;
  cropId: string | null;
  cropName: string | null;
  id: string;
  name: string;
  polygonGeojson: unknown;
  regionLabel: string;
}

export const useTenantProfileStore = defineStore("tenantProfile", () => {
  const activeTenant = ref({
    id: "demo-tenant",
    name: "Sedayafarm Demo Tenant",
    licenseTier: "Smart Farming Pro"
  });
  const fields = ref<TenantFieldProfile[]>([]);
  const activeFieldId = ref("");
  const errorMessage = ref<string | null>(null);
  const isLoading = ref(false);

  const activeField = computed(() => fields.value.find((field) => field.id === activeFieldId.value) ?? fields.value[0] ?? null);
  const activeBmkgAdm4Code = computed(() => activeField.value?.bmkgAdm4Code ?? "");
  const activeFieldLabel = computed(() => {
    if (!activeField.value) {
      return "Zona belum diatur";
    }

    return `${activeField.value.name} / ${activeField.value.areaLabel}`;
  });

  async function fetchFields(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const plots = await apiGet<ApiPlotProfile[]>("/api/v1/plots");
      syncFieldsFromPlots(plots);
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil zona tenant.");
      fields.value = [];
      activeFieldId.value = "";
    } finally {
      isLoading.value = false;
    }
  }

  function syncFieldsFromPlots(plots: ApiPlotProfile[]): void {
    fields.value = plots.map(toTenantFieldProfile);

    if (!fields.value.some((field) => field.id === activeFieldId.value)) {
      activeFieldId.value = fields.value[0]?.id ?? "";
    }
  }

  function setActiveField(fieldId: string): void {
    if (fields.value.some((field) => field.id === fieldId)) {
      activeFieldId.value = fieldId;
    }
  }

  function setActiveTenant(input: Partial<typeof activeTenant.value>): void {
    activeTenant.value = {
      ...activeTenant.value,
      ...input
    };
  }

  return {
    activeBmkgAdm4Code,
    activeField,
    activeFieldId,
    activeFieldLabel,
    activeTenant,
    errorMessage,
    fetchFields,
    fields,
    isLoading,
    setActiveField,
    setActiveTenant,
    syncFieldsFromPlots
  };
});

function toTenantFieldProfile(plot: ApiPlotProfile): TenantFieldProfile {
  return {
    areaHectares: plot.areaHectares,
    areaLabel: plot.areaLabel,
    bmkgAdm4Code: plot.bmkgAdm4Code ?? "",
    cropId: plot.cropId,
    cropLabel: plot.cropName ?? "Crop belum dipilih",
    id: plot.id,
    name: plot.name,
    polygonGeojson: plot.polygonGeojson,
    regionLabel: plot.bmkgAdm4Code ? `ADM4 ${plot.bmkgAdm4Code}` : "BMKG belum diatur"
  };
}

function normalizeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? "Sesi login berakhir. Silakan login ulang." : error.message;
  }

  if (error instanceof TypeError) {
    return "API backend belum dapat dihubungi. Pastikan Fastify lokal sedang berjalan.";
  }

  return fallback;
}
