<template>
  <div class="space-y-5">
    <section class="panel-surface p-5">
      <div class="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <CalendarDays class="h-4 w-4 text-field-mint" />
            Start Date
          </span>
          <input
            v-model="filters.startDate"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <CalendarDays class="h-4 w-4 text-field-green" />
            End Date
          </span>
          <input
            v-model="filters.endDate"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Filter class="h-4 w-4 text-sky-200" />
            Device
          </span>
          <select
            v-model="filters.deviceId"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          >
            <option value="all">Semua Device</option>
            <option v-for="device in devices" :key="device.id" :value="device.id">{{ device.label }}</option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <TableProperties class="h-4 w-4 text-violet-200" />
            Dataset
          </span>
          <select
            v-model="filters.dataset"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          >
            <option value="telemetry">Telemetry</option>
            <option value="alerts">Alerts</option>
            <option value="weather">Weather</option>
          </select>
        </label>

        <div class="flex gap-3">
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-4 text-sm font-semibold text-[#102016] hover:bg-field-mint"
            type="button"
            @click="mockExport('CSV')"
          >
            <Download class="h-4 w-4" />
            CSV
          </button>
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-field-mint/30 bg-field-mint/10 px-4 text-sm font-semibold text-field-mint hover:bg-field-mint/15"
            type="button"
            @click="mockExport('PDF')"
          >
            <FileDown class="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div v-if="exportMessage" class="mt-4 rounded-lg border border-field-mint/25 bg-field-mint/10 p-4 text-sm text-field-mint">
        {{ exportMessage }}
      </div>
    </section>

    <section class="panel-surface overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 class="text-base font-semibold tracking-normal text-white">Data Logs</h2>
          <p class="mt-1 text-sm text-slate-400">Preview data export tenant.</p>
        </div>
        <FileText class="h-6 w-6 text-field-mint" />
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[880px] w-full text-left text-sm">
          <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-5 py-4 font-semibold">Timestamp</th>
              <th class="px-5 py-4 font-semibold">Device</th>
              <th class="px-5 py-4 font-semibold">Plot/Area</th>
              <th class="px-5 py-4 font-semibold">Metric</th>
              <th class="px-5 py-4 font-semibold">Value</th>
              <th class="px-5 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-white/[0.03]">
              <td class="px-5 py-4 text-slate-300">{{ formatDateTime(log.timestamp) }}</td>
              <td class="px-5 py-4 font-semibold text-white">{{ log.deviceId }}</td>
              <td class="px-5 py-4 text-slate-300">{{ log.plot }}</td>
              <td class="px-5 py-4 text-slate-300">{{ log.metric }}</td>
              <td class="px-5 py-4 text-field-mint">{{ log.value }}</td>
              <td class="px-5 py-4">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="log.status === 'normal' ? 'bg-field-mint/10 text-field-mint' : 'bg-amber-300/10 text-amber-100'">
                  {{ log.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredLogs.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Tidak ada data pada filter ini.
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, Download, FileDown, FileText, Filter, TableProperties } from "@lucide/vue";
import { computed, reactive, ref } from "vue";

type ExportFormat = "CSV" | "PDF";
type Dataset = "telemetry" | "alerts" | "weather";

interface ReportDevice {
  id: string;
  label: string;
}

interface ReportLog {
  id: string;
  timestamp: string;
  deviceId: string;
  plot: string;
  metric: string;
  value: string;
  dataset: Dataset;
  status: "normal" | "attention";
}

const today = new Date();
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(today.getDate() - 3);

const filters = reactive<{
  startDate: string;
  endDate: string;
  deviceId: string;
  dataset: Dataset;
}>({
  startDate: toInputDate(threeDaysAgo),
  endDate: toInputDate(today),
  deviceId: "all",
  dataset: "telemetry"
});

const exportMessage = ref("");
const devices: ReportDevice[] = [
  { id: "SensorNode01", label: "SensorNode01 / Kebun Utara" },
  { id: "SensorNode02", label: "SensorNode02 / Blok B" },
  { id: "WeatherHub01", label: "WeatherHub01 / Pembibitan" }
];

const logs = ref<ReportLog[]>([
  createLog("SensorNode01", "Kebun Utara / Blok A", "pH", "6.4", "telemetry", 1, "normal"),
  createLog("SensorNode01", "Kebun Utara / Blok A", "Moisture", "64%", "telemetry", 2, "normal"),
  createLog("SensorNode02", "Kebun Utara / Blok B", "Nitrogen", "74 ppm", "telemetry", 4, "normal"),
  createLog("WeatherHub01", "Plot Pembibitan", "Rainfall", "2.2 mm", "weather", 8, "attention"),
  createLog("SensorNode02", "Kebun Utara / Blok B", "Battery", "28%", "alerts", 12, "attention"),
  createLog("SensorNode01", "Kebun Utara / Blok A", "Temperature", "29 C", "telemetry", 18, "normal")
]);

const filteredLogs = computed(() => {
  const start = Date.parse(`${filters.startDate}T00:00:00`);
  const end = Date.parse(`${filters.endDate}T23:59:59`);

  return logs.value.filter((log) => {
    const timestamp = Date.parse(log.timestamp);
    const matchesDate = Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
    const matchesDevice = filters.deviceId === "all" || log.deviceId === filters.deviceId;
    const matchesDataset = log.dataset === filters.dataset;

    return matchesDate && matchesDevice && matchesDataset;
  });
});

function mockExport(format: ExportFormat): void {
  exportMessage.value = `${format} export queued for ${filteredLogs.value.length} ${filters.dataset} records.`;
}

function createLog(
  deviceId: string,
  plot: string,
  metric: string,
  value: string,
  dataset: Dataset,
  hoursAgo: number,
  status: ReportLog["status"]
): ReportLog {
  return {
    id: `${deviceId}-${metric}-${hoursAgo}`,
    timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    deviceId,
    plot,
    metric,
    value,
    dataset,
    status
  };
}

function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
