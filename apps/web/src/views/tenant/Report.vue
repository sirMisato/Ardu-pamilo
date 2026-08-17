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

      <div v-if="isLoading" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Memuat data report...
      </div>

      <div v-else-if="filteredLogs.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Tidak ada data pada filter ini.
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, Download, FileDown, FileText, Filter, TableProperties } from "@lucide/vue";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ApiClientError, apiGet } from "../../services/apiClient";

type ExportFormat = "CSV" | "PDF";
type Dataset = "telemetry" | "alerts" | "weather";
type TelemetryPayload = Record<string, unknown>;

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

interface ApiDevice {
  deviceUid: string;
  displayName: string;
  id: string;
  plotName: string | null;
}

interface TelemetryHistoryResponse {
  count: number;
  items: TelemetryHistoryItem[];
  metricKey: string | null;
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
const errorMessage = ref<string | null>(null);
const isLoading = ref(false);
const apiDevices = ref<ApiDevice[]>([]);
const historyItems = ref<TelemetryHistoryItem[]>([]);
const logs = ref<ReportLog[]>([]);

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

onMounted(() => {
  void loadReportData();
});

watch(filters, () => {
  void loadReportData();
});

async function loadReportData(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;
  exportMessage.value = "";

  try {
    const [deviceRows, history] = await Promise.all([
      apiGet<ApiDevice[]>("/api/v1/devices"),
      filters.dataset === "telemetry"
        ? apiGet<TelemetryHistoryResponse>(buildTelemetryHistoryUrl())
        : Promise.resolve({ count: 0, items: [], metricKey: null } satisfies TelemetryHistoryResponse)
    ]);

    apiDevices.value = deviceRows;
    historyItems.value = history.items;
    logs.value = filters.dataset === "telemetry" ? history.items.flatMap(toReportLogs) : [];
  } catch (error) {
    errorMessage.value = normalizeError(error);
    logs.value = [];
  } finally {
    isLoading.value = false;
  }
}

function buildTelemetryHistoryUrl(): string {
  const params = new URLSearchParams({
    end: endOfDayIso(filters.endDate),
    limit: "1000",
    start: startOfDayIso(filters.startDate)
  });

  if (filters.deviceId !== "all") {
    params.set("deviceId", filters.deviceId);
  }

  return `/api/v1/telemetry/history?${params.toString()}`;
}

function toReportLogs(item: TelemetryHistoryItem): ReportLog[] {
  const metricKeys = item.metricKeys.length > 0 ? item.metricKeys : inferMetricKeys(item.payload);
  const device = deviceLookup.value.get(item.deviceUid);
  const plot = device?.plotName ?? "-";

  return metricKeys.flatMap((metricKey) => {
    const value = readMetricValue(item.payload, metricKey);

    if (value === undefined || isRecord(value)) {
      return [];
    }

    return [{
      dataset: "telemetry",
      deviceId: item.deviceUid,
      id: `${item.id}:${metricKey}`,
      metric: formatMetricLabel(metricKey),
      plot,
      status: classifyMetricStatus(metricKey, value),
      timestamp: item.receivedAt,
      value: formatMetricValue(value, readMetricUnit(item.payload, metricKey))
    } satisfies ReportLog];
  });
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
    ["Timestamp", "Device", "Plot/Area", "Metric", "Value", "Status"],
    ...filteredLogs.value.map((log) => [
      formatDateTime(log.timestamp),
      log.deviceId,
      log.plot,
      log.metric,
      log.value,
      log.status
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
  exportMessage.value = `CSV export dibuat untuk ${filteredLogs.value.length} ${filters.dataset} records.`;
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
  exportMessage.value = `PDF export disiapkan untuk ${filteredLogs.value.length} ${filters.dataset} records.`;
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

function readMetricUnit(payload: TelemetryPayload, metricKey: string): string {
  const units = isRecord(payload.units) ? payload.units : {};
  const unit = readNestedValue(units, metricKey.replace(/^metrics\./, ""));
  return typeof unit === "string" ? unit : "";
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

function inferMetricKeys(payload: TelemetryPayload): string[] {
  const source = isRecord(payload.metrics) ? payload.metrics : payload;
  const reservedKeys = new Set(["device_id", "deviceId", "node_id", "nodeId", "tenant_id", "tenantId", "timestamp", "time", "ts", "metrics", "units", "location", "lat", "lng", "latitude", "longitude"]);

  return Object.entries(source)
    .filter(([key, value]) => !reservedKeys.has(key) && !isRecord(value))
    .map(([key]) => key)
    .sort((left, right) => formatMetricLabel(left).localeCompare(formatMetricLabel(right)));
}

function formatMetricLabel(metricKey: string): string {
  return metricKey
    .replace(/^metrics\./, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMetricValue(value: unknown, unit: string): string {
  const normalizedValue = typeof value === "number"
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100)
    : String(value);

  return `${normalizedValue} ${unit}`.trim();
}

function classifyMetricStatus(metricKey: string, value: unknown): ReportLog["status"] {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  const normalizedKey = metricKey.toLowerCase();

  if (!Number.isFinite(numericValue)) {
    return "normal";
  }

  if (normalizedKey.includes("ph")) {
    return numericValue < 5.5 || numericValue > 7.5 ? "attention" : "normal";
  }

  if (normalizedKey.includes("moisture")) {
    return numericValue < 25 || numericValue > 85 ? "attention" : "normal";
  }

  if (normalizedKey.includes("temperature")) {
    return numericValue < 15 || numericValue > 42 ? "attention" : "normal";
  }

  return "normal";
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function createPrintableReportHtml(): string {
  const rows = filteredLogs.value.map((log) => `
    <tr>
      <td>${escapeHtml(formatDateTime(log.timestamp))}</td>
      <td>${escapeHtml(log.deviceId)}</td>
      <td>${escapeHtml(log.plot)}</td>
      <td>${escapeHtml(log.metric)}</td>
      <td>${escapeHtml(log.value)}</td>
      <td>${escapeHtml(log.status)}</td>
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>PAMILO ${filters.dataset} report</title>
        <style>
          body { color: #0f172a; font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          p { color: #475569; margin: 0 0 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>PAMILO ${escapeHtml(filters.dataset)} report</h1>
        <p>${escapeHtml(filters.startDate)} sampai ${escapeHtml(filters.endDate)} - ${filteredLogs.value.length} records</p>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device</th>
              <th>Plot/Area</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Status</th>
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
