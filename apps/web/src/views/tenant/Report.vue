<template>
  <div class="space-y-5">
    <section class="mb-6 rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarDays class="h-4 w-4 text-emerald-500" />
            {{ t("reports.filters.startDate") }}
          </span>
          <input
            v-model="filters.startDate"
            class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarDays class="h-4 w-4 text-teal-500" />
            {{ t("reports.filters.endDate") }}
          </span>
          <input
            v-model="filters.endDate"
            class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter class="h-4 w-4 text-sky-500" />
            {{ t("reports.filters.device") }}
          </span>
          <select
            v-model="filters.deviceId"
            class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="filters.dataset === 'weather'"
          >
            <option value="all">{{ t("common.allDevices") }}</option>
            <option v-for="device in devices" :key="device.id" :value="device.id">{{ device.label }}</option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <TableProperties class="h-4 w-4 text-violet-500" />
            {{ t("reports.filters.dataset") }}
          </span>
          <select
            v-model="filters.dataset"
            class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
          >
            <option v-for="option in datasetOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Clock class="h-4 w-4 text-amber-500" />
            {{ t("reports.filters.interval") }}
          </span>
          <select
            v-model="filters.intervalMinutes"
            class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
          >
            <option v-for="option in samplingOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <div class="flex flex-wrap gap-3">
          <button
            class="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isLoading"
            @click="refreshReportData"
          >
            <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
            {{ t("common.refresh") }}
          </button>
          <button
            class="flex min-h-11 items-center gap-2 rounded-full bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400"
            type="button"
            @click="exportReport('CSV')"
          >
            <Download class="h-4 w-4" />
            CSV
          </button>
          <button
            class="flex min-h-11 items-center gap-2 rounded-full bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400"
            type="button"
            @click="exportReport('PDF')"
          >
            <FileDown class="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div v-if="exportMessage" class="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-700">
        {{ exportMessage }}
      </div>
      <div v-if="errorMessage" class="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-medium text-amber-700">
        {{ errorMessage }}
      </div>
    </section>

    <section class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold tracking-normal text-slate-800">{{ t("reports.dataLogs") }}</h2>
          <p class="mt-1 text-sm font-medium text-slate-400">{{ reportPreviewLabel }}</p>
        </div>
        <FileText class="h-6 w-6 text-emerald-500" />
      </div>

      <div v-if="filters.dataset === 'telemetry'" class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[1680px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th rowspan="3" class="border-b border-white/60 px-5 py-4 align-middle font-bold">{{ t("reports.columns.timestamp") }}</th>
              <th rowspan="3" class="border-b border-white/60 px-5 py-4 align-middle font-bold">{{ t("reports.columns.device") }}</th>
              <th rowspan="3" class="border-b border-white/60 px-5 py-4 align-middle font-bold">{{ t("reports.columns.plotArea") }}</th>
              <th :colspan="metricColumns.length * 2" class="border-b border-white/60 px-5 py-3 text-center font-bold">{{ t("reports.columns.metric") }}</th>
            </tr>
            <tr>
              <th
                v-for="metric in metricColumns"
                :key="`${metric.key}-group`"
                colspan="2"
                class="border-b border-white/60 px-4 py-3 text-center font-bold tracking-wider text-slate-500"
              >
                {{ metricHeaderLabel(metric) }}
              </th>
            </tr>
            <tr>
              <template v-for="metric in metricColumns" :key="metric.key">
                <th class="border-b border-white/60 px-4 py-3 text-center font-bold">{{ t("reports.columns.value") }}</th>
                <th class="border-b border-white/60 px-4 py-3 text-center font-bold">{{ t("common.status") }}</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedTelemetryRows" :key="row.id" class="border-b border-white/60 transition-colors hover:bg-white/40">
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatDateTime(row.timestamp) }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.deviceId }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.plot }}</td>
              <template v-for="metric in metricColumns" :key="`${row.id}-${metric.key}`">
                <td class="px-4 py-4 text-center text-sm font-medium text-slate-700">{{ formatMetricCellValue(row.metrics[metric.key]) }}</td>
                <td class="px-4 py-4 text-center">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                    :class="metricStatusClass(row.metrics[metric.key].status)"
                  >
                    {{ formatMetricStatus(row.metrics[metric.key].status) }}
                  </span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="filters.dataset === 'weather'" class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[1180px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.timestamp") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.location") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">ADM4</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.currentCondition") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.temperature") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.airHumidity") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.rainfall") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.rainChance") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("weather.wind") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.source") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedWeatherRows" :key="row.id" class="border-b border-white/60 transition-colors hover:bg-white/40">
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatDateTime(row.timestamp) }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.location }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.adm4Code }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.condition }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatTemperature(row.temperatureC) }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatHumidity(row.humidityPercent) }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatRain(row.rainfallMm) }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatPercent(row.rainChancePercent) }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.wind }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.source }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[1120px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.timestamp") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.severity") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.source") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.subject") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.alert") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("reports.columns.detail") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedAlertRows" :key="row.id" class="border-b border-white/60 transition-colors hover:bg-white/40">
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ formatDateTime(row.timestamp) }}</td>
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                  :class="alertSeverityClass(row.severity)"
                >
                  {{ formatAlertSeverity(row.severity) }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.source }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.subject }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.title }}</td>
              <td class="px-5 py-4 text-sm font-medium text-slate-700">{{ row.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading && sampledRows.length === 0" class="border-t border-white/60 p-8 text-center text-sm font-medium text-slate-400">
        {{ t("reports.loading") }}
      </div>

      <div v-else-if="sampledRows.length === 0" class="border-t border-white/60 p-8 text-center text-sm font-medium text-slate-400">
        {{ t("reports.empty") }}
      </div>

      <div v-else class="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-4 text-sm font-medium text-slate-700">
        <p class="flex flex-wrap items-center gap-2">
          <span>{{ t("reports.showingRecords", { start: paginationStart, end: paginationEnd, total: formatDataCount(sampledRows.length) }) }}</span>
          <span v-if="isLoading" class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{{ t("reports.updating") }}</span>
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-2 text-xs font-medium text-slate-400">
            {{ t("weather.rows") }}
            <select
              v-model.number="pageSize"
              class="h-9 rounded-xl border border-slate-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
            >
              <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :aria-label="t('reports.firstPage')"
            :disabled="activePage <= 1"
            @click="setPage(1)"
          >
            <ChevronsLeft class="h-4 w-4" />
          </button>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :aria-label="t('weather.previousPage')"
            :disabled="activePage <= 1"
            @click="setPage(activePage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-for="pageNumber in visiblePageNumbers"
            :key="pageNumber"
            class="inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-semibold shadow-sm transition-all"
            :class="pageNumber === activePage ? 'border-emerald-300 bg-emerald-300 text-emerald-950' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50'"
            type="button"
            :aria-current="pageNumber === activePage ? 'page' : undefined"
            @click="setPage(pageNumber)"
          >
            {{ pageNumber }}
          </button>
          <span class="min-w-24 text-center text-xs font-medium text-slate-400">{{ t("weather.pageStatus", { page: activePage, total: totalPages }) }}</span>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :aria-label="t('weather.nextPage')"
            :disabled="activePage >= totalPages"
            @click="setPage(activePage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :aria-label="t('reports.lastPage')"
            :disabled="activePage >= totalPages"
            @click="setPage(totalPages)"
          >
            <ChevronsRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Download, FileDown, FileText, Filter, RefreshCw, TableProperties } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { t, useI18n, type TranslationParams } from "../../i18n";
import { formatDataCount, formatDateTime as formatLocalizedDateTime, formatNumber, formatPercent as formatLocalizedPercent } from "../../i18n/formatters";
import { getMetricLabel, getMetricUnit } from "../../i18n/metrics";
import { formatWindLabel, getWeatherConditionLabel, isRainyCondition, type WeatherConditionSource } from "../../i18n/weather";
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
type FeedbackKind = "error" | "success";

interface FeedbackMessage {
  key: string;
  kind: FeedbackKind;
  params?: TranslationParams;
}

interface ReportMetricColumn {
  key: ReportMetricKey;
  sourceKeys: string[];
}

interface ReportMetricCell {
  status: ReportMetricStatus;
  value: unknown;
}

type ReportMetricCells = Record<ReportMetricKey, ReportMetricCell>;

interface ReportRowBase {
  dataset: Dataset;
  id: string;
  timestamp: string;
}

interface TelemetryReportRow extends ReportRowBase {
  dataset: "telemetry";
  deviceId: string;
  metrics: ReportMetricCells;
  plot: string;
}

interface WeatherReportRow extends ReportRowBase {
  adm4Code: string;
  condition: string;
  dataset: "weather";
  humidityPercent: number | null;
  location: string;
  rainfallMm: number | null;
  rainChancePercent: number | null;
  source: string;
  temperatureC: number | null;
  wind: string;
}

type AlertSeverity = "high" | "low" | "medium";

interface AlertReportRow extends ReportRowBase {
  dataset: "alerts";
  deviceId: string | null;
  message: string;
  severity: AlertSeverity;
  source: string;
  subject: string;
  title: string;
}

type ReportRow = AlertReportRow | TelemetryReportRow | WeatherReportRow;

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

interface WeatherHistoryResponse {
  count: number;
  items: WeatherHistoryItem[];
  limit: number;
  offset: number;
}

interface WeatherHistoryItem {
  adm4Code: string;
  condition: string;
  current: unknown;
  daily: unknown[];
  fetchedAt: string;
  humidityPercent: number | null;
  id: string;
  isMock: boolean;
  location: unknown;
  observedAt: string;
  plotId: string | null;
  plotName: string | null;
  rainfallMm: number | null;
  source: string;
  temperatureC: number | null;
  windDirection: string | null;
  windSpeed: number | null;
}

const today = new Date();
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(today.getDate() - 3);
const telemetryHistoryPageSize = 1000;
const telemetryHistoryMaxRows = 100_000;
const weatherHistoryPageSize = 1000;
const weatherHistoryMaxRows = 100_000;

const metricColumns: ReportMetricColumn[] = [
  {
    key: "conductivity",
    sourceKeys: ["conductivity", "ec", "electrical_conductivity"]
  },
  {
    key: "moisture",
    sourceKeys: ["moisture", "soil_moisture"]
  },
  {
    key: "nitrogen",
    sourceKeys: ["nitrogen", "n"]
  },
  {
    key: "phosphorus",
    sourceKeys: ["phosphorus", "p"]
  },
  {
    key: "potassium",
    sourceKeys: ["potassium", "k"]
  },
  {
    key: "ph",
    sourceKeys: ["ph", "pH"]
  },
  {
    key: "soil_temperature",
    sourceKeys: ["soil_temperature", "soilTemperature", "soilTemperatureC", "temperature"]
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

const exportFeedback = ref<FeedbackMessage | null>(null);
const errorFeedback = ref<FeedbackMessage | null>(null);
const isLoading = ref(false);
const apiDevices = ref<ApiDevice[]>([]);
const historyItems = ref<TelemetryHistoryItem[]>([]);
const weatherHistoryItems = ref<WeatherHistoryItem[]>([]);
const rows = ref<ReportRow[]>([]);
const currentPage = ref(1);
const pageSize = ref(25);
const pageSizeOptions = [10, 25, 50];
const { locale } = useI18n();
let refreshTimer: number | undefined;
const datasetOptions = computed<Array<{ label: string; value: Dataset }>>(() => [
  { label: t("reports.datasets.telemetry"), value: "telemetry" },
  { label: t("reports.datasets.alerts"), value: "alerts" },
  { label: t("reports.datasets.weather"), value: "weather" }
]);
const samplingOptions = computed<Array<{ label: string; value: SamplingInterval }>>(() => [
  { label: t("reports.sampling.raw"), value: "raw" },
  { label: t("reports.sampling.minutes", { minutes: 5 }), value: "5" },
  { label: t("reports.sampling.minutes", { minutes: 15 }), value: "15" },
  { label: t("reports.sampling.hourly"), value: "60" }
]);
const exportMessage = computed(() => exportFeedback.value ? t(exportFeedback.value.key, exportFeedback.value.params ?? {}) : "");
const errorMessage = computed(() => errorFeedback.value ? t(errorFeedback.value.key, errorFeedback.value.params ?? {}) : null);

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
    if (!isTelemetryReportRow(row)) {
      grouped.set(row.id, row);
      continue;
    }

    const groupKey = `${row.id}:${row.timestamp}:${row.deviceId}:${row.plot}`;
    const existing = grouped.get(groupKey);

    grouped.set(groupKey, existing && isTelemetryReportRow(existing)
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
    const matchesDevice = filters.dataset === "weather" || filters.deviceId === "all" || (hasDeviceId(row) && row.deviceId === filters.deviceId);
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
    const bucketKey = `${row.dataset}:${reportRowSubjectKey(row)}:${bucket}`;
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
const paginatedTelemetryRows = computed(() => paginatedRows.value.filter(isTelemetryReportRow));
const paginatedWeatherRows = computed(() => paginatedRows.value.filter(isWeatherReportRow));
const paginatedAlertRows = computed(() => paginatedRows.value.filter(isAlertReportRow));
const paginationStart = computed(() => sampledRows.value.length === 0 ? 0 : (activePage.value - 1) * pageSize.value + 1);
const paginationEnd = computed(() => Math.min(activePage.value * pageSize.value, sampledRows.value.length));
const visiblePageNumbers = computed(() => {
  const maxVisiblePages = 5;
  const halfWindow = Math.floor(maxVisiblePages / 2);
  const lastPage = totalPages.value;
  let startPage = Math.max(1, activePage.value - halfWindow);
  const endPage = Math.min(lastPage, startPage + maxVisiblePages - 1);

  startPage = Math.max(1, endPage - maxVisiblePages + 1);

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
});
const selectedDatasetLabel = computed(() => datasetOptions.value.find((option) => option.value === filters.dataset)?.label ?? filters.dataset);
const selectedSamplingLabel = computed(() => samplingOptions.value.find((option) => option.value === filters.intervalMinutes)?.label ?? t("reports.sampling.raw"));
const reportPreviewLabel = computed(() => t("reports.preview", { sampling: selectedSamplingLabel.value.toLowerCase() }));

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

watch(() => filters.dataset, (dataset) => {
  if (dataset === "weather") {
    filters.deviceId = "all";
  }
});

watch(() => filters.intervalMinutes, () => {
  currentPage.value = 1;
});

watch(pageSize, () => {
  currentPage.value = 1;
});

watch(locale, () => {
  rows.value = buildRowsFromCachedItems();
});

async function refreshReportData(): Promise<void> {
  currentPage.value = 1;
  await loadReportData();
}

async function loadReportData(options: { clearExportMessage?: boolean } = {}): Promise<void> {
  if (isLoading.value) {
    return;
  }

  if (!isDateRangeValid()) {
    errorFeedback.value = {
      kind: "error",
      key: "reports.invalidRange"
    };
    rows.value = [];
    return;
  }

  isLoading.value = true;
  errorFeedback.value = null;

  if (options.clearExportMessage !== false) {
    exportFeedback.value = null;
  }

  try {
    const deviceRows = await apiGet<ApiDevice[]>("/api/v1/devices");

    apiDevices.value = deviceRows;
    rows.value = await fetchReportRowsForDataset();
  } catch (error) {
    errorFeedback.value = normalizeError(error);
    rows.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function fetchReportRowsForDataset(): Promise<ReportRow[]> {
  if (filters.dataset === "weather") {
    historyItems.value = [];
    const weatherItems = await fetchWeatherHistoryItems();
    weatherHistoryItems.value = weatherItems;
    return buildRowsFromCachedItems();
  }

  const telemetryItems = await fetchTelemetryHistoryItems();
  historyItems.value = telemetryItems;

  if (filters.dataset === "alerts") {
    const weatherItems = await fetchWeatherHistoryItems();
    weatherHistoryItems.value = weatherItems;
    return buildRowsFromCachedItems();
  }

  weatherHistoryItems.value = [];
  return buildRowsFromCachedItems();
}

function buildRowsFromCachedItems(): ReportRow[] {
  if (filters.dataset === "weather") {
    return weatherHistoryItems.value.map(toWeatherReportRow);
  }

  if (filters.dataset === "alerts") {
    return [
      ...historyItems.value.flatMap(toTelemetryAlertRows),
      ...weatherHistoryItems.value.flatMap(toWeatherAlertRows)
    ];
  }

  return historyItems.value.map(toReportRow);
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
    exportFeedback.value = {
      kind: "success",
      key: "reports.limitReached",
      params: {
        count: formatDataCount(telemetryHistoryMaxRows),
        dataset: t("reports.datasets.telemetry").toLowerCase()
      }
    };
  }

  return items;
}

async function fetchWeatherHistoryItems(): Promise<WeatherHistoryItem[]> {
  const items: WeatherHistoryItem[] = [];

  for (let offset = 0; offset < weatherHistoryMaxRows; offset += weatherHistoryPageSize) {
    const response = await apiGet<WeatherHistoryResponse>(buildWeatherHistoryUrl(offset));
    items.push(...response.items);

    if (response.items.length < weatherHistoryPageSize) {
      break;
    }
  }

  if (items.length >= weatherHistoryMaxRows) {
    exportFeedback.value = {
      kind: "success",
      key: "reports.limitReached",
      params: {
        count: formatDataCount(weatherHistoryMaxRows),
        dataset: t("reports.datasets.weather").toLowerCase()
      }
    };
  }

  return items;
}

function buildTelemetryHistoryUrl(offset = 0): string {
  const params = new URLSearchParams({
    end: endOfDayIso(filters.endDate),
    limit: String(telemetryHistoryPageSize),
    locale: locale.value,
    offset: String(offset),
    start: startOfDayIso(filters.startDate)
  });

  if (filters.deviceId !== "all") {
    params.set("deviceId", filters.deviceId);
  }

  return `/api/v1/telemetry/history?${params.toString()}`;
}

function buildWeatherHistoryUrl(offset = 0): string {
  const params = new URLSearchParams({
    end: endOfDayIso(filters.endDate),
    limit: String(weatherHistoryPageSize),
    locale: locale.value,
    offset: String(offset),
    start: startOfDayIso(filters.startDate)
  });

  return `/api/v1/weather/history?${params.toString()}`;
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
        value
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

function toWeatherReportRow(item: WeatherHistoryItem): WeatherReportRow {
  return {
    adm4Code: item.adm4Code,
    condition: getWeatherConditionLabel(toWeatherConditionSource(item)),
    dataset: "weather",
    humidityPercent: item.humidityPercent,
    id: `weather-${item.id}`,
    location: formatWeatherLocation(item),
    rainfallMm: item.rainfallMm,
    rainChancePercent: readWeatherRainChance(item),
    source: item.isMock ? t("weather.weatherSourceMock") : item.source,
    temperatureC: item.temperatureC,
    timestamp: item.observedAt,
    wind: formatWindLabel(item.windSpeed, item.windDirection)
  };
}

function toTelemetryAlertRows(item: TelemetryHistoryItem): AlertReportRow[] {
  const device = deviceLookup.value.get(item.deviceUid);
  const plot = device?.plotName ?? "-";
  const alerts: AlertReportRow[] = [];

  for (const column of metricColumns) {
    const value = readMetricColumnValue(item.payload, column);

    if (value === undefined || isRecord(value) || classifyMetricStatus(column.key, value) !== "attention") {
      continue;
    }

    const metricLabel = getMetricLabel(column.key);
    const metricUnit = getMetricUnit(column.key);

    alerts.push({
      dataset: "alerts",
      deviceId: item.deviceUid,
      id: `alert-telemetry-${item.id}-${column.key}`,
      message: t("reports.alerts.telemetryMessage", {
        metric: metricLabel,
        plot,
        unit: metricUnit,
        value: formatMetricValue(value)
      }),
      severity: telemetryAlertSeverity(column.key, value),
      source: t("reports.datasets.telemetry"),
      subject: `${item.deviceUid} / ${plot}`,
      timestamp: item.receivedAt,
      title: t("reports.alerts.telemetryTitle", { metric: metricLabel })
    });
  }

  return alerts;
}

function toWeatherAlertRows(item: WeatherHistoryItem): AlertReportRow[] {
  const rainChance = readWeatherRainChance(item);
  const conditionSource = toWeatherConditionSource(item);
  const weatherCondition = getWeatherConditionLabel(conditionSource);
  const hasRain = isRainyCondition(conditionSource) || (item.rainfallMm ?? 0) > 0 || (rainChance ?? 0) >= 60;

  if (!hasRain) {
    return [];
  }

  return [{
    dataset: "alerts",
    deviceId: null,
    id: `alert-weather-${item.id}`,
    message: t("reports.alerts.weatherMessage", {
      condition: weatherCondition,
      rain: formatRain(item.rainfallMm),
      chance: formatPercent(rainChance)
    }),
    severity: weatherAlertSeverity(item, rainChance),
    source: t("reports.datasets.weather"),
    subject: formatWeatherLocation(item),
    timestamp: item.observedAt,
    title: t("reports.alerts.weatherTitle")
  }];
}

function exportReport(format: ExportFormat): void {
  if (format === "CSV") {
    exportCsv();
    return;
  }

  exportPdf();
}

function exportCsv(): void {
  errorFeedback.value = null;
  const rows = createCsvRows();
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = createExportFilename("csv");
  link.click();
  URL.revokeObjectURL(url);
  exportFeedback.value = {
    kind: "success",
    key: "reports.exportReady",
    params: {
      count: formatDataCount(sampledRows.value.length),
      dataset: selectedDatasetLabel.value.toLowerCase(),
      format: "CSV",
      sampling: selectedSamplingLabel.value.toLowerCase()
    }
  };
}

function createCsvRows(): string[][] {
  if (filters.dataset === "weather") {
    return [
      weatherCsvHeaders(),
      ...sampledRows.value.filter(isWeatherReportRow).map((row) => [
        formatDateTime(row.timestamp),
        row.location,
        row.adm4Code,
        row.condition,
        formatTemperature(row.temperatureC),
        formatHumidity(row.humidityPercent),
        formatRain(row.rainfallMm),
        formatPercent(row.rainChancePercent),
        row.wind,
        row.source
      ])
    ];
  }

  if (filters.dataset === "alerts") {
    return [
      alertCsvHeaders(),
      ...sampledRows.value.filter(isAlertReportRow).map((row) => [
        formatDateTime(row.timestamp),
        formatAlertSeverity(row.severity),
        row.source,
        row.subject,
        row.title,
        row.message
      ])
    ];
  }

  return [
    [t("reports.columns.timestamp"), t("reports.columns.device"), t("reports.columns.plotArea"), ...metricColumns.flatMap((metric, index) => [index === 0 ? t("reports.columns.metric") : "", ""])],
    ["", "", "", ...metricColumns.flatMap((metric) => [metricHeaderLabel(metric), ""])],
    ["", "", "", ...metricColumns.flatMap(() => [t("reports.columns.value"), t("common.status")])],
    ...sampledRows.value.filter(isTelemetryReportRow).map((row) => [
      formatDateTime(row.timestamp),
      row.deviceId,
      row.plot,
      ...metricColumns.flatMap((metric) => [
        formatMetricCellValue(row.metrics[metric.key]),
        formatMetricStatus(row.metrics[metric.key].status)
      ])
    ])
  ];
}

function exportPdf(): void {
  errorFeedback.value = null;
  const reportWindow = window.open("", "_blank", "width=1024,height=720");
  if (!reportWindow) {
    errorFeedback.value = {
      kind: "error",
      key: "reports.popupBlocked"
    };
    return;
  }

  reportWindow.document.write(createPrintableReportHtml());
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  exportFeedback.value = {
    kind: "success",
    key: "reports.exportReady",
    params: {
      count: formatDataCount(sampledRows.value.length),
      dataset: selectedDatasetLabel.value.toLowerCase(),
      format: "PDF",
      sampling: selectedSamplingLabel.value.toLowerCase()
    }
  };
}

function weatherCsvHeaders(): string[] {
  return [
    t("reports.columns.timestamp"),
    t("weather.location"),
    "ADM4",
    t("weather.currentCondition"),
    t("weather.temperature"),
    t("weather.airHumidity"),
    t("weather.rainfall"),
    t("weather.rainChance"),
    t("weather.wind"),
    t("reports.columns.source")
  ];
}

function alertCsvHeaders(): string[] {
  return [
    t("reports.columns.timestamp"),
    t("reports.columns.severity"),
    t("reports.columns.source"),
    t("reports.columns.subject"),
    t("reports.columns.alert"),
    t("reports.columns.detail")
  ];
}

function createExportFilename(extension: "csv"): string {
  return `pamilo-${locale.value}-${filters.dataset}-${filters.startDate}-${filters.endDate}.${extension}`;
}

function setPage(page: number): void {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
}

function createEmptyMetricCells(): ReportMetricCells {
  return metricColumns.reduce((cells, column) => {
    cells[column.key] = {
      status: "empty",
      value: null
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

function readWeatherRainChance(item: WeatherHistoryItem): number | null {
  const firstDaily = item.daily[0];
  if (!isRecord(firstDaily)) {
    return null;
  }

  const value = firstDaily.rainChancePercent;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toWeatherConditionSource(item: WeatherHistoryItem): WeatherConditionSource {
  const current = isRecord(item.current) ? item.current : {};
  return {
    condition: item.condition,
    conditionEn: typeof current.conditionEn === "string" ? current.conditionEn : null,
    weatherCode: readWeatherCode(current)
  };
}

function readWeatherCode(current: Record<string, unknown>): number | null {
  const rawCode = current.weatherCode ?? current.weather_code ?? current.weather;

  if (typeof rawCode === "number" && Number.isFinite(rawCode)) {
    return rawCode;
  }

  if (typeof rawCode === "string") {
    const parsed = Number(rawCode);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function telemetryAlertSeverity(metricKey: ReportMetricKey, value: unknown): AlertSeverity {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return "medium";
  }

  if (metricKey === "ph" && (numericValue < 5 || numericValue > 8)) {
    return "high";
  }

  if (metricKey === "moisture" && (numericValue < 15 || numericValue > 95)) {
    return "high";
  }

  if (metricKey === "soil_temperature" && (numericValue < 10 || numericValue > 45)) {
    return "high";
  }

  if (metricKey === "phosphorus" && numericValue > 500) {
    return "high";
  }

  return "medium";
}

function weatherAlertSeverity(item: WeatherHistoryItem, rainChance: number | null): AlertSeverity {
  const conditionLabel = getWeatherConditionLabel(toWeatherConditionSource(item)).toLowerCase();
  if ((item.rainfallMm ?? 0) >= 20 || (rainChance ?? 0) >= 80 || conditionLabel.includes("petir") || conditionLabel.includes("thunder")) {
    return "high";
  }

  return "medium";
}

function reportRowSubjectKey(row: ReportRow): string {
  if (isTelemetryReportRow(row)) {
    return `${row.deviceId}:${row.plot}`;
  }

  if (isAlertReportRow(row)) {
    return `${row.source}:${row.subject}`;
  }

  return `${row.adm4Code}:${row.location}`;
}

function hasDeviceId(row: ReportRow): row is AlertReportRow | TelemetryReportRow {
  return "deviceId" in row && row.deviceId !== null;
}

function isTelemetryReportRow(row: ReportRow): row is TelemetryReportRow {
  return row.dataset === "telemetry";
}

function isWeatherReportRow(row: ReportRow): row is WeatherReportRow {
  return row.dataset === "weather";
}

function isAlertReportRow(row: ReportRow): row is AlertReportRow {
  return row.dataset === "alerts";
}

function metricHeaderLabel(metric: ReportMetricColumn): string {
  const unit = getMetricUnit(metric.key);
  return unit ? `${getMetricLabel(metric.key)} (${unit})` : getMetricLabel(metric.key);
}

function metricStatusClass(status: ReportMetricStatus): string {
  if (status === "normal") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "attention") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-500";
}

function formatMetricStatus(status: ReportMetricStatus): string {
  if (status === "normal") {
    return t("reports.status.normal");
  }

  if (status === "attention") {
    return t("reports.status.attention");
  }

  return t("format.nullValue");
}

function formatMetricCellValue(cell: ReportMetricCell): string {
  return cell.status === "empty" ? t("format.nullValue") : formatMetricValue(cell.value);
}

function alertSeverityClass(severity: AlertSeverity): string {
  if (severity === "high") {
    return "bg-rose-100 text-rose-700";
  }

  if (severity === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function formatAlertSeverity(severity: AlertSeverity): string {
  if (severity === "high") return t("reports.severity.high");
  if (severity === "medium") return t("reports.severity.medium");
  return t("reports.severity.low");
}

function formatWeatherLocation(item: WeatherHistoryItem): string {
  if (isRecord(item.location)) {
    const village = typeof item.location.village === "string" ? item.location.village : "";
    const district = typeof item.location.district === "string" ? item.location.district : "";
    const city = typeof item.location.city === "string" ? item.location.city : "";
    const parts = [village, district, city].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  return item.plotName ?? `ADM4 ${item.adm4Code}`;
}

function formatTemperature(value: number | null): string {
  return value === null ? t("format.nullValue") : `${formatMetricValue(value)} C`;
}

function formatHumidity(value: number | null): string {
  return formatPercent(value);
}

function formatRain(value: number | null): string {
  return value === null ? t("format.nullValue") : `${formatMetricValue(value)} mm`;
}

function formatPercent(value: number | null): string {
  return formatLocalizedPercent(value, { valueKind: "percent" });
}

function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string): string {
  return formatLocalizedDateTime(value, {
    dateStyle: "medium",
    timeStyle: "medium"
  });
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
    return t("format.nullValue");
  }

  const normalizedValue = typeof value === "number"
    ? formatNumber(Math.round(value * 100) / 100, { maximumFractionDigits: 2 })
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
  const table = createPrintableTableHtml();
  const title = t("reports.printTitle", { dataset: selectedDatasetLabel.value });
  const summary = t("reports.printSummary", {
    count: formatDataCount(sampledRows.value.length),
    end: formatDateOnly(filters.endDate),
    sampling: selectedSamplingLabel.value,
    start: formatDateOnly(filters.startDate)
  });
  const generatedAt = t("reports.generatedAt", { time: formatDateTime(new Date().toISOString()) });

  return `
    <!doctype html>
    <html lang="${escapeHtml(locale.value)}">
      <head>
        <title>${escapeHtml(title)}</title>
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
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(summary)}</p>
        <p>${escapeHtml(generatedAt)}</p>
        ${table}
      </body>
    </html>
  `;
}

function formatDateOnly(value: string): string {
  return formatLocalizedDateTime(`${value}T00:00:00`, {
    dateStyle: "medium"
  });
}

function createPrintableTableHtml(): string {
  if (filters.dataset === "weather") {
    const rows = sampledRows.value.filter(isWeatherReportRow).map((row) => `
      <tr>
        <td>${escapeHtml(formatDateTime(row.timestamp))}</td>
        <td>${escapeHtml(row.location)}</td>
        <td>${escapeHtml(row.adm4Code)}</td>
        <td>${escapeHtml(row.condition)}</td>
        <td>${escapeHtml(formatTemperature(row.temperatureC))}</td>
        <td>${escapeHtml(formatHumidity(row.humidityPercent))}</td>
        <td>${escapeHtml(formatRain(row.rainfallMm))}</td>
        <td>${escapeHtml(formatPercent(row.rainChancePercent))}</td>
        <td>${escapeHtml(row.wind)}</td>
        <td>${escapeHtml(row.source)}</td>
      </tr>
    `).join("");

    return `
      <table>
        <thead>
          <tr>
            ${weatherCsvHeaders().map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows || emptyPrintableRows(weatherCsvHeaders().length)}</tbody>
      </table>
    `;
  }

  if (filters.dataset === "alerts") {
    const rows = sampledRows.value.filter(isAlertReportRow).map((row) => `
      <tr>
        <td>${escapeHtml(formatDateTime(row.timestamp))}</td>
        <td>${escapeHtml(formatAlertSeverity(row.severity))}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.subject)}</td>
        <td>${escapeHtml(row.title)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>
    `).join("");

    return `
      <table>
        <thead>
          <tr>
            ${alertCsvHeaders().map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows || emptyPrintableRows(alertCsvHeaders().length)}</tbody>
      </table>
    `;
  }

  const metricGroupHeaders = metricColumns.map((metric) => `<th colspan="2">${escapeHtml(metricHeaderLabel(metric))}</th>`).join("");
  const metricSubHeaders = metricColumns.map(() => `<th>${escapeHtml(t("reports.columns.value"))}</th><th>${escapeHtml(t("common.status"))}</th>`).join("");
  const rows = sampledRows.value.filter(isTelemetryReportRow).map((row) => `
    <tr>
      <td>${escapeHtml(formatDateTime(row.timestamp))}</td>
      <td>${escapeHtml(row.deviceId)}</td>
      <td>${escapeHtml(row.plot)}</td>
      ${metricColumns.map((metric) => `
        <td>${escapeHtml(formatMetricCellValue(row.metrics[metric.key]))}</td>
        <td>${escapeHtml(formatMetricStatus(row.metrics[metric.key].status))}</td>
      `).join("")}
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr>
          <th rowspan="3">${escapeHtml(t("reports.columns.timestamp"))}</th>
          <th rowspan="3">${escapeHtml(t("reports.columns.device"))}</th>
          <th rowspan="3">${escapeHtml(t("reports.columns.plotArea"))}</th>
          <th class="center" colspan="${metricColumns.length * 2}">${escapeHtml(t("reports.columns.metric"))}</th>
        </tr>
        <tr>
          ${metricGroupHeaders}
        </tr>
        <tr>
          ${metricSubHeaders}
        </tr>
      </thead>
      <tbody>${rows || emptyPrintableRows(3 + metricColumns.length * 2)}</tbody>
    </table>
  `;
}

function emptyPrintableRows(colspan: number): string {
  return `<tr><td colspan="${colspan}">${escapeHtml(t("reports.empty"))}</td></tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isDateRangeValid(): boolean {
  const start = Date.parse(`${filters.startDate}T00:00:00`);
  const end = Date.parse(`${filters.endDate}T23:59:59`);

  return Number.isFinite(start) && Number.isFinite(end) && start <= end;
}

function normalizeError(error: unknown): FeedbackMessage {
  if (error instanceof ApiClientError) {
    return error.status === 401
      ? { kind: "error", key: "reports.sessionExpired" }
      : { kind: "error", key: "api.requestFailed", params: { status: error.status } };
  }

  if (error instanceof TypeError) {
    return { kind: "error", key: "reports.apiUnavailable" };
  }

  return { kind: "error", key: "reports.loadFailed" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>
