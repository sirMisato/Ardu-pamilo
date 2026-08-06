import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiClientError, apiGet, apiPost, apiPut } from "../services/apiClient";

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
  plantingPeriodDays?: number | null;
  status?: CropStatus;
  thresholdSource?: string | null;
  thresholds?: Partial<Record<ThresholdKey, Partial<ThresholdRange>>>;
  varieties?: string[];
}

export const thresholdMetrics: Array<{ key: ThresholdKey; label: string; unit: string }> = [
  { key: "ph", label: "pH", unit: "range" },
  { key: "moisture", label: "Moisture", unit: "%" },
  { key: "nitrogen", label: "Nitrogen", unit: "ppm" },
  { key: "phosphorus", label: "Phosphorus", unit: "ppm" },
  { key: "potassium", label: "Potassium", unit: "ppm" }
];

export const useMasterDataStore = defineStore("masterData", () => {
  const crops = ref<ApiCrop[]>([]);
  const errorMessage = ref<string | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const activeCropCount = computed(() => crops.value.filter((crop) => crop.status === "active").length);

  async function fetchCrops(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      crops.value = await apiGet<ApiCrop[]>("/api/v1/crops");
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil master crop.");
      crops.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createCrop(input: CropPayload): Promise<ApiCrop | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const created = await apiPost<ApiCrop>("/api/v1/crops", input);
      crops.value = [...crops.value, created].sort((left, right) => left.name.localeCompare(right.name));
      return created;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal menambahkan crop.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateCrop(cropId: string, input: Partial<CropPayload>): Promise<ApiCrop | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const updated = await apiPut<ApiCrop>(`/api/v1/crops/${encodeURIComponent(cropId)}`, input);
      crops.value = crops.value.map((crop) => crop.id === updated.id ? updated : crop);
      return updated;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal memperbarui crop.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  function clearError(): void {
    errorMessage.value = null;
  }

  return {
    activeCropCount,
    clearError,
    createCrop,
    crops,
    errorMessage,
    fetchCrops,
    isLoading,
    isSaving,
    updateCrop
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
