<template>
  <div class="space-y-5">
    <section class="panel-surface p-5">
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
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

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock class="h-4 w-4 text-amber-200" />
            Interval
          </span>
          <select
            v-model="filters.intervalMinutes"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          >
            <option v-for="option in samplingOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <div class="flex gap-3">
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-field-mint/30 bg-field-mint/10 px-4 text-sm font-semibold text-field-mint hover:bg-field-mint/15 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isLoading"
            @click="refreshReportData"
          >
            <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
            Refresh
          </button>
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-4 text-sm font-semibold text-[#102016] hover:bg-field-mint"
            type="button"
            @click="exportReport('CSV')"
          >
            <Download class="h-4 w-4" />
            CSV
          </button>
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-field-mint/30 bg-field-mint/10 px-4 text-sm font-semibold text-field-mint hover:bg-field-mint/15"
            type="button"
            @click="exportReport('PDF')"
          >
            <FileDown class="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div v-if="exportMessage" class="mt-4 rounded-lg border border-field-mint/25 bg-field-mint/10 p-4 text-sm text-field-mint">
        {{ exportMessage }}
      </div>
      <div v-if="errorMessage" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {{ errorMessage }}
      </div>
    </section>

    <section class="panel-surface overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 class="text-base font-semibold tracking-normal text-white">Data Logs</h2>
          <p class="mt-1 text-sm text-slate-400">{{ reportPreviewLabel }}</p>
        </div>
        <FileText class="h-6 w-6 text-field-mint" />
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[1680px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead class="bg-white/5 text-xs text-slate-400">
            <tr>
              <th rowspan="3" class="border-b border-r border-white/10 px-5 py-4 align-middle font-semibold uppercase tracking-wide">Timestamp</th>
              <th rowspan="3" class="border-b border-r border-white/10 px-5 py-4 align-middle font-semibold uppercase tracking-wide">Device</th>
              <th rowspan="3" class="border-b border-r border-white/10 px-5 py-4 align-middle font-semibold uppercase tracking-wide">Plot/Area</th>
              <th :colspan="metricColumns.length * 2" class="border-b border-white/10 px-5 py-3 text-center font-semibold uppercase tracking-wide">Metric</th>
            </tr>
            <tr>
              <th
                v-for="metric in metricColumns"
                :key="`${metric.key}-group`"
                colspan="2"
                class="border-b border-r border-white/10 px-4 py-3 text-center font-semibold tracking-normal text-slate-300"
              >
                {{ metricHeaderLabel(metric) }}
              </th>
            </tr>
            <tr>
              <template v-for="metric in metricColumns" :key="metric.key">
                <th class="border-b border-r border-white/10 px-4 py-3 text-center font-semibold uppercase tracking-wide">Value</th>
                <th class="border-b border-r border-white/10 px-4 py-3 text-center font-semibold uppercase tracking-wide">Status</th>
              </template>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="row in paginatedRows" :key="row.id" class="hover:bg-white/[0.03]">
              <td class="border-r border-white/10 px-5 py-4 text-slate-300">{{ formatDateTime(row.timestamp) }}</td>
              <td class="border-r border-white/10 px-5 py-4 font-semibold text-white">{{ row.deviceId }}</td>
              <td class="border-r border-white/10 px-5 py-4 text-slate-300">{{ row.plot }}</td>
              <template v-for="metric in metricColumns" :key="`${row.id}-${metric.key}`">
                <td class="border-r border-white/10 px-4 py-4 text-center text-field-mint">{{ row.metrics[metric.key].value }}</td>
                <td class="border-r border-white/10 px-4 py-4 text-center">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="metricStatusClass(row.metrics[metric.key].status)">
                    {{ formatMetricStatus(row.metrics[metric.key].status) }}
                  </span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Memuat data report...
      </div>

      <div v-else-if="sampledRows.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Tidak ada data pada filter ini.
      </div>

      <div v-else class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4 text-sm text-slate-300">
        <p>
          Menampilkan {{ paginationStart }}-{{ paginationEnd }} dari {{ sampledRows.length.toLocaleString("id-ID") }} records
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-2 text-xs text-slate-400">
            Rows
            <select
              v-model.number="pageSize"
              class="h-9 rounded-lg border border-white/10 bg-[#0b1626] px-2 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
            >
              <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <button
            class="icon-button h-9 w-9"
            type="button"
            aria-label="Halaman sebelumnya"
            :disabled="activePage <= 1"
            @click="setPage(activePage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span class="min-w-24 text-center text-xs text-slate-400">Hal {{ activePage }} / {{ totalPages }}</span>
          <button
            class="icon-button h-9 w-9"
            type="button"
            aria-label="Halaman berikutnya"
            :disabled="activePage >= totalPages"
            @click="setPage(activePage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Download, FileDown, FileText, Filter, RefreshCw, TableProperties } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ApiClientError, apiGet } from "../../services/apiClient";

type ExportFormat = "CSV" | "PDF";
type Dataset = "telemetry" | "alerts" | "weather";
type SamplingInterval = "raw" | "5" | "15" | "60";
type TelemetryPayload = Record<string, unknown>;

interface ReportDevice {
  id: string;
  label: string;
}

type ReportMetricKey = "conductivity" | "moisture" | "nitrogen" | "phosphorus" | "potassium" | "ph" | "soil_temperature";
type ReportMetricStatus = "normal" | "attention" | "empty";

interface ReportMetricColumn {
  key: ReportMetricKey;
  label: string;
  sourceKeys: string[];
  unitLabel: string;
}

interface ReportMetricCell {
  status: ReportMetricStatus;
  value: string;
}

type ReportMetricCells = Record<ReportMetricKey, ReportMetricCell>;

interface ReportRow {
  dataset: Dataset;
  deviceId: string;
  id: string;
  metrics: ReportMetricCells;
  plot: string;
  timestamp: string;
}

interface ApiDevice {
  deviceUid: string;
  displayName: string;
  id: string;
  plotName: string | null;
}

interface TelemetryHistoryResponse {
  count: number;
  items: TelemetryHistoryItem[];
  limit?: number;
  metricKey: string | null;
  offset?: number;
}

interface TelemetryHistoryItem {
  deviceUid: string;
  id: string;
  metricKeys: string[];
  payload: TelemetryPayload;
  receivedAt: string;
  topic: string;
}

const today = new Date();
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(today.getDate() - 3);
const telemetryHistoryPageSize = 1000;
const telemetryHistoryMaxRows = 100_000;

const metricColumns: ReportMetricColumn[] = [
  {
    key: "conductivity",
    label: "Conductivity",
    sourceKeys: ["conductivity", "ec", "electrical_conductivity"],
    unitLabel: "µS/cm"
  },
  {
    key: "moisture",
    label: "Moisture",
    sourceKeys: ["moisture", "soil_moisture"],
    unitLabel: "%"
  },
  {
    key: "nitrogen",
    label: "Nitrogen",
    sourceKeys: ["nitrogen", "n"],
    unitLabel: "mg/kg"
  },
  {
    key: "phosphorus",
    label: "Phosphorus",
    sourceKeys: ["phosphorus", "p"],
    unitLabel: "mg/kg"
  },
  {
    key: "potassium",
    label: "Potassium",
    sourceKeys: ["potassium", "k"],
    unitLabel: "mg/kg"
  },
  {
    key: "ph",
    label: "pH",
    sourceKeys: ["ph", "pH"],
    unitLabel: "pH"
  },
  {
    key: "soil_temperature",
    label: "Soil Temperature",
    sourceKeys: ["soil_temperature", "soilTemperature", "soilTemperatureC", "temperature"],
    unitLabel: "°C"
  }
];

const filters = reactive<{
  startDate: string;
  endDate: string;
  deviceId: string;
  dataset: Dataset;
  intervalMinutes: SamplingInterval;
}>({
  startDate: toInputDate(threeDaysAgo),
  endDate: toInputDate(today),
  deviceId: "all",
  dataset: "telemetry",
  intervalMinutes: "raw"
});

const exportMessage = ref("");
const errorMessage = ref<string | null>(null);
const isLoading = ref(false);
const apiDevices = ref<ApiDevice[]>([]);
const historyItems = ref<TelemetryHistoryItem[]>([]);
const rows = ref<ReportRow[]>([]);
const currentPage = ref(1);
const pageSize = ref(25);
const pageSizeOptions = [10, 25, 50];
let refreshTimer: number | undefined;
const samplingOptions: Array<{ label: string; value: SamplingInterval }> = [
  { label: "Semua data", value: "raw" },
  { label: "Per 5 menit", value: "5" },
  { label: "Per 15 menit", value: "15" },
  { label: "Per jam", value: "60" }
];

const deviceLookup = computed(() => new Map(apiDevices.value.flatMap((device) => [
  [device.deviceUid, device],
  [device.id, device]
])));

const devices = computed<ReportDevice[]>(() => {
  const options = new Map<string, string>();

  for (const device of apiDevices.value) {
    options.set(device.deviceUid, device.displayName ? `${device.displayName} (${device.deviceUid})` : device.deviceUid);
  }

  for (const item of historyItems.value) {
    if (!options.has(item.deviceUid)) {
      options.set(item.deviceUid, item.deviceUid);
    }
  }

  return Array.from(options.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
});

const groupedRows = computed(() => {
  const grouped = new Map<string, ReportRow>();

  for (const row of rows.value) {
    const groupKey = `${row.id}:${row.timestamp}:${row.deviceId}:${row.plot}`;
    const existing = grouped.get(groupKey);

    grouped.set(groupKey, existing
      ? {
          ...existing,
          metrics: mergeMetricCells(existing.metrics, row.metrics)
        }
      : row);
  }

  return Array.from(grouped.values());
});

const filteredRows = computed(() => {
  const start = Date.parse(`${filters.startDate}T00:00:00`);
  const end = Date.parse(`${filters.endDate}T23:59:59`);

  return groupedRows.value.filter((row) => {
    const timestamp = Date.parse(row.timestamp);
    const matchesDate = Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
    const matchesDevice = filters.deviceId === "all" || row.deviceId === filters.deviceId;
    const matchesDataset = row.dataset === filters.dataset;

    return matchesDate && matchesDevice && matchesDataset;
  });
});

const sampledRows = computed(() => {
  if (filters.intervalMinutes === "raw") {
    return [...filteredRows.value].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  }

  const intervalMs = Number(filters.intervalMinutes) * 60_000;
  const sampledByBucket = new Map<string, ReportRow>();

  for (const row of filteredRows.value) {
    const timestamp = Date.parse(row.timestamp);

    if (!Number.isFinite(timestamp)) {
      sampledByBucket.set(row.id, row);
      continue;
    }

    const bucket = Math.floor(timestamp / intervalMs);
    const bucketKey = `${row.dataset}:${row.deviceId}:${row.plot}:${bucket}`;
    const existing = sampledByBucket.get(bucketKey);

    if (!existing || timestamp >= Date.parse(existing.timestamp)) {
      sampledByBucket.set(bucketKey, row);
    }
  }

  return Array.from(sampledByBucket.values()).sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
});

const totalPages = computed(() => Math.max(1, Math.ceil(sampledRows.value.length / pageSize.value)));
const activePage = computed(() => Math.min(currentPage.value, totalPages.value));
const paginatedRows = computed(() => {
  const startIndex = (activePage.value - 1) * pageSize.value;
  return sampledRows.value.slice(startIndex, startIndex + pageSize.value);
});
const paginationStart = computed(() => sampledRows.value.length === 0 ? 0 : (activePage.value - 1) * pageSize.value + 1);
const paginationEnd = computed(() => Math.min(activePage.value * pageSize.value, sampledRows.value.length));
const selectedSamplingLabel = computed(() => samplingOptions.find((option) => option.value === filters.intervalMinutes)?.label ?? "Semua data");
const reportPreviewLabel = computed(() => `Preview data export tenant, ${selectedSamplingLabel.value.toLowerCase()}.`);

onMounted(() => {
  void loadReportData();
  refreshTimer = window.setInterval(() => {
    void loadReportData({
      clearExportMessage: false
    });
  }, 30_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
});

watch(() => [filters.startDate, filters.endDate, filters.deviceId, filters.dataset], () => {
  currentPage.value = 1;
  void loadReportData();
});

watch(() => filters.intervalMinutes, () => {
  currentPage.value = 1;
});

watch(pageSize, () => {
  currentPage.value = 1;
});

async function refreshReportData(): Promise<void> {
  currentPage.value = 1;
  await loadReportData();
}

async function loadReportData(options: { clearExportMessage?: boolean } = {}): Promise<void> {
  if (isLoading.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  if (options.clearExportMessage !== false) {
    exportMessage.value = "";
  }

  try {
    const [deviceRows, telemetryItems] = await Promise.all([
      apiGet<ApiDevice[]>("/api/v1/devices"),
      filters.dataset === "telemetry"
        ? fetchTelemetryHistoryItems()
        : Promise.resolve([] satisfies TelemetryHistoryItem[])
    ]);

    apiDevices.value = deviceRows;
    historyItems.value = telemetryItems;
    rows.value = filters.dataset === "telemetry" ? telemetryItems.map(toReportRow) : [];
  } catch (error) {
    errorMessage.value = normalizeError(error);
    rows.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function fetchTelemetryHistoryItems(): Promise<TelemetryHistoryItem[]> {
  const items: TelemetryHistoryItem[] = [];

  for (let offset = 0; offset < telemetryHistoryMaxRows; offset += telemetryHistoryPageSize) {
    const response = await apiGet<TelemetryHistoryResponse>(buildTelemetryHistoryUrl(offset));
    items.push(...response.items);

    if (response.items.length < telemetryHistoryPageSize) {
      break;
    }
  }

  if (items.length >= telemetryHistoryMaxRows) {
    exportMessage.value = `Report dibatasi ${telemetryHistoryMaxRows.toLocaleString("id-ID")} records. Persempit rentang tanggal untuk mengambil data yang lebih spesifik.`;
  }

  return items;
}

function buildTelemetryHistoryUrl(offset = 0): string {
  const params = new URLSearchParams({
    end: endOfDayIso(filters.endDate),
    limit: String(telemetryHistoryPageSize),
    offset: String(offset),
    start: startOfDayIso(filters.startDate)
  });

  if (filters.deviceId !== "all") {
    params.set("deviceId", filters.deviceId);
  }

  return `/api/v1/telemetry/history?${params.toString()}`;
}

function toReportRow(item: TelemetryHistoryItem): ReportRow {
  const device = deviceLookup.value.get(item.deviceUid);
  const plot = device?.plotName ?? "-";
  const metrics = createEmptyMetricCells();

  for (const column of metricColumns) {
    const value = readMetricColumnValue(item.payload, column);

    if (value !== undefined && !isRecord(value)) {
      metrics[column.key] = {
        status: classifyMetricStatus(column.key, value),
        value: formatMetricValue(value)
      };
    }
  }

  return {
    dataset: "telemetry",
    deviceId: item.deviceUid,
    id: item.id,
    metrics,
    plot,
    timestamp: item.receivedAt
  };
}

function exportReport(format: ExportFormat): void {
  if (format === "CSV") {
    exportCsv();
    return;
  }

  exportPdf();
}

function exportCsv(): void {
  const rows = [
    ["Timestamp", "Device", "Plot/Area", ...metricColumns.flatMap((metric, index) => [index === 0 ? "Metric" : "", ""])],
    ["", "", "", ...metricColumns.flatMap((metric) => [metricHeaderLabel(metric), ""])],
    ["", "", "", ...metricColumns.flatMap(() => ["Value", "Status"])],
    ...sampledRows.value.map((row) => [
      formatDateTime(row.timestamp),
      row.deviceId,
      row.plot,
      ...metricColumns.flatMap((metric) => [
        row.metrics[metric.key].value,
        formatMetricStatus(row.metrics[metric.key].status)
      ])
    ])
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `pamilo-${filters.dataset}-${filters.startDate}-${filters.endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  exportMessage.value = `CSV export dibuat untuk ${sampledRows.value.length} ${filters.dataset} records (${selectedSamplingLabel.value.toLowerCase()}).`;
}

function exportPdf(): void {
  const reportWindow = window.open("", "_blank", "width=1024,height=720");
  if (!reportWindow) {
    exportMessage.value = "Popup PDF diblokir browser. Izinkan popup lalu coba lagi.";
    return;
  }

  reportWindow.document.write(createPrintableReportHtml());
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  exportMessage.value = `PDF export disiapkan untuk ${sampledRows.value.length} ${filters.dataset} records (${selectedSamplingLabel.value.toLowerCase()}).`;
}

function setPage(page: number): void {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
}

function createEmptyMetricCells(): ReportMetricCells {
  return metricColumns.reduce((cells, column) => {
    cells[column.key] = {
      status: "empty",
      value: "-"
    };

    return cells;
  }, {} as ReportMetricCells);
}

function mergeMetricCells(left: ReportMetricCells, right: ReportMetricCells): ReportMetricCells {
  const merged = createEmptyMetricCells();

  for (const column of metricColumns) {
    merged[column.key] = left[column.key].status === "empty" ? right[column.key] : left[column.key];
  }

  return merged;
}

function readMetricColumnValue(payload: TelemetryPayload, column: ReportMetricColumn): unknown {
  for (const key of column.sourceKeys) {
    const value = readMetricValue(payload, key);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function metricHeaderLabel(metric: ReportMetricColumn): string {
  return `${metric.label} (${metric.unitLabel})`;
}

function metricStatusClass(status: ReportMetricStatus): string {
  if (status === "normal") {
    return "bg-field-mint/10 text-field-mint";
  }

  if (status === "attention") {
    return "bg-amber-300/10 text-amber-100";
  }

  return "bg-white/5 text-slate-500";
}

function formatMetricStatus(status: ReportMetricStatus): string {
  return status === "empty" ? "-" : status;
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
    timeStyle: "medium"
  }).format(date);
}

function startOfDayIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

function endOfDayIso(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function readMetricValue(payload: TelemetryPayload, metricKey: string): unknown {
  const directValue = readNestedValue(payload, metricKey);
  if (directValue !== undefined) {
    return unwrapMetricValue(directValue);
  }

  const metrics = isRecord(payload.metrics) ? payload.metrics : null;
  if (!metrics) {
    return undefined;
  }

  return unwrapMetricValue(readNestedValue(metrics, metricKey.replace(/^metrics\./, "")));
}

function readNestedValue(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, payload);
}

function unwrapMetricValue(value: unknown): unknown {
  return isRecord(value) && "value" in value ? value.value : value;
}

function formatMetricValue(value: unknown): string {
  if (value === null) {
    return "-";
  }

  const normalizedValue = typeof value === "number"
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100)
    : String(value);

  return normalizedValue;
}

function classifyMetricStatus(metricKey: ReportMetricKey, value: unknown): Exclude<ReportMetricStatus, "empty"> {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return "normal";
  }

  if (metricKey === "ph") {
    return numericValue < 5.5 || numericValue > 7.5 ? "attention" : "normal";
  }

  if (metricKey === "moisture") {
    return numericValue < 25 || numericValue > 85 ? "attention" : "normal";
  }

  if (metricKey === "soil_temperature") {
    return numericValue < 15 || numericValue > 42 ? "attention" : "normal";
  }

  if (metricKey === "phosphorus") {
    return numericValue > 350 ? "attention" : "normal";
  }

  return "normal";
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function createPrintableReportHtml(): string {
  const metricGroupHeaders = metricColumns.map((metric) => `<th colspan="2">${escapeHtml(metricHeaderLabel(metric))}</th>`).join("");
  const metricSubHeaders = metricColumns.map(() => "<th>Value</th><th>Status</th>").join("");
  const rows = sampledRows.value.map((row) => `
    <tr>
      <td>${escapeHtml(formatDateTime(row.timestamp))}</td>
      <td>${escapeHtml(row.deviceId)}</td>
      <td>${escapeHtml(row.plot)}</td>
      ${metricColumns.map((metric) => `
        <td>${escapeHtml(row.metrics[metric.key].value)}</td>
        <td>${escapeHtml(formatMetricStatus(row.metrics[metric.key].status))}</td>
      `).join("")}
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>PAMILO ${filters.dataset} report</title>
        <style>
          @page { size: landscape; }
          body { color: #0f172a; font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          p { color: #475569; margin: 0 0 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; font-size: 10px; padding: 6px; text-align: left; }
          .center { text-align: center; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>PAMILO ${escapeHtml(filters.dataset)} report</h1>
        <p>${escapeHtml(filters.startDate)} sampai ${escapeHtml(filters.endDate)} - ${sampledRows.value.length} records - ${escapeHtml(selectedSamplingLabel.value)}</p>
        <table>
          <thead>
            <tr>
              <th rowspan="3">Timestamp</th>
              <th rowspan="3">Device</th>
              <th rowspan="3">Plot/Area</th>
              <th class="center" colspan="${metricColumns.length * 2}">Metric</th>
            </tr>
            <tr>
              ${metricGroupHeaders}
            </tr>
            <tr>
              ${metricSubHeaders}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? "Sesi login berakhir. Silakan login ulang." : error.message;
  }

  if (error instanceof TypeError) {
    return "API report belum dapat dihubungi.";
  }

  return "Gagal mengambil data report.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>
