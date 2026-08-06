import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiClientError, apiDelete, apiGet, apiPost } from "../services/apiClient";

export type DeviceStatus = "online" | "offline" | "maintenance";

export interface ApiDevice {
  createdAt: string;
  deviceUid: string;
  displayName: string;
  id: string;
  lastSeenAt: string | null;
  metadata: Record<string, unknown>;
  mqttUsername: string | null;
  plotId: string;
  plotName: string | null;
  status: DeviceStatus;
  telemetryTopic: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  deviceUid: string;
  displayName: string;
  metadata?: Record<string, unknown>;
  mqttUsername?: string | null;
  plotId: string;
  status?: DeviceStatus;
  telemetryTopic: string;
}

export const useDeviceStore = defineStore("devices", () => {
  const devices = ref<ApiDevice[]>([]);
  const errorMessage = ref<string | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const onlineDeviceCount = computed(() => devices.value.filter((device) => device.status === "online").length);
  const activePlotCount = computed(() => new Set(devices.value.map((device) => device.plotId)).size);

  async function fetchDevices(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      devices.value = await apiGet<ApiDevice[]>("/api/v1/devices");
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil daftar perangkat.");
      devices.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createDevice(input: CreateDeviceInput): Promise<ApiDevice | null> {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const created = await apiPost<ApiDevice>("/api/v1/devices", input);
      devices.value = [created, ...devices.value.filter((device) => device.id !== created.id)];
      return created;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal menambahkan perangkat.");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteDevice(deviceId: string): Promise<boolean> {
    errorMessage.value = null;

    try {
      await apiDelete<void>(`/api/v1/devices/${encodeURIComponent(deviceId)}`);
      devices.value = devices.value.filter((device) => device.id !== deviceId);
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal menghapus perangkat.");
      return false;
    }
  }

  function clearError(): void {
    errorMessage.value = null;
  }

  return {
    activePlotCount,
    clearError,
    createDevice,
    deleteDevice,
    devices,
    errorMessage,
    fetchDevices,
    isLoading,
    isSaving,
    onlineDeviceCount
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
