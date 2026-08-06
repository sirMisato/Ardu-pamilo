<template>
  <section class="dynamic-chart-stack">
    <div class="toolbar-row">
      <select :value="selectedMetric" aria-label="Metric history" @change="onMetricChange">
        <option v-for="metric in metricOptions" :key="metric" :value="metric">
          {{ formatMetricName(metric) }}
        </option>
      </select>
      <button class="ghost-button" :disabled="busy" type="button" @click="$emit('refresh')">
        <RefreshCw :size="16" /> Refresh Now
      </button>
      <button class="ghost-button" type="button"><Download :size="16" /> Export CSV</button>
    </div>

    <section class="chart-panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">{{ selectedMetric || "metric" }}</span>
          <h2>{{ formatMetricName(selectedMetric) }} Trend Line</h2>
          <p>{{ selectedHistory ? `${selectedHistory.points.length} sample / ${selectedHistory.resolution}` : "History telemetry pada rentang waktu plot aktif." }}</p>
        </div>
      </div>

      <div v-if="bars.length" class="history-chart">
        <span v-for="bar in bars" :key="bar.key" :style="{ height: bar.height }"></span>
      </div>

      <div v-if="selectedHistory?.points.length" class="history-list">
        <div v-for="point in selectedHistory.points" :key="point.ts + point.metric + point.device_id + point.seq" class="history-row">
          <span>{{ formatTimestamp(point.ts) }}</span>
          <strong>{{ formatTelemetryValue(point) }}</strong>
          <small>{{ point.device_id }} / seq {{ point.seq }}</small>
        </div>
      </div>

      <p v-else class="empty-state">History belum tersedia.</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Download, RefreshCw } from "@lucide/vue";
import type { TelemetryHistoryPayload, TelemetryReadingPayload } from "../api.js";

const props = defineProps<{
  histories: TelemetryHistoryPayload[];
  metricOptions: string[];
  selectedMetric: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  "update:selectedMetric": [metric: string];
  refresh: [];
}>();

const selectedHistory = computed(() =>
  props.histories.find((history) => history.metric === props.selectedMetric) ?? props.histories[0] ?? null
);
const bars = computed(() => {
  const points = selectedHistory.value?.points ?? [];
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 1;
  const span = maximum - minimum || 1;

  return points.map((point) => ({
    key: `${point.device_id}:${point.node_id}:${point.metric}:${point.ts}:${point.seq}`,
    height: typeof point.value === "number" && Number.isFinite(point.value)
      ? `${24 + ((point.value - minimum) / span) * 76}%`
      : "8%"
  }));
});

function onMetricChange(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    emit("update:selectedMetric", target.value);
  }
}

function formatMetricName(metric: string): string {
  if (!metric) {
    return "Metric";
  }

  return metric
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTelemetryValue(reading: TelemetryReadingPayload): string {
  if (reading.value === null) {
    return `null ${reading.unit}`.trim();
  }

  if (typeof reading.value === "number") {
    return `${reading.value.toLocaleString("id-ID", {
      maximumFractionDigits: 2
    })} ${reading.unit}`.trim();
  }

  if (typeof reading.value === "boolean") {
    return `${reading.value ? "true" : "false"} ${reading.unit}`.trim();
  }

  return `${reading.value} ${reading.unit}`.trim();
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
</script>
