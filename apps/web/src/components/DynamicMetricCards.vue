<template>
  <div v-if="visibleReadings.length" class="metric-card-grid" :class="{ wide }">
    <article v-for="reading in visibleReadings" :key="reading.metric" class="metric-card" :class="metricToneClass(reading.metric)">
      <div>
        <span>{{ formatMetricName(reading.metric) }}</span>
        <small>{{ reading.node_id }} / {{ reading.value_type }}</small>
      </div>
      <strong>{{ formatTelemetryValue(reading) }}</strong>
      <div class="progress-track"><span :style="{ width: metricProgress(reading) }"></span></div>
    </article>
  </div>
  <p v-else class="empty-state">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TelemetryReadingPayload } from "../api.js";

const props = withDefaults(defineProps<{
  readings: TelemetryReadingPayload[];
  emptyText?: string;
  limit?: number;
  wide?: boolean;
}>(), {
  emptyText: "Belum ada telemetry.",
  limit: 8,
  wide: false
});

const visibleReadings = computed(() => props.readings.slice(0, props.limit));

function formatMetricName(metric: string): string {
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

function metricToneClass(metric: string): string {
  if (metric.includes("ph")) {
    return "tone-amber";
  }

  if (metric.includes("nitrogen")) {
    return "tone-green";
  }

  if (metric.includes("phosphorus")) {
    return "tone-blue";
  }

  if (metric.includes("potassium")) {
    return "tone-rose";
  }

  if (metric.includes("temperature")) {
    return "tone-coral";
  }

  if (metric.includes("conductivity") || metric.includes("ec")) {
    return "tone-teal";
  }

  return "tone-green";
}

function metricProgress(reading: TelemetryReadingPayload): string {
  if (typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
    return "12%";
  }

  const metric = reading.metric;
  let maximum = 100;

  if (metric.includes("ph")) {
    maximum = 14;
  } else if (metric.includes("temperature")) {
    maximum = 45;
  } else if (metric.includes("nitrogen") || metric.includes("phosphorus") || metric.includes("potassium")) {
    maximum = 200;
  } else if (metric.includes("conductivity") || metric.includes("ec")) {
    maximum = 2000;
  }

  const ratio = Math.max(8, Math.min(100, (reading.value / maximum) * 100));
  return `${ratio}%`;
}
</script>
