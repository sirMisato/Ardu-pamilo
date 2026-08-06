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
            <p class="text-sm font-medium text-slate-400">Area Aktif</p>
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
              placeholder="Cari device ID, area, atau profile"
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
    </section>

    <section class="panel-surface overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-[860px] w-full text-left text-sm">
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
                    <p class="truncate font-semibold text-white">{{ device.id }}</p>
                    <p class="truncate text-xs text-slate-400">{{ device.telemetryTopic }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" :class="statusBadgeClass(device.status)">
                  <component :is="device.status === 'online' ? Wifi : WifiOff" class="h-3.5 w-3.5" />
                  {{ statusLabel(device.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-slate-300">{{ device.assignedPlot }}</td>
              <td class="px-5 py-4 text-slate-300">{{ device.sensorProfile }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 text-slate-300">
                  <Clock3 class="h-4 w-4 text-slate-500" />
                  {{ formatDateTime(device.lastSeen) }}
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <BatteryMedium class="h-4 w-4 text-field-green" />
                  <div class="h-2 w-24 rounded-full bg-white/10">
                    <div class="h-full rounded-full bg-field-green" :style="{ width: `${device.batteryPercent}%` }"></div>
                  </div>
                  <span class="text-xs text-slate-400">{{ device.batteryPercent }}%</span>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="icon-button" type="button" :aria-label="`Hapus ${device.id}`" @click="removeDevice(device.id)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredDevices.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Tidak ada perangkat sesuai filter.
      </div>
    </section>

    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-lg border border-field-mint/20 bg-[#101f32] p-5 shadow-field" @submit.prevent="submitDevice">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Tambah Perangkat</h2>
            <p class="mt-1 text-sm text-slate-400">Registrasi node ESP32 baru.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeAddModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Device ID</span>
            <input
              v-model.trim="deviceForm.id"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="SensorNode04"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Assigned Plot/Area</span>
            <input
              v-model.trim="deviceForm.assignedPlot"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="Kebun Utara / Blok C"
              required
              type="text"
            />
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
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Telemetry Topic</span>
            <input
              v-model.trim="deviceForm.telemetryTopic"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="pamilo/v1/tenants/mock-tenant/devices/SensorNode04/telemetry"
              required
              type="text"
            />
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeAddModal">
            Batal
          </button>
          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint" type="submit">
            <Save class="h-4 w-4" />
            Simpan
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
  Trash2,
  Wifi,
  WifiOff,
  X
} from "@lucide/vue";
import { computed, reactive, ref } from "vue";

type DeviceStatus = "online" | "offline";
type StatusFilter = "all" | DeviceStatus;

interface SensorDevice {
  id: string;
  status: DeviceStatus;
  assignedPlot: string;
  lastSeen: string;
  firmware: string;
  batteryPercent: number;
  telemetryTopic: string;
  sensorProfile: string;
}

const devices = ref<SensorDevice[]>([
  {
    id: "SensorNode01",
    status: "online",
    assignedPlot: "Kebun Utara / Blok A",
    lastSeen: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    firmware: "esp32-pamilo-1.4.2",
    batteryPercent: 92,
    telemetryTopic: "pamilo/v1/tenants/mock-tenant/devices/SensorNode01/telemetry",
    sensorProfile: "Soil NPK + pH"
  },
  {
    id: "SensorNode02",
    status: "online",
    assignedPlot: "Kebun Utara / Blok B",
    lastSeen: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    firmware: "esp32-pamilo-1.4.1",
    batteryPercent: 76,
    telemetryTopic: "pamilo/v1/tenants/mock-tenant/devices/SensorNode02/telemetry",
    sensorProfile: "Moisture + Temperature"
  },
  {
    id: "WeatherHub01",
    status: "offline",
    assignedPlot: "Plot Pembibitan",
    lastSeen: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    firmware: "weather-hub-0.9.8",
    batteryPercent: 34,
    telemetryTopic: "pamilo/v1/tenants/mock-tenant/devices/WeatherHub01/telemetry",
    sensorProfile: "Weather Station"
  }
]);

const searchQuery = ref("");
const statusFilter = ref<StatusFilter>("all");
const isAddModalOpen = ref(false);
const deviceForm = reactive<{
  id: string;
  status: DeviceStatus;
  assignedPlot: string;
  telemetryTopic: string;
  sensorProfile: string;
}>({
  id: "",
  status: "online",
  assignedPlot: "",
  telemetryTopic: "",
  sensorProfile: "Soil NPK + pH"
});

const filteredDevices = computed(() => {
  const query = searchQuery.value.toLowerCase();

  return devices.value.filter((device) => {
    const matchesStatus = statusFilter.value === "all" || device.status === statusFilter.value;
    const matchesQuery = !query
      || device.id.toLowerCase().includes(query)
      || device.assignedPlot.toLowerCase().includes(query)
      || device.sensorProfile.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });
});

const onlineDeviceCount = computed(() => devices.value.filter((device) => device.status === "online").length);
const activePlotCount = computed(() => new Set(devices.value.map((device) => device.assignedPlot)).size);

function openAddModal(): void {
  deviceForm.id = "";
  deviceForm.status = "online";
  deviceForm.assignedPlot = "";
  deviceForm.sensorProfile = "Soil NPK + pH";
  deviceForm.telemetryTopic = "pamilo/v1/tenants/mock-tenant/devices/SensorNode04/telemetry";
  isAddModalOpen.value = true;
}

function closeAddModal(): void {
  isAddModalOpen.value = false;
}

function submitDevice(): void {
  devices.value = [
    {
      id: deviceForm.id,
      status: deviceForm.status,
      assignedPlot: deviceForm.assignedPlot,
      lastSeen: new Date().toISOString(),
      firmware: "pending-provision",
      batteryPercent: deviceForm.status === "online" ? 100 : 0,
      telemetryTopic: deviceForm.telemetryTopic,
      sensorProfile: deviceForm.sensorProfile
    },
    ...devices.value
  ];
  closeAddModal();
}

function removeDevice(deviceId: string): void {
  devices.value = devices.value.filter((device) => device.id !== deviceId);
}

function statusLabel(status: DeviceStatus): string {
  return status === "online" ? "Online" : "Offline";
}

function statusBadgeClass(status: DeviceStatus): string {
  return status === "online"
    ? "bg-field-mint/10 text-field-mint"
    : "bg-rose-300/10 text-rose-200";
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
