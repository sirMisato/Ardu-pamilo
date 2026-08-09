<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-3">
      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Total Perangkat</p>
            <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ devices.length }}</p>
          </div>
          <Cpu class="h-9 w-9 text-field-mint" />
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Online</p>
            <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ onlineDeviceCount }}</p>
          </div>
          <Wifi class="h-9 w-9 text-field-green" />
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Plot Aktif</p>
            <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ activePlotCount }}</p>
          </div>
          <MapPin class="h-9 w-9 text-sky-200" />
        </div>
      </article>
    </section>

    <section class="panel-surface p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row">
          <label class="relative flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              v-model.trim="searchQuery"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="Cari device ID, plot, atau profile"
              type="search"
            />
          </label>

          <select
            v-model="statusFilter"
            class="min-h-11 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none transition focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          >
            <option value="all">Semua Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <button
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-field-green px-5 text-sm font-semibold text-[#102016] transition hover:bg-field-mint focus:outline-none focus:ring-2 focus:ring-field-mint/40"
          type="button"
          @click="openAddModal"
        >
          <Plus class="h-4 w-4" />
          Tambah Perangkat
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {{ errorMessage }}
      </div>
    </section>

    <section class="panel-surface overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-[900px] w-full text-left text-sm">
          <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-5 py-4 font-semibold">Device ID</th>
              <th class="px-5 py-4 font-semibold">Status</th>
              <th class="px-5 py-4 font-semibold">Assigned Plot/Area</th>
              <th class="px-5 py-4 font-semibold">Sensor Profile</th>
              <th class="px-5 py-4 font-semibold">Last Seen</th>
              <th class="px-5 py-4 font-semibold">Battery</th>
              <th class="px-5 py-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="device in filteredDevices" :key="device.id" class="transition hover:bg-white/[0.03]">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-field-mint/10 text-field-mint">
                    <Cpu class="h-5 w-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-white">{{ device.deviceUid }}</p>
                    <p class="truncate text-xs text-slate-400">{{ device.telemetryTopic }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" :class="statusBadgeClass(device.status)">
                  <component :is="statusIcon(device.status)" class="h-3.5 w-3.5" />
                  {{ statusLabel(device.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-slate-300">{{ device.plotName ?? device.plotId }}</td>
              <td class="px-5 py-4 text-slate-300">{{ sensorProfile(device.metadata) }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 text-slate-300">
                  <Clock3 class="h-4 w-4 text-slate-500" />
                  {{ device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "-" }}
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <BatteryMedium class="h-4 w-4 text-field-green" />
                  <div class="h-2 w-24 rounded-full bg-white/10">
                    <div class="h-full rounded-full bg-field-green" :style="{ width: `${batteryPercent(device.metadata)}%` }"></div>
                  </div>
                  <span class="text-xs text-slate-400">{{ batteryPercent(device.metadata) }}%</span>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="icon-button" type="button" :aria-label="`Hapus ${device.deviceUid}`" @click="removeDevice(device.id)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Memuat perangkat dari API.
      </div>

      <div v-else-if="filteredDevices.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Tidak ada perangkat sesuai filter.
      </div>
    </section>

    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-lg border border-field-mint/20 bg-[#101f32] p-5 shadow-field" @submit.prevent="submitDevice">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Tambah Perangkat</h2>
            <p class="mt-1 text-sm text-slate-400">Registrasi node ESP32 baru lewat API tenant.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeAddModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Device UID</span>
              <input
                v-model.trim="deviceForm.deviceUid"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
                placeholder="SensorNode04"
                required
                type="text"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Display Name</span>
              <input
                v-model.trim="deviceForm.displayName"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
                placeholder="Soil Node Blok C"
                required
                type="text"
              />
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Plot ID</span>
            <select
              v-model.trim="deviceForm.plotId"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
            >
              <option value="">Field Utama otomatis</option>
              <option v-for="plot in plots" :key="plot.id" :value="plot.id">
                {{ plot.name }} / {{ plot.id }}
              </option>
            </select>
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Sensor Profile</span>
              <select
                v-model="deviceForm.sensorProfile"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              >
                <option>Soil NPK + pH</option>
                <option>Weather Station</option>
                <option>Water Level</option>
                <option>Custom Payload</option>
              </select>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Initial Status</span>
              <select
                v-model="deviceForm.status"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Telemetry Topic</span>
            <input
              v-model.trim="deviceForm.telemetryTopic"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="pamilo/v1/tenants/demo-tenant/devices/SensorNode04/telemetry"
              required
              type="text"
            />
            <p class="text-xs text-slate-500">Topic otomatis mengikuti Tenant ID dan Device UID.</p>
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeAddModal">
            Batal
          </button>
          <button
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60"
            :disabled="isSaving"
            type="submit"
          >
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BatteryMedium,
  Clock3,
  Cpu,
  MapPin,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Wifi,
  WifiOff,
  X
} from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { apiGet } from "../../services/apiClient";
import { useAuthStore } from "../../stores/authStore";
import { useDeviceStore, type DeviceStatus } from "../../stores/deviceStore";

type StatusFilter = "all" | DeviceStatus;

interface PlotOption {
  id: string;
  name: string;
}

const authStore = useAuthStore();
const deviceStore = useDeviceStore();
const { activePlotCount, devices, errorMessage, isLoading, isSaving, onlineDeviceCount } = storeToRefs(deviceStore);
const searchQuery = ref("");
const statusFilter = ref<StatusFilter>("all");
const isAddModalOpen = ref(false);
const plots = ref<PlotOption[]>([]);
const deviceForm = reactive<{
  deviceUid: string;
  displayName: string;
  plotId: string;
  sensorProfile: string;
  status: DeviceStatus;
  telemetryTopic: string;
}>({
  deviceUid: "",
  displayName: "",
  plotId: "",
  sensorProfile: "Soil NPK + pH",
  status: "offline",
  telemetryTopic: ""
});

const tenantId = computed(() => authStore.tenant?.id ?? "demo-tenant");

const filteredDevices = computed(() => {
  const query = searchQuery.value.toLowerCase();

  return devices.value.filter((device) => {
    const matchesStatus = statusFilter.value === "all" || device.status === statusFilter.value;
    const matchesQuery = !query
      || device.deviceUid.toLowerCase().includes(query)
      || device.displayName.toLowerCase().includes(query)
      || (device.plotName ?? device.plotId).toLowerCase().includes(query)
      || sensorProfile(device.metadata).toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });
});

onMounted(() => {
  void deviceStore.fetchDevices();
  void fetchPlots();
});

watch(() => deviceForm.deviceUid, () => {
  deviceForm.telemetryTopic = buildTelemetryTopic(deviceForm.deviceUid);
});

function openAddModal(): void {
  deviceForm.deviceUid = "";
  deviceForm.displayName = "";
  deviceForm.plotId = plots.value[0]?.id ?? "";
  deviceForm.sensorProfile = "Soil NPK + pH";
  deviceForm.status = "offline";
  deviceForm.telemetryTopic = buildTelemetryTopic("");
  deviceStore.clearError();
  isAddModalOpen.value = true;
}

function closeAddModal(): void {
  isAddModalOpen.value = false;
}

async function submitDevice(): Promise<void> {
  const created = await deviceStore.createDevice({
    deviceUid: deviceForm.deviceUid,
    displayName: deviceForm.displayName,
    metadata: {
      batteryPercent: 100,
      sensorProfile: deviceForm.sensorProfile
    },
    plotId: deviceForm.plotId || null,
    status: deviceForm.status,
    telemetryTopic: deviceForm.telemetryTopic
  });

  if (created) {
    await fetchPlots();
    closeAddModal();
  }
}

async function removeDevice(deviceId: string): Promise<void> {
  await deviceStore.deleteDevice(deviceId);
}

async function fetchPlots(): Promise<void> {
  try {
    plots.value = await apiGet<PlotOption[]>("/api/v1/plots");
  } catch {
    plots.value = [];
  }
}

function buildTelemetryTopic(deviceUid: string): string {
  const normalizedDeviceUid = deviceUid.trim() || "SensorNode04";
  return `pamilo/v1/tenants/${tenantId.value}/devices/${normalizedDeviceUid}/telemetry`;
}

function sensorProfile(metadata: Record<string, unknown>): string {
  return typeof metadata.sensorProfile === "string" ? metadata.sensorProfile : "Custom Payload";
}

function batteryPercent(metadata: Record<string, unknown>): number {
  return typeof metadata.batteryPercent === "number" ? Math.min(100, Math.max(0, metadata.batteryPercent)) : 0;
}

function statusIcon(status: DeviceStatus) {
  if (status === "online") {
    return Wifi;
  }

  if (status === "maintenance") {
    return Settings2;
  }

  return WifiOff;
}

function statusLabel(status: DeviceStatus): string {
  return status === "online" ? "Online" : status === "maintenance" ? "Maintenance" : "Offline";
}

function statusBadgeClass(status: DeviceStatus): string {
  if (status === "online") {
    return "bg-field-mint/10 text-field-mint";
  }

  if (status === "maintenance") {
    return "bg-amber-300/10 text-amber-100";
  }

  return "bg-rose-300/10 text-rose-200";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
</script>
