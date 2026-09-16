<template>
  <div class="space-y-5">
    <section class="rounded-[2rem] border border-white bg-white/70 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:p-6">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,2fr)_minmax(150px,1fr)_auto] xl:items-end">
        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <TabletSmartphone class="h-4 w-4 text-emerald-500" />
            {{ t("charts.deviceName") }}
          </span>
          <select
            v-model="activeDeviceUid"
            :aria-label="t('charts.deviceName')"
            class="min-h-12 w-full rounded-full border border-white bg-slate-50 px-4 text-sm font-medium text-slate-600 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          >
            <option v-if="deviceOptions.length === 0" value="">{{ t("charts.emptyDevice") }}</option>
            <option v-for="device in deviceOptions" :key="device.deviceUid" :value="device.deviceUid">
              {{ device.label }}
            </option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Clock class="h-4 w-4 text-teal-500" />
            {{ t("charts.interval") }}
          </span>
          <select
            v-model="filters.intervalMinutes"
            :aria-label="t('charts.intervalAria')"
            class="min-h-12 w-full rounded-full border border-white bg-slate-50 px-4 text-sm font-medium text-slate-600 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          >
            <option v-for="option in intervalOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <button
          type="button"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-100 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isLoading"
          @click="refreshTelemetryHistory"
        >
          <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
          {{ isLoading ? t("charts.loading") : t("common.refresh") }}
        </button>
      </div>

      <p v-if="errorMessage" class="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-700">
        {{ errorMessage }}
      </p>
      <p v-if="infoMessage" class="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-600">
        {{ infoMessage }}
      </p>
    </section>

    <section v-if="chartCards.length > 0" class="grid gap-5 xl:grid-cols-2">
      <article
        v-for="card in chartCards"
        :key="card.id"
        class="rounded-[2rem] border border-white bg-white/70 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:p-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-400">{{ pointCountLabel(card.pointCount) }}{{ card.thresholdLabel ? ` / ${card.thresholdLabel}` : "" }}</p>
            <h3 class="mt-2 truncate text-xl font-bold tracking-normal text-slate-800">{{ card.label }}</h3>
            <p class="mt-3 text-3xl font-bold tracking-normal text-slate-800">{{ card.currentValueLabel }}</p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("charts.unit") }}: {{ card.unitLabel }}</p>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <span class="rounded-full bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600">{{ chartRangeLabel }}</span>
            <span class="rounded-full bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600">{{ selectedIntervalLabel }}</span>
          </div>
        </div>

        <div class="mt-6 h-[310px]">
          <Line :data="card.chartData" :options="card.chartOptions" />
        </div>
      </article>
    </section>

    <section v-else class="rounded-[2rem] border border-white bg-white/70 p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
        <span class="h-5 w-5 rounded-full bg-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.28)]"></span>
      </div>
      <h2 class="mt-4 text-lg font-bold tracking-normal text-slate-800">{{ t("charts.emptyTitle") }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm font-medium text-slate-400">
        {{ t("charts.emptyDescription") }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext
} from "chart.js";
import { Clock, RefreshCw, TabletSmartphone } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { Line } from "vue-chartjs";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { t, tn, type TranslationParams } from "../../i18n";
import { formatDataCount, formatDateTime as formatLocalizedDateTime, formatNumber } from "../../i18n/formatters";
import { getMetricLabel, getMetricUnit, normalizeMetricKey } from "../../i18n/metrics";
import { ApiClientError, apiGet } from "../../services/apiClient";
import { useDeviceStore } from "../../stores/deviceStore";
import { useMasterDataStore, type ThresholdKey, type ThresholdRange } from "../../stores/masterDataStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, Title, Tooltip);

type TelemetryPayload = Record<string, unknown>;
type ChartInterval = "15" | "60";

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
  metricKey: string | null;
  metricKeys: string[];
  payload: TelemetryPayload;
  receivedAt: string;
  topic: string;
  value: unknown;
}

interface TelemetryHistoryRequest {
  deviceUid: string;
  endIso: string;
  endTime: number;
  startIso: string;
  startTime: number;
}

interface TelemetryHistoryWindow {
  endIso: string;
  endTime: number;
  startIso: string;
  startTime: number;
}

interface DeviceOption {
  deviceUid: string;
  label: string;
}

interface DeviceSummary {
  deviceUid: string;
  lastSeenAt: string;
  metricKeys: string[];
}

interface MetricChartCard {
  id: string;
  label: string;
  color: string;
  chartData: ChartData<"line", Array<number | null>, string>;
  chartOptions: ChartOptions<"line">;
  currentValueLabel: string;
  pointCount: number;
  thresholdLabel: string | null;
  unitLabel: string;
}

interface MetricPoint {
  timestamp: string;
  value: number | null;
}

interface MetricThreshold {
  max: number | null;
  min: number | null;
  unit: string;
}

interface ChartMessage {
  fallback?: string;
  key: string;
  params?: TranslationParams;
}

const chartHistoryWindowMs = 24 * 60 * 60 * 1000;
const telemetryHistoryPageSize = 1000;
const telemetryHistoryMaxRows = 100_000;

const deviceStore = useDeviceStore();
const masterDataStore = useMasterDataStore();
const { devices } = storeToRefs(deviceStore);
const { crops, plots } = storeToRefs(masterDataStore);
const activeDeviceUid = ref("");
const chartError = ref<ChartMessage | null>(null);
const historyWindow = ref<TelemetryHistoryWindow>(createTelemetryHistoryWindow());
const historyItems = ref<TelemetryHistoryItem[]>([]);
const isHistoryCapped = ref(false);
const isLoading = ref(false);
let refreshTimer: number | undefined;
let telemetryHistoryRequestId = 0;

const filters = ref({
  intervalMinutes: "15" as ChartInterval
});

const intervalOptions = computed<Array<{ label: string; value: ChartInterval }>>(() => [
  { label: t("charts.everyMinutes", { minutes: formatDataCount(15) }), value: "15" },
  { label: t("charts.everyMinutes", { minutes: formatDataCount(60) }), value: "60" }
]);
const chartXAxisGrid = {
  display: false,
  drawBorder: false,
  drawTicks: false
};
const chartYAxisGrid = {
  borderDash: [5, 5],
  color: "rgba(226, 232, 240, 0.6)",
  drawBorder: false,
  drawTicks: false
};

const orderedHistoryItems = computed(() => [...historyItems.value].sort((left, right) => {
  return new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime();
}));

const filteredHistoryItems = computed(() => {
  const { endTime, startTime } = historyWindow.value;

  return orderedHistoryItems.value.filter((item) => {
    const timestamp = Date.parse(item.receivedAt);
    return Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
  });
});

const deviceSummaries = computed<DeviceSummary[]>(() => {
  const grouped = new Map<string, TelemetryHistoryItem[]>();

  for (const item of filteredHistoryItems.value) {
    grouped.set(item.deviceUid, [...(grouped.get(item.deviceUid) ?? []), item]);
  }

  return Array.from(grouped.entries())
    .map(([deviceUid, rows]) => {
      const metricKeys = Array.from(new Set(rows.flatMap((row) => row.metricKeys)))
        .filter((metricKey) => hasNumericValue(rows, metricKey))
        .sort((left, right) => getMetricLabel(left).localeCompare(getMetricLabel(right)));
      const lastSeenAt = rows[rows.length - 1]?.receivedAt ?? "";

      return {
        deviceUid,
        lastSeenAt,
        metricKeys
      };
    })
    .filter((device) => device.metricKeys.length > 0)
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
});

const deviceOptions = computed<DeviceOption[]>(() => {
  const registeredDevices = devices.value.map((device) => ({
    deviceUid: device.deviceUid,
    label: device.displayName ? `${device.displayName} / ${device.deviceUid}` : device.deviceUid
  }));
  const registeredUids = new Set(registeredDevices.map((device) => device.deviceUid));
  const historyDevices = deviceSummaries.value
    .filter((device) => !registeredUids.has(device.deviceUid))
    .map((device) => ({
      deviceUid: device.deviceUid,
      label: device.deviceUid
    }));

  return [...registeredDevices, ...historyDevices]
    .sort((left, right) => left.label.localeCompare(right.label));
});

const selectedDeviceRows = computed(() => filteredHistoryItems.value.filter((item) => item.deviceUid === activeDeviceUid.value));
const selectedRegisteredDevice = computed(() => devices.value.find((device) => device.deviceUid === activeDeviceUid.value) ?? null);
const selectedPlot = computed(() => plots.value.find((plot) => plot.id === selectedRegisteredDevice.value?.plotId) ?? null);
const selectedCrop = computed(() => crops.value.find((crop) => crop.id === selectedPlot.value?.cropId) ?? null);
const selectedMetricKeys = computed(() => {
  return Array.from(new Set(selectedDeviceRows.value.flatMap((row) => row.metricKeys)))
    .filter((metricKey) => hasNumericValue(selectedDeviceRows.value, metricKey))
    .sort((left, right) => getMetricLabel(left).localeCompare(getMetricLabel(right)));
});

const chartCards = computed<MetricChartCard[]>(() => selectedMetricKeys.value.map((metricKey, index) => {
  const points = sampleMetricPoints(selectedDeviceRows.value, metricKey);
  const color = colorForMetric(metricKey, index);
  const threshold = thresholdForMetric(metricKey);
  const unitLabel = metricUnitLabel(metricKey, threshold?.unit ?? null);

  return {
    id: `${activeDeviceUid.value}:${metricKey}`,
    label: getMetricLabel(metricKey),
    color,
    chartData: createChartData(points, color, threshold),
    chartOptions: createChartOptions(metricKey, color, threshold),
    currentValueLabel: formatCurrentMetricValue(points, unitLabel),
    pointCount: points.length,
    thresholdLabel: formatThresholdLabel(threshold, metricKey),
    unitLabel
  };
}));

const selectedIntervalLabel = computed(() => intervalOptions.value.find((option) => option.value === filters.value.intervalMinutes)?.label ?? t("charts.everyMinutes", { minutes: formatDataCount(15) }));
const chartRangeLabel = computed(() => t("charts.lastHours", { hours: formatDataCount(chartHistoryWindowMs / 3_600_000) }));
const errorMessage = computed(() => chartError.value
  ? chartError.value.fallback ?? t(chartError.value.key, chartError.value.params ?? {})
  : null);
const infoMessage = computed(() => isHistoryCapped.value
  ? t("charts.dataCapped", {
      count: formatDataCount(telemetryHistoryMaxRows),
      hours: formatDataCount(chartHistoryWindowMs / 3_600_000)
    })
  : null);

onMounted(() => {
  void initializeChart();
  refreshTimer = window.setInterval(() => {
    void refreshTelemetryHistory();
  }, 30_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
});

watch(deviceOptions, (options) => {
  if (options.length === 0) {
    activeDeviceUid.value = "";
    return;
  }

  if (!activeDeviceUid.value || !options.some((option) => option.deviceUid === activeDeviceUid.value)) {
    activeDeviceUid.value = options[0]?.deviceUid ?? "";
  }
}, {
  immediate: true
});

watch(activeDeviceUid, () => {
  void refreshTelemetryHistory();
});

async function initializeChart(): Promise<void> {
  await Promise.all([
    deviceStore.fetchDevices(),
    masterDataStore.fetchCrops(),
    masterDataStore.fetchPlots()
  ]);
  await refreshTelemetryHistory();
}

async function refreshTelemetryHistory(): Promise<void> {
  const requestId = ++telemetryHistoryRequestId;
  const historyRequest = createTelemetryHistoryRequest();

  isLoading.value = true;
  chartError.value = null;
  isHistoryCapped.value = false;

  try {
    const result = await fetchTelemetryHistoryItems(historyRequest);

    if (requestId !== telemetryHistoryRequestId) {
      return;
    }

    historyItems.value = result.items;

    isHistoryCapped.value = result.isCapped;
  } catch (error) {
    if (requestId === telemetryHistoryRequestId) {
      chartError.value = normalizeError(error);
    }
  } finally {
    if (requestId === telemetryHistoryRequestId) {
      isLoading.value = false;
    }
  }
}

async function fetchTelemetryHistoryItems(historyRequest: TelemetryHistoryRequest): Promise<{
  isCapped: boolean;
  items: TelemetryHistoryItem[];
}> {
  const items: TelemetryHistoryItem[] = [];

  for (let offset = 0; offset < telemetryHistoryMaxRows; offset += telemetryHistoryPageSize) {
    const response = await apiGet<TelemetryHistoryResponse>(buildTelemetryHistoryUrl(historyRequest, offset));
    items.push(...response.items);

    if (response.items.length < telemetryHistoryPageSize) {
      break;
    }
  }

  return {
    isCapped: items.length >= telemetryHistoryMaxRows,
    items
  };
}

function createTelemetryHistoryRequest(): TelemetryHistoryRequest {
  const nextWindow = createTelemetryHistoryWindow();
  historyWindow.value = nextWindow;

  return {
    deviceUid: activeDeviceUid.value,
    ...nextWindow
  };
}

function buildTelemetryHistoryUrl(historyRequest: TelemetryHistoryRequest, offset = 0): string {
  const params = new URLSearchParams({
    end: historyRequest.endIso,
    limit: String(telemetryHistoryPageSize),
    offset: String(offset),
    start: historyRequest.startIso
  });

  if (historyRequest.deviceUid) {
    params.set("deviceId", historyRequest.deviceUid);
  }

  return `/api/v1/telemetry/history?${params.toString()}`;
}

function sampleMetricPoints(rows: TelemetryHistoryItem[], metricKey: string): MetricPoint[] {
  const intervalMs = Number(filters.value.intervalMinutes) * 60_000;
  const sampledByBucket = new Map<number, MetricPoint>();

  for (const row of rows) {
    const timestamp = Date.parse(row.receivedAt);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const value = coerceNumericValue(readMetricValue(row.payload, metricKey));
    if (value === null) {
      continue;
    }

    const bucket = Math.floor(timestamp / intervalMs);
    const existing = sampledByBucket.get(bucket);

    if (!existing || timestamp >= Date.parse(existing.timestamp)) {
      sampledByBucket.set(bucket, {
        timestamp: row.receivedAt,
        value
      });
    }
  }

  return Array.from(sampledByBucket.values()).sort((left, right) => {
    return Date.parse(left.timestamp) - Date.parse(right.timestamp);
  });
}

function createTelemetryHistoryWindow(): TelemetryHistoryWindow {
  const endTime = Date.now();
  const startTime = endTime - chartHistoryWindowMs;

  return {
    endIso: new Date(endTime).toISOString(),
    endTime,
    startIso: new Date(startTime).toISOString(),
    startTime
  };
}

function createChartData(points: MetricPoint[], color: string, threshold: MetricThreshold | null): ChartData<"line", Array<number | null>, string> {
  const labels = points.map((point) => formatChartTime(point.timestamp));
  const datasets: ChartData<"line", Array<number | null>, string>["datasets"] = [
    {
      backgroundColor: (context) => createMetricChartGradient(context, color),
      borderCapStyle: "round",
      borderColor: color,
      borderJoinStyle: "round",
      borderWidth: 3,
      data: points.map((point) => point.value),
      fill: true,
      label: t("charts.actual"),
      pointHoverBackgroundColor: "#ffffff",
      pointHoverBorderColor: color,
      pointHoverBorderWidth: 3,
      pointHoverRadius: 6,
      pointRadius: 0,
      spanGaps: true,
      tension: 0.4
    }
  ];

  if (threshold && threshold.min !== null) {
    datasets.push(createThresholdDataset(t("charts.lowThreshold"), threshold.min, "#f59e0b", labels.length));
  }

  if (threshold && threshold.max !== null) {
    datasets.push(createThresholdDataset(t("charts.highThreshold"), threshold.max, "#f43f5e", labels.length));
  }

  return {
    labels,
    datasets
  };
}

function createChartOptions(metricKey: string, color: string, threshold: MetricThreshold | null): ChartOptions<"line"> {
  return {
    maintainAspectRatio: false,
    responsive: true,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      legend: {
        display: threshold !== null,
        labels: {
          boxHeight: 3,
          boxWidth: 24,
          color: "#94a3b8",
          font: {
            weight: 500
          },
          usePointStyle: false
        }
      },
      title: {
        color: "#0f172a",
        display: true,
        font: {
          size: 13,
          weight: 600
        },
        padding: {
          bottom: 12
        },
        text: t("charts.chartForMetric", { metric: getMetricLabel(metricKey) })
      },
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: withAlpha(color, 0.24),
        borderWidth: 1,
        bodyColor: "#475569",
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const label = context.dataset.label ?? getMetricLabel(metricKey);
            return `${label}: ${value === null ? t("format.nullValue") : formatMetricValue(value, metricUnitLabel(metricKey, threshold?.unit ?? null))}`;
          }
        },
        displayColors: true,
        padding: 12,
        titleColor: "#0f172a"
      }
    },
    scales: {
      x: {
        border: {
          display: false
        },
        grid: chartXAxisGrid,
        ticks: {
          color: "#94a3b8",
          font: {
            weight: 500
          },
          maxRotation: 0
        },
        title: {
          color: "#94a3b8",
          display: true,
          font: {
            weight: 600
          },
          text: t("charts.timeAxis")
        }
      },
      y: {
        border: {
          display: false
        },
        grid: chartYAxisGrid,
        ticks: {
          color: "#94a3b8",
          callback: (value) => typeof value === "number" ? formatNumber(value, { maximumFractionDigits: 2 }) : String(value),
          font: {
            weight: 500
          }
        },
        title: {
          color: "#94a3b8",
          display: true,
          font: {
            weight: 600
          },
          text: axisLabel(metricKey, threshold?.unit ?? null)
        }
      }
    }
  };
}

function formatCurrentMetricValue(points: MetricPoint[], unit: string): string {
  const latestPoint = [...points].reverse().find((point) => point.value !== null);
  return latestPoint?.value === null || latestPoint?.value === undefined ? t("format.nullValue") : formatMetricValue(latestPoint.value, unit);
}

function createMetricChartGradient(context: ScriptableContext<"line">, color: string): string | CanvasGradient {
  const { chart } = context;
  const { chartArea, ctx } = chart;

  if (!chartArea) {
    return withAlpha(color, 0.12);
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, withAlpha(color, 0.2));
  gradient.addColorStop(0.62, withAlpha(color, 0.08));
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  return gradient;
}

function createThresholdDataset(label: string, value: number, color: string, pointCount: number): ChartData<"line", Array<number | null>, string>["datasets"][number] {
  return {
    backgroundColor: "transparent",
    borderColor: withAlpha(color, 0.7),
    borderDash: [7, 5],
    borderWidth: 1.25,
    data: Array.from({ length: pointCount }, () => value),
    fill: false,
    label,
    pointRadius: 0,
    pointHitRadius: 0,
    pointHoverRadius: 0,
    tension: 0
  };
}

function hasNumericValue(rows: TelemetryHistoryItem[], metricKey: string): boolean {
  return rows.some((row) => coerceNumericValue(readMetricValue(row.payload, metricKey)) !== null);
}

function thresholdForMetric(metricKey: string): MetricThreshold | null {
  const thresholdKey = thresholdKeyForMetric(metricKey);
  if (!thresholdKey) {
    return null;
  }

  const range = selectedCrop.value?.thresholds[thresholdKey];
  if (!range) {
    return null;
  }

  const min = normalizeThresholdValue(range.min);
  const max = normalizeThresholdValue(range.max);

  if (min === null && max === null) {
    return null;
  }

  return {
    max,
    min,
    unit: range.unit
  };
}

function thresholdKeyForMetric(metricKey: string): ThresholdKey | null {
  const normalized = normalizeMetricKey(metricKey);

  if (normalized === "ph") return "ph";
  if (normalized === "nitrogen") return "nitrogen";
  if (normalized === "phosphorus") return "phosphorus";
  if (normalized === "potassium") return "potassium";
  if (normalized === "moisture") return "moisture";

  return null;
}

function normalizeThresholdValue(value: ThresholdRange["min"]): number | null {
  if (value === null) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatThresholdLabel(threshold: MetricThreshold | null, metricKey: string): string | null {
  if (!threshold) {
    return null;
  }

  const unit = metricUnitLabel(metricKey, threshold.unit);
  const parts: string[] = [];

  if (threshold.min !== null) {
    parts.push(`${t("charts.lowThreshold")} ${formatMetricValue(threshold.min, unit)}`);
  }

  if (threshold.max !== null) {
    parts.push(`${t("charts.highThreshold")} ${formatMetricValue(threshold.max, unit)}`);
  }

  return parts.length === 2
    ? t("charts.thresholdRange", { high: parts[1], low: parts[0] })
    : parts.join("");
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

  const metricPath = metricKey.replace(/^metrics\./, "");
  return unwrapMetricValue(readNestedValue(metrics, metricPath));
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

function coerceNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function pointCountLabel(count: number): string {
  return tn("charts.dataPoints", count, {
    count: formatDataCount(count)
  });
}

function metricUnitLabel(metricKey: string, sourceUnit?: string | null): string {
  const unit = sourceUnit === "range" ? "" : getMetricUnit(metricKey, sourceUnit);
  return unit || t("charts.noUnit");
}

function axisLabel(metricKey: string, sourceUnit?: string | null): string {
  const unit = metricUnitLabel(metricKey, sourceUnit);
  return unit === t("charts.noUnit")
    ? t("charts.valueAxis")
    : `${t("charts.valueAxis")} (${unit})`;
}

function formatMetricValue(value: number, unit: string): string {
  const formattedValue = formatNumber(Math.round(value * 100) / 100, {
    maximumFractionDigits: 2
  });

  return unit === t("charts.noUnit") ? formattedValue : `${formattedValue} ${unit}`;
}

function formatChartTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const spansMultipleDates = !isSameLocalDate(historyWindow.value.startTime, historyWindow.value.endTime);
  if (spansMultipleDates) {
    return formatLocalizedDateTime(date, {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short"
    });
  }

  return formatLocalizedDateTime(date, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isSameLocalDate(leftTime: number, rightTime: number): boolean {
  const left = new Date(leftTime);
  const right = new Date(rightTime);

  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function colorForMetric(key: string, index: number): string {
  const palette = ["#10b981", "#14b8a6"];
  const hash = Array.from(key).reduce((total, character) => total + character.charCodeAt(0), index);

  return palette[hash % palette.length] ?? "#10b981";
}

function withAlpha(hexColor: string, alpha: number): string {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normalizeError(error: unknown): ChartMessage {
  if (error instanceof ApiClientError) {
    return error.status === 401
      ? { key: "charts.sessionExpired" }
      : { fallback: error.message, key: "charts.loadFailed" };
  }

  if (error instanceof TypeError) {
    return { key: "charts.telemetryUnavailable" };
  }

  return { key: "charts.loadFailed" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>
