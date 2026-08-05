import { defineStore } from "pinia";
import {
  deleteDevice,
  getPlotDevices,
  provisionDevice,
  updateDevice,
  type DevicePayload,
  type DeviceProvisioningPayload
} from "../api.js";

export const useDeviceManagementStore = defineStore("deviceManagement", {
  state: () => ({
    devices: [] as DevicePayload[],
    provisioningCredential: null as DeviceProvisioningPayload | null,
    busy: false,
    error: null as string | null
  }),
  actions: {
    async loadForPlot(plotId: string): Promise<boolean> {
      this.busy = true;
      this.error = null;

      try {
        const response = await getPlotDevices(plotId);
        if (!response.data) {
          this.devices = [];
          this.error = response.error?.message ?? "Gagal memuat perangkat.";
          return false;
        }

        this.devices = response.data;
        return true;
      } finally {
        this.busy = false;
      }
    },

    async provision(input: {
      plotId: string;
      serialNo: string;
      label: string;
      csrfToken: string;
    }): Promise<boolean> {
      this.busy = true;
      this.error = null;
      this.provisioningCredential = null;

      try {
        const response = await provisionDevice(input);
        if (!response.data) {
          this.error = response.error?.message ?? "Gagal provisioning perangkat.";
          return false;
        }

        this.provisioningCredential = response.data;
        this.devices = upsertDevice(this.devices, response.data);
        return true;
      } finally {
        this.busy = false;
      }
    },

    async update(input: {
      deviceId: string;
      label?: string | null;
      plotId?: string;
      csrfToken: string;
    }): Promise<boolean> {
      this.busy = true;
      this.error = null;

      try {
        const response = await updateDevice(input);
        if (!response.data) {
          this.error = response.error?.message ?? "Gagal memperbarui perangkat.";
          return false;
        }

        this.devices = upsertDevice(this.devices, response.data);
        return true;
      } finally {
        this.busy = false;
      }
    },

    async remove(input: {
      deviceId: string;
      csrfToken: string;
    }): Promise<boolean> {
      this.busy = true;
      this.error = null;

      try {
        const response = await deleteDevice(input);
        if (!response.data) {
          this.error = response.error?.message ?? "Gagal menghapus perangkat.";
          return false;
        }

        this.devices = upsertDevice(this.devices, response.data);
        return true;
      } finally {
        this.busy = false;
      }
    },

    clearCredential(): void {
      this.provisioningCredential = null;
    },

    reset(): void {
      this.devices = [];
      this.provisioningCredential = null;
      this.busy = false;
      this.error = null;
    }
  }
});

function upsertDevice(devices: DevicePayload[], nextDevice: DevicePayload): DevicePayload[] {
  const exists = devices.some((device) => device.id === nextDevice.id);
  if (!exists) {
    return [...devices, nextDevice];
  }

  return devices.map((device) => device.id === nextDevice.id ? nextDevice : device);
}
