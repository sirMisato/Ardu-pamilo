<template>
  <div class="space-y-5">
    <section class="panel-surface p-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,2fr)_repeat(3,minmax(150px,1fr))_auto] xl:items-end">
        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <TabletSmartphone class="h-4 w-4 text-field-mint" />
            Nama Device
          </span>
          <select
            v-model="activeDeviceUid"
            aria-label="Nama Device"
            class="min-h-12 w-full rounded-lg border border-white/10 bg-[#07111f] px-4 text-sm text-white outline-none transition focus:border-field-mint/70"
          >
            <option v-if="deviceOptions.length === 0" value="">Belum ada device</option>
            <option v-for="device in deviceOptions" :key="device.deviceUid" :value="device.deviceUid">
              {{ device.label }}
            </option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <CalendarDays class="h-4 w-4 text-field-green" />
            Start Date
          </span>
          <input
            v-model="filters.startDate"
            class="min-h-12 w-full rounded-lg border border-white/10 bg-[#07111f] px-4 text-sm text-white outline-none transition focus:border-field-mint/70"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <CalendarDays class="h-4 w-4 text-sky-200" />
            End Date
          </span>
          <input
            v-model="filters.endDate"
            class="min-h-12 w-full rounded-lg border border-white/10 bg-[#07111f] px-4 text-sm text-white outline-none transition focus:border-field-mint/70"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock class="h-4 w-4 text-amber-200" />
            Interval
          </span>
          <select
            v-model="filters.intervalMinutes"
            class="min-h-12 w-full rounded-lg border border-white/10 bg-[#07111f] px-4 text-sm text-white outline-none transition focus:border-field-mint/70"
          >
            <option v-for="option in intervalOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <button
          type="button"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-field-mint/25 bg-field-mint/10 px-5 text-sm font-semibold text-field-mint transition hover:bg-field-mint hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isLoading"
          @click="refreshTelemetryHistory"
        >
          <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
          {{ isLoading ? "Memuat..." : "Refresh" }}
        </button>
      </div>

      <p v-if="errorMessage" class="mt-4 rounded-lg border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
        {{ errorMessage }}
      </p>
    </section>

    <section v-if="chartCards.length > 0" class="grid gap-5 xl:grid-cols-2">
      <article v-for="card in chartCards" :key="card.id" class="panel-surface overflow-hidden">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h3 class="text-base font-semibold tracking-normal text-white">{{ card.label }}</h3>
            <p class="mt-1 text-xs text-slate-400">{{ selectedIntervalLabel }} / {{ card.pointCount }} points</p>
          </div>
          <span class="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">{{ chartRangeLabel }}</span>
        </div>

        <div class="h-[310px] p-4">
          <Line :data="card.chartData" :options="card.chartOptions" />
        </div>
      </article>
    </section>

    <section v-else class="panel-surface p-8 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-field-mint/25 bg-field-mint/10">
        <span class="h-5 w-5 rounded-full bg-field-mint shadow-[0_0_24px_rgba(142,240,202,0.45)]"></span>
      </div>
      <h2 class="mt-4 text-lg font-semibold tracking-normal text-white">Belum ada parameter numerik</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm text-slate-400">
        Menunggu parameter numerik dari device terpilih.
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
  type ChartOptions
} from "chart.js";
import { CalendarDays, Clock, RefreshCw, TabletSmartphone } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { Line } from "vue-chartjs";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ApiClientError, apiGet } from "../../services/apiClient";
import { useDeviceStore } from "../../stores/deviceStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, Title, Tooltip);

type TelemetryPayload = Record<string, unknown>;
type ChartInterval = "5" | "15" | "60";

interface TelemetryHistoryResponse {
  count: number;
  items: TelemetryHistoryItem[];
  metricKey: string | null;
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
  pointCount: number;
}

interface MetricPoint {
  timestamp: string;
  value: number | null;
}

const today = new Date();
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(today.getDate() - 3);

const deviceStore = useDeviceStore();
const { devices } = storeToRefs(deviceStore);
const activeDeviceUid = ref("");
const errorMessage = ref<string | null>(null);
const historyItems = ref<TelemetryHistoryItem[]>([]);
const isLoading = ref(false);
let refreshTimer: number | undefined;

const filters = ref({
  endDate: toInputDate(today),
  intervalMinutes: "15" as ChartInterval,
  startDate: toInputDate(threeDaysAgo)
});

const intervalOptions: Array<{ label: string; value: ChartInterval }> = [
  { label: "Per 5 menit", value: "5" },
  { label: "Per 15 menit", value: "15" },
  { label: "Per jam", value: "60" }
];

const orderedHistoryItems = computed(() => [...historyItems.value].sort((left, right) => {
  return new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime();
}));

const filteredHistoryItems = computed(() => {
  const { endDate, startDate } = normalizedDateRange();
  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T23:59:59.999`);

  return orderedHistoryItems.value.filter((item) => {
    const timestamp = Date.parse(item.receivedAt);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
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
        .sort((left, right) => formatMetricLabel(left).localeCompare(formatMetricLabel(right)));
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
const selectedMetricKeys = computed(() => {
  return Array.from(new Set(selectedDeviceRows.value.flatMap((row) => row.metricKeys)))
    .filter((metricKey) => hasNumericValue(selectedDeviceRows.value, metricKey))
    .sort((left, right) => formatMetricLabel(left).localeCompare(formatMetricLabel(right)));
});

const chartCards = computed<MetricChartCard[]>(() => selectedMetricKeys.value.map((metricKey, index) => {
  const points = sampleMetricPoints(selectedDeviceRows.value, metricKey);
  const color = colorForMetric(metricKey, index);

  return {
    id: `${activeDeviceUid.value}:${metricKey}`,
    label: formatMetricLabel(metricKey),
    color,
    chartData: createChartData(points, color),
    chartOptions: createChartOptions(metricKey, color),
    pointCount: points.length
  };
}));

const selectedIntervalLabel = computed(() => intervalOptions.find((option) => option.value === filters.value.intervalMinutes)?.label ?? "Per 15 menit");
const chartRangeLabel = computed(() => {
  const { endDate, startDate } = normalizedDateRange();
  return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
});

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

watch(() => [filters.value.startDate, filters.value.endDate, activeDeviceUid.value], () => {
  void refreshTelemetryHistory();
});

async function initializeChart(): Promise<void> {
  await deviceStore.fetchDevices();
  await refreshTelemetryHistory();
}

async function refreshTelemetryHistory(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await apiGet<TelemetryHistoryResponse>(buildTelemetryHistoryUrl());
    historyItems.value = response.items;
  } catch (error) {
    errorMessage.value = normalizeError(error);
  } finally {
    isLoading.value = false;
  }
}

function buildTelemetryHistoryUrl(): string {
  const { endDate, startDate } = normalizedDateRange();
  const params = new URLSearchParams({
    end: endOfDayIso(endDate),
    limit: "1000",
    start: startOfDayIso(startDate)
  });

  if (activeDeviceUid.value) {
    params.set("deviceId", activeDeviceUid.value);
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

function normalizedDateRange(): { endDate: string; startDate: string } {
  const startDate = isInputDate(filters.value.startDate) ? filters.value.startDate : toInputDate(threeDaysAgo);
  const endDate = isInputDate(filters.value.endDate) ? filters.value.endDate : toInputDate(today);

  return startDate <= endDate
    ? { endDate, startDate }
    : { endDate: startDate, startDate: endDate };
}

function isInputDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDayIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

function endOfDayIso(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function createChartData(points: MetricPoint[], color: string): ChartData<"line", Array<number | null>, string> {
  return {
    labels: points.map((point) => formatChartTime(point.timestamp)),
    datasets: [
      {
        backgroundColor: withAlpha(color, 0.14),
        borderColor: color,
        borderWidth: 2,
        data: points.map((point) => point.value),
        fill: true,
        pointBackgroundColor: color,
        pointBorderColor: "#07111f",
        pointBorderWidth: 2,
        pointRadius: 3,
        spanGaps: true,
        tension: 0.34
      }
    ]
  };
}

function createChartOptions(metricKey: string, color: string): ChartOptions<"line"> {
  return {
    maintainAspectRatio: false,
    responsive: true,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: "#07111f",
        borderColor: withAlpha(color, 0.45),
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${formatMetricLabel(metricKey)}: ${value === null ? "-" : formatValue(value)}`;
          }
        },
        displayColors: false,
        titleColor: "#ecfff7",
        bodyColor: "#cbd5e1"
      }
    },
    scales: {
      x: {
        border: {
          color: "rgba(255, 255, 255, 0.12)"
        },
        grid: {
          color: "rgba(255, 255, 255, 0.06)"
        },
        ticks: {
          color: "#94a3b8",
          maxRotation: 0
        }
      },
      y: {
        border: {
          color: "rgba(255, 255, 255, 0.12)"
        },
        grid: {
          color: "rgba(142, 240, 202, 0.07)"
        },
        ticks: {
          color: "#94a3b8"
        }
      }
    }
  };
}

function hasNumericValue(rows: TelemetryHistoryItem[], metricKey: string): boolean {
  return rows.some((row) => coerceNumericValue(readMetricValue(row.payload, metricKey)) !== null);
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

function formatMetricLabel(metricKey: string): string {
  return metricKey
    .replace(/^metrics\./, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2
  }).format(Math.round(value * 100) / 100);
}

function formatChartTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const { endDate, startDate } = normalizedDateRange();
  if (startDate !== endDate) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short"
    }).format(date);
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function colorForMetric(key: string, index: number): string {
  const palette = ["#8ef0ca", "#a7e8af", "#7dd3fc", "#fde68a", "#67e8f9", "#bef264", "#c4b5fd", "#6ee7b7"];
  const hash = Array.from(key).reduce((total, character) => total + character.charCodeAt(0), index);

  return palette[hash % palette.length] ?? "#8ef0ca";
}

function withAlpha(hexColor: string, alpha: number): string {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.status === 401
      ? "Sesi login berakhir. Silakan login ulang untuk melihat grafik telemetry."
      : error.message;
  }

  if (error instanceof TypeError) {
    return "API telemetry belum dapat dihubungi.";
  }

  return "Gagal mengambil history telemetry MQTT.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>
