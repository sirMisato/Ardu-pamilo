<template>
  <div class="space-y-5">
    <section class="panel-surface p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <select
          v-model="activeTopic"
          aria-label="Topic MQTT"
          class="min-h-12 flex-1 rounded-lg border border-white/10 bg-[#07111f] px-4 text-sm text-white outline-none transition focus:border-field-mint/70"
        >
          <option v-if="topicSummaries.length === 0" value="">Belum ada topic telemetry</option>
          <option v-for="topic in topicSummaries" :key="topic.topic" :value="topic.topic">
            {{ topic.topic }}
          </option>
        </select>
        <button
          type="button"
          class="inline-flex min-h-12 items-center justify-center rounded-lg border border-field-mint/25 bg-field-mint/10 px-5 text-sm font-semibold text-field-mint transition hover:bg-field-mint hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isLoading"
          @click="refreshTelemetryHistory"
        >
          {{ isLoading ? "Memuat..." : "Refresh" }}
        </button>
      </div>

      <p v-if="errorMessage" class="mt-4 rounded-lg border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
        {{ errorMessage }}
      </p>
    </section>

    <section v-if="chartCards.length > 0" class="grid gap-5 xl:grid-cols-2">
      <article v-for="card in chartCards" :key="card.id" class="panel-surface overflow-hidden">
        <div class="border-b border-white/10 px-5 py-4">
          <h3 class="text-base font-semibold tracking-normal text-white">{{ card.label }}</h3>
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
        Menunggu parameter numerik dari telemetry MQTT.
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
import { Line } from "vue-chartjs";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ApiClientError, apiGet } from "../../services/apiClient";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, Title, Tooltip);

type TelemetryPayload = Record<string, unknown>;

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

interface TopicSummary {
  lastSeenAt: string;
  metricKeys: string[];
  topic: string;
}

interface MetricChartCard {
  id: string;
  label: string;
  color: string;
  chartData: ChartData<"line", Array<number | null>, string>;
  chartOptions: ChartOptions<"line">;
}

interface MetricPoint {
  timestamp: string;
  value: number | null;
}

const activeTopic = ref("");
const errorMessage = ref<string | null>(null);
const historyItems = ref<TelemetryHistoryItem[]>([]);
const isLoading = ref(false);
let refreshTimer: number | undefined;

const orderedHistoryItems = computed(() => [...historyItems.value].sort((left, right) => {
  return new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime();
}));

const topicSummaries = computed<TopicSummary[]>(() => {
  const grouped = new Map<string, TelemetryHistoryItem[]>();

  for (const item of orderedHistoryItems.value) {
    grouped.set(item.topic, [...(grouped.get(item.topic) ?? []), item]);
  }

  return Array.from(grouped.entries())
    .map(([topic, rows]) => {
      const metricKeys = Array.from(new Set(rows.flatMap((row) => row.metricKeys)))
        .filter((metricKey) => hasNumericValue(rows, metricKey))
        .sort((left, right) => formatMetricLabel(left).localeCompare(formatMetricLabel(right)));
      const lastSeenAt = rows[rows.length - 1]?.receivedAt ?? "";

      return {
        lastSeenAt,
        metricKeys,
        topic
      };
    })
    .filter((topic) => topic.metricKeys.length > 0)
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
});

const selectedTopicRows = computed(() => orderedHistoryItems.value.filter((item) => item.topic === activeTopic.value));
const selectedMetricKeys = computed(() => {
  return topicSummaries.value.find((summary) => summary.topic === activeTopic.value)?.metricKeys ?? [];
});

const chartCards = computed<MetricChartCard[]>(() => selectedMetricKeys.value.map((metricKey, index) => {
  const points = selectedTopicRows.value.map((row) => ({
    timestamp: row.receivedAt,
    value: coerceNumericValue(readMetricValue(row.payload, metricKey))
  }));
  const color = colorForMetric(metricKey, index);

  return {
    id: `${activeTopic.value}:${metricKey}`,
    label: formatMetricLabel(metricKey),
    color,
    chartData: createChartData(points, color),
    chartOptions: createChartOptions(metricKey, color)
  };
}));

onMounted(() => {
  void refreshTelemetryHistory();
  refreshTimer = window.setInterval(() => {
    void refreshTelemetryHistory();
  }, 30_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
});

watch(topicSummaries, (summaries) => {
  if (summaries.length === 0) {
    activeTopic.value = "";
    return;
  }

  if (!activeTopic.value || !summaries.some((summary) => summary.topic === activeTopic.value)) {
    activeTopic.value = summaries[0]?.topic ?? "";
  }
}, {
  immediate: true
});

async function refreshTelemetryHistory(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await apiGet<TelemetryHistoryResponse>("/api/v1/telemetry/history?limit=240");
    historyItems.value = response.items;
  } catch (error) {
    errorMessage.value = normalizeError(error);
  } finally {
    isLoading.value = false;
  }
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
