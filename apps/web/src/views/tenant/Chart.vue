<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-3">
      <article class="panel-surface p-5">
        <p class="text-sm font-medium text-slate-400">Detected Metrics</p>
        <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ metricCards.length }}</p>
        <p class="mt-3 text-sm text-field-mint">Generated from MQTT payload keys</p>
      </article>

      <article class="panel-surface p-5">
        <p class="text-sm font-medium text-slate-400">History Window</p>
        <p class="mt-2 text-3xl font-semibold tracking-normal text-white">18 samples</p>
        <p class="mt-3 text-sm text-field-green">Mocked until API history is connected</p>
      </article>

      <article class="panel-surface p-5">
        <p class="text-sm font-medium text-slate-400">MQTT Stream</p>
        <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ telemetryStore.connectionState }}</p>
        <p class="mt-3 text-sm text-sky-200">{{ telemetryStore.subscriptionTopic }}</p>
      </article>
    </section>

    <section class="panel-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-white">Grafik Telemetry Dinamis</h2>
          <p class="mt-1 text-sm text-slate-400">Setiap field sensor yang terdeteksi otomatis menjadi seri grafik.</p>
        </div>
        <div class="flex items-center gap-2 rounded-full border border-field-mint/25 bg-field-mint/10 px-3 py-1 text-sm text-field-mint">
          <span class="h-2 w-2 rounded-full" :class="telemetryStore.isConnected ? 'bg-field-mint' : 'bg-amber-200'"></span>
          {{ telemetryStore.onlineDeviceCount }} live nodes
        </div>
      </div>
    </section>

    <section v-if="metricCards.length > 0" class="grid gap-5 xl:grid-cols-2">
      <article v-for="card in metricCards" :key="card.id" class="panel-surface overflow-hidden">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h3 class="text-base font-semibold tracking-normal text-white">{{ card.label }}</h3>
            <p class="mt-1 text-xs text-slate-400">{{ card.source }}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-semibold tracking-normal" :style="{ color: card.color }">{{ card.latestDisplay }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ card.unitLabel }}</p>
          </div>
        </div>

        <div class="h-[280px] p-4">
          <Line :data="card.chartData" :options="card.chartOptions" />
        </div>

        <div class="grid grid-cols-3 gap-3 border-t border-white/10 p-5 text-sm">
          <div>
            <p class="text-xs text-slate-400">Min</p>
            <p class="mt-1 font-semibold text-white">{{ card.minimum }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400">Avg</p>
            <p class="mt-1 font-semibold text-white">{{ card.average }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400">Max</p>
            <p class="mt-1 font-semibold text-white">{{ card.maximum }}</p>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="panel-surface p-8 text-center">
      <LineChart class="mx-auto h-10 w-10 text-field-mint" />
      <h2 class="mt-4 text-lg font-semibold tracking-normal text-white">Belum ada metrik telemetry</h2>
      <p class="mt-2 text-sm text-slate-400">Menunggu payload MQTT JSON pertama dari perangkat tenant.</p>
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
import { LineChart } from "@lucide/vue";
import { computed, onMounted, ref, watch } from "vue";
import { useTelemetryStore, type DynamicMetric, type TelemetryValue } from "../../stores/telemetryStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, Title, Tooltip);

interface HistoryPoint {
  timestamp: string;
  value: number | null;
}

interface MetricChartCard {
  id: string;
  label: string;
  source: string;
  color: string;
  latestDisplay: string;
  unitLabel: string;
  minimum: string;
  average: string;
  maximum: string;
  chartData: ChartData<"line", Array<number | null>, string>;
  chartOptions: ChartOptions<"line">;
}

const telemetryStore = useTelemetryStore();
const historyByMetric = ref<Record<string, HistoryPoint[]>>({});

const latestMetricRows = computed(() => telemetryStore.latestMetrics.slice(0, 12));
const metricSignature = computed(() => latestMetricRows.value
  .map((metric) => `${metric.source}:${metric.key}:${metric.updatedAt}:${metric.displayValue}`)
  .join("|"));

const metricCards = computed<MetricChartCard[]>(() => latestMetricRows.value.map((metric, index) => {
  const id = metricIdentity(metric);
  const history = historyByMetric.value[id] ?? createMockHistory(metric, index);
  const values = history
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number");
  const color = colorForMetric(metric.key, index);

  return {
    id,
    label: metric.label,
    source: metric.source,
    color,
    latestDisplay: metric.displayValue,
    unitLabel: metric.unit || metric.valueType,
    minimum: formatStatistic(Math.min(...values), metric.unit, values.length),
    average: formatStatistic(average(values), metric.unit, values.length),
    maximum: formatStatistic(Math.max(...values), metric.unit, values.length),
    chartData: {
      labels: history.map((point) => formatChartTime(point.timestamp)),
      datasets: [
        {
          data: history.map((point) => point.value),
          borderColor: color,
          backgroundColor: withAlpha(color, 0.14),
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: color,
          pointBorderColor: "#07111f",
          pointBorderWidth: 2,
          pointRadius: 3,
          spanGaps: true,
          tension: 0.38
        }
      ]
    },
    chartOptions: createChartOptions(metric, color)
  };
}));

onMounted(() => {
  telemetryStore.seedMockTelemetry();
  telemetryStore.connect();
  syncMetricHistory();
});

watch(metricSignature, () => {
  syncMetricHistory();
}, {
  immediate: true
});

function syncMetricHistory(): void {
  const nextHistory = { ...historyByMetric.value };

  latestMetricRows.value.forEach((metric, index) => {
    const id = metricIdentity(metric);
    const numericValue = coerceNumericValue(metric.value);
    const existingHistory = nextHistory[id] ?? createMockHistory(metric, index);
    const latestPoint = existingHistory[existingHistory.length - 1];

    if (numericValue !== null && latestPoint?.timestamp !== metric.updatedAt) {
      nextHistory[id] = [
        ...existingHistory,
        {
          timestamp: metric.updatedAt,
          value: numericValue
        }
      ].slice(-18);
    } else {
      nextHistory[id] = existingHistory.slice(-18);
    }
  });

  historyByMetric.value = nextHistory;
}

function createMockHistory(metric: DynamicMetric, index: number): HistoryPoint[] {
  const baseValue = coerceNumericValue(metric.value);
  const observedAt = Date.parse(metric.updatedAt);
  const endTime = Number.isFinite(observedAt) ? observedAt : Date.now();

  return Array.from({ length: 18 }, (_, pointIndex) => {
    const timestamp = new Date(endTime - (17 - pointIndex) * 15 * 60 * 1000).toISOString();
    if (baseValue === null) {
      return {
        timestamp,
        value: null
      };
    }

    const wave = Math.sin((pointIndex + index) / 2.4) * (Math.abs(baseValue) * 0.055 + 0.45);
    const drift = (pointIndex - 8) * (0.02 + index * 0.006);

    return {
      timestamp,
      value: roundMetricValue(baseValue + wave + drift)
    };
  });
}

function createChartOptions(metric: DynamicMetric, color: string): ChartOptions<"line"> {
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
        borderColor: withAlpha(color, 0.4),
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${metric.label}: ${Number.isFinite(value) ? `${value} ${metric.unit}`.trim() : "-"}`;
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

function metricIdentity(metric: DynamicMetric): string {
  return `${metric.source}:${metric.key}`;
}

function coerceNumericValue(value: TelemetryValue): number | null {
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

function average(values: number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatStatistic(value: number, unit: string, sampleCount: number): string {
  if (sampleCount === 0 || !Number.isFinite(value)) {
    return "-";
  }

  return `${roundMetricValue(value)} ${unit}`.trim();
}

function roundMetricValue(value: number): number {
  return Math.round(value * 100) / 100;
}
</script>
