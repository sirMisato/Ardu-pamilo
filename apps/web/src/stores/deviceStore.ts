import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { t } from "../i18n";
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
  plotId?: string | null;
  status?: DeviceStatus;
  telemetryTopic: string;
}

type DeviceErrorState =
  | { key: string; params?: Record<string, string | number> }
  | { message: string };

export const useDeviceStore = defineStore("devices", () => {
  const devices = ref<ApiDevice[]>([]);
  const errorState = ref<DeviceErrorState | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const onlineDeviceCount = computed(() => devices.value.filter((device) => device.status === "online").length);
  const activePlotCount = computed(() => new Set(devices.value.map((device) => device.plotId).filter(Boolean)).size);
  const errorMessage = computed(() => {
    if (!errorState.value) {
      return null;
    }

    return "key" in errorState.value ? t(errorState.value.key, errorState.value.params) : errorState.value.message;
  });

  async function fetchDevices(): Promise<void> {
    isLoading.value = true;
    errorState.value = null;

    try {
      devices.value = await apiGet<ApiDevice[]>("/api/v1/devices");
    } catch (error) {
      errorState.value = normalizeApiError(error, "devices.errors.loadFailed");
      devices.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createDevice(input: CreateDeviceInput): Promise<ApiDevice | null> {
    isSaving.value = true;
    errorState.value = null;

    try {
      const created = await apiPost<ApiDevice>("/api/v1/devices", input);
      devices.value = [created, ...devices.value.filter((device) => device.id !== created.id)];
      return created;
    } catch (error) {
      errorState.value = normalizeApiError(error, "devices.errors.createFailed");
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteDevice(deviceId: string): Promise<boolean> {
    errorState.value = null;

    try {
      await apiDelete<void>(`/api/v1/devices/${encodeURIComponent(deviceId)}`);
      devices.value = devices.value.filter((device) => device.id !== deviceId);
      return true;
    } catch (error) {
      errorState.value = normalizeApiError(error, "devices.errors.deleteFailed");
      return false;
    }
  }

  function clearError(): void {
    errorState.value = null;
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

function normalizeApiError(error: unknown, fallbackKey: string): DeviceErrorState {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? { key: "devices.errors.sessionExpired" } : { message: error.message };
  }

  if (error instanceof TypeError) {
    return { key: "devices.errors.apiUnavailable" };
  }

  return { key: fallbackKey };
}
