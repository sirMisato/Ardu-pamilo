<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Total Perangkat</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ devices.length }}</p>
          </div>
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 p-2.5 text-teal-600">
            <Cpu class="h-6 w-6" />
          </span>
        </div>
      </article>

      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Online</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ onlineDeviceCount }}</p>
          </div>
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 p-2.5 text-teal-600">
            <Wifi class="h-6 w-6" />
          </span>
        </div>
      </article>

      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Plot Aktif</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ activePlotCount }}</p>
          </div>
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 p-2.5 text-teal-600">
            <MapPin class="h-6 w-6" />
          </span>
        </div>
      </article>
    </section>

    <section class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative w-full max-w-md">
            <Search class="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model.trim="searchQuery"
              class="min-h-11 w-full rounded-full border border-white/80 bg-white/50 py-2.5 pl-12 pr-5 text-sm text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400"
              placeholder="Cari device ID, plot, atau profile"
              type="search"
            />
          </label>

          <select
            v-model="statusFilter"
            class="min-h-11 rounded-full border border-white/80 bg-white/50 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">Semua Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <button
          class="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/80"
          type="button"
          @click="openAddModal"
        >
          <Plus class="h-4 w-4" />
          Tambah Perangkat
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-medium text-amber-700">
        {{ errorMessage }}
      </div>
    </section>

    <section class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6">
      <div class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[900px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Device ID</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Status</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Assigned Plot/Area</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Sensor Profile</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Last Seen</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Battery</th>
              <th class="border-b border-white/60 px-5 py-4 text-right font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in filteredDevices" :key="device.id" class="border-b border-white/60 transition-colors hover:bg-white/40">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <Cpu class="h-5 w-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-700">{{ device.deviceUid }}</p>
                    <p class="truncate text-xs font-medium text-slate-400">{{ device.telemetryTopic }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-semibold"
                  :class="statusBadgeClass(device.status)"
                >
                  <component :is="statusIcon(device.status)" class="h-3.5 w-3.5" />
                  {{ statusLabel(device.status) }}
                </span>
              </td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ device.plotName ?? device.plotId }}</td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ sensorProfile(device.metadata) }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 font-medium text-slate-700">
                  <Clock3 class="h-4 w-4 text-slate-400" />
                  {{ device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "-" }}
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <BatteryMedium class="h-4 w-4 text-teal-600" />
                  <div class="h-2 w-24 rounded-full bg-slate-200/70">
                    <div class="h-full rounded-full bg-emerald-300" :style="{ width: `${batteryPercent(device.metadata)}%` }"></div>
                  </div>
                  <span class="text-xs font-medium text-slate-400">{{ batteryPercent(device.metadata) }}%</span>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white/80 text-rose-500 shadow-sm transition-all hover:bg-rose-50"
                    type="button"
                    :aria-label="`Hapus ${device.deviceUid}`"
                    @click="removeDevice(device.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading" class="border-t border-white/60 p-6 text-center text-sm font-medium text-slate-400 md:p-8">
        Memuat perangkat dari API.
      </div>

      <div v-else-if="filteredDevices.length === 0" class="border-t border-white/60 p-6 text-center text-sm font-medium text-slate-400 md:p-8">
        Tidak ada perangkat sesuai filter.
      </div>
    </section>

    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl backdrop-blur-xl md:p-6" @submit.prevent="submitDevice">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold tracking-normal text-slate-800">Tambah Perangkat</h2>
            <p class="mt-1 text-sm font-medium text-slate-400">Registrasi node ESP32 baru lewat API tenant.</p>
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100"
            type="button"
            aria-label="Tutup modal"
            @click="closeAddModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Device UID</span>
              <input
                v-model.trim="deviceForm.deviceUid"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                placeholder="SensorNode04"
                required
                type="text"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Display Name</span>
              <input
                v-model.trim="deviceForm.displayName"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                placeholder="Soil Node Blok C"
                required
                type="text"
              />
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Plot ID</span>
            <select
              v-model.trim="deviceForm.plotId"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Field Utama otomatis</option>
              <option v-for="plot in plots" :key="plot.id" :value="plot.id">
                {{ plot.name }} / {{ plot.id }}
              </option>
            </select>
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Sensor Profile</span>
              <select
                v-model="deviceForm.sensorProfile"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              >
                <option>Soil NPK + pH</option>
                <option>Weather Station</option>
                <option>Water Level</option>
                <option>Custom Payload</option>
              </select>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Initial Status</span>
              <select
                v-model="deviceForm.status"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Telemetry Topic</span>
            <input
              v-model.trim="deviceForm.telemetryTopic"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="pamilo/v1/tenants/demo-tenant/devices/SensorNode04/telemetry"
              required
              type="text"
            />
            <p class="text-xs font-medium text-slate-400">Topic otomatis mengikuti Tenant ID dan Device UID.</p>
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100" type="button" @click="closeAddModal">
            Batal
          </button>
          <button
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60"
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
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "maintenance") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
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
