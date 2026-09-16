import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { t } from "../i18n";
import { ApiClientError, apiDelete, apiGet, apiPost, apiPut } from "../services/apiClient";

export type CropStatus = "active" | "draft" | "archived";
export type ThresholdKey = "ph" | "moisture" | "nitrogen" | "phosphorus" | "potassium";

export interface ThresholdRange {
  max: number | null;
  min: number | null;
  unit: string;
}

export interface ApiCrop {
  createdAt: string;
  description: string | null;
  id: string;
  latinName: string | null;
  name: string;
  plantingDate: string | null;
  plantingPeriodDays: number | null;
  status: CropStatus;
  thresholdSource: string | null;
  thresholds: Record<ThresholdKey, ThresholdRange>;
  updatedAt: string;
  varieties: string[];
}

export interface CropPayload {
  description?: string | null;
  latinName?: string | null;
  name: string;
  plantingDate?: string | null;
  plantingPeriodDays?: number | null;
  status?: CropStatus;
  thresholdSource?: string | null;
  thresholds?: Partial<Record<ThresholdKey, Partial<ThresholdRange>>>;
  varieties?: string[];
}

export interface ApiPlot {
  areaHectares: number | null;
  areaLabel: string;
  bmkgAdm4Code: string | null;
  createdAt: string;
  cropId: string | null;
  cropName: string | null;
  cropPlantingDate: string | null;
  cropPlantingPeriodDays: number | null;
  id: string;
  name: string;
  polygonGeojson: unknown;
  regionLabel: string;
  updatedAt: string;
}

export interface PlotPayload {
  areaHectares?: number | null;
  bmkgAdm4Code?: string | null;
  cropId?: string | null;
  name: string;
  polygonGeojson?: unknown;
}

type MasterDataErrorState =
  | { key: string; params?: Record<string, string | number> }
  | { message: string };

export const thresholdMetrics: Array<{ key: ThresholdKey; label: string; unit: string }> = [
  { key: "ph", label: "pH", unit: "range" },
  { key: "moisture", label: "Moisture", unit: "%" },
  { key: "nitrogen", label: "Nitrogen", unit: "mg/Kg" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg/Kg" },
  { key: "potassium", label: "Potassium", unit: "mg/Kg" }
];

export const useMasterDataStore = defineStore("masterData", () => {
  const crops = ref<ApiCrop[]>([]);
  const plots = ref<ApiPlot[]>([]);
  const errorState = ref<MasterDataErrorState | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const activeCropCount = computed(() => crops.value.filter((crop) => crop.status === "active").length);
  const errorMessage = computed(() => {
    if (!errorState.value) {
      return null;
    }

    return "key" in errorState.value ? t(errorState.value.key, errorState.value.params) : errorState.value.message;
  });

  async function fetchCrops(): Promise<void> {
    isLoading.value = true;
    errorState.value = null;

    try {
      crops.value = await apiGet<ApiCrop[]>("/api/v1/crops");
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.loadCropsFailed");
      crops.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPlots(): Promise<void> {
    isLoading.value = true;
    errorState.value = null;

    try {
      plots.value = await apiGet<ApiPlot[]>("/api/v1/plots");
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.loadAreasFailed");
      plots.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createCrop(input: CropPayload): Promise<ApiCrop | null> {
    isSaving.value = true;
    errorState.value = null;

    try {
      const created = await apiPost<ApiCrop>("/api/v1/crops", input);
      crops.value = [...crops.value, created].sort((left, right) => left.name.localeCompare(right.name));
      return created;
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.createCropFailed");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function createPlot(input: PlotPayload): Promise<ApiPlot | null> {
    isSaving.value = true;
    errorState.value = null;

    try {
      const created = await apiPost<ApiPlot>("/api/v1/plots", input);
      plots.value = [created, ...plots.value.filter((plot) => plot.id !== created.id)];
      return created;
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.createAreaFailed");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateCrop(cropId: string, input: Partial<CropPayload>): Promise<ApiCrop | null> {
    isSaving.value = true;
    errorState.value = null;

    try {
      const updated = await apiPut<ApiCrop>(`/api/v1/crops/${encodeURIComponent(cropId)}`, input);
      crops.value = sortCrops(crops.value.map((crop) => crop.id === updated.id ? updated : crop));
      return updated;
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.updateCropFailed");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function updatePlot(plotId: string, input: Partial<PlotPayload>): Promise<ApiPlot | null> {
    isSaving.value = true;
    errorState.value = null;

    try {
      const updated = await apiPut<ApiPlot>(`/api/v1/plots/${encodeURIComponent(plotId)}`, input);
      plots.value = plots.value.map((plot) => plot.id === updated.id ? updated : plot);
      return updated;
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.updateAreaFailed");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteCrop(cropId: string): Promise<boolean> {
    errorState.value = null;

    try {
      await apiDelete<void>(`/api/v1/crops/${encodeURIComponent(cropId)}`);
      crops.value = crops.value.filter((crop) => crop.id !== cropId);
      plots.value = plots.value.map((plot) => plot.cropId === cropId
        ? {
            ...plot,
            cropId: null,
            cropName: null,
            cropPlantingDate: null,
            cropPlantingPeriodDays: null
          }
        : plot);
      return true;
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.deleteCropFailed");
      return false;
    }
  }

  async function deletePlot(plotId: string): Promise<boolean> {
    errorState.value = null;

    try {
      await apiDelete<void>(`/api/v1/plots/${encodeURIComponent(plotId)}`);
      plots.value = plots.value.filter((plot) => plot.id !== plotId);
      return true;
    } catch (error) {
      errorState.value = normalizeApiError(error, "masterData.errors.deleteAreaFailed");
      return false;
    }
  }

  function clearError(): void {
    errorState.value = null;
  }

  return {
    activeCropCount,
    clearError,
    createCrop,
    createPlot,
    crops,
    deleteCrop,
    deletePlot,
    errorMessage,
    fetchCrops,
    fetchPlots,
    isLoading,
    isSaving,
    plots,
    updatePlot,
    updateCrop
  };
});

function sortCrops(items: ApiCrop[]): ApiCrop[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeApiError(error: unknown, fallbackKey: string): MasterDataErrorState {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? { key: "masterData.errors.sessionExpired" } : { message: error.message };
  }

  if (error instanceof TypeError) {
    return { key: "masterData.errors.apiUnavailable" };
  }

  return { key: fallbackKey };
}
