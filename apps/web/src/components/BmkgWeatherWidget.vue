<template>
  <article class="overview-card weather-overview">
    <div class="section-heading">
      <div>
        <span class="eyebrow">Weather intelligence</span>
        <h2>BMKG Forecast</h2>
        <p>{{ label }}</p>
      </div>
      <button v-if="showManage" class="link-button" type="button" @click="$emit('open-weather')">
        Manage <ArrowRight :size="16" />
      </button>
    </div>

    <div v-if="weather && weather.forecast.length" class="weather-dashboard">
      <div class="station-card">
        <div class="station-title">
          <CloudSun :size="22" />
          <div>
            <strong>{{ current.weather_desc }}</strong>
            <span>{{ plotName }}</span>
          </div>
        </div>
        <dl class="station-metrics">
          <div>
            <dt>Temperature</dt>
            <dd>{{ formatTemperature(current.temperature_c) }}</dd>
          </div>
          <div>
            <dt>Humidity</dt>
            <dd>{{ formatNullableNumber(current.humidity_pct, "%") }}</dd>
          </div>
          <div>
            <dt>Rainfall</dt>
            <dd>{{ formatNullableNumber(current.rainfall_mm, "mm") }}</dd>
          </div>
        </dl>
        <small>{{ weather.attribution }} / {{ weather.cache_status }} / {{ weather.fetched_at ? formatTimestamp(weather.fetched_at) : "-" }}</small>
      </div>

      <div class="forecast-stack">
        <article v-for="point in compactForecast" :key="point.utc_datetime" class="forecast-card">
          <div>
            <strong>{{ formatTimestamp(point.utc_datetime) }}</strong>
            <span>{{ point.weather_desc }}</span>
          </div>
          <dl>
            <div>
              <dt>RH</dt>
              <dd>{{ formatNullableNumber(point.humidity_pct, "%") }}</dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>{{ formatNullableNumber(point.wind_speed_kph, "km/j") }}</dd>
            </div>
            <div>
              <dt>Cloud</dt>
              <dd>{{ formatNullableNumber(point.cloud_cover_pct, "%") }}</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>{{ point.weather_code ?? "-" }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>

    <p v-else class="empty-state">{{ emptyState }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, CloudSun } from "@lucide/vue";
import type { WeatherForecastPointPayload, WeatherPayload } from "../api.js";

const props = defineProps<{
  weather: WeatherPayload | null;
  plotName: string;
  emptyState: string;
  showManage?: boolean;
}>();

defineEmits<{
  "open-weather": [];
}>();

const current = computed<WeatherForecastPointPayload>(() => props.weather?.forecast[0] ?? {
  utc_datetime: "",
  local_datetime: "",
  temperature_c: null,
  humidity_pct: null,
  rainfall_mm: null,
  weather_desc: "BMKG Forecast",
  weather_desc_en: "BMKG Forecast",
  weather_code: null,
  wind_speed_kph: null,
  wind_direction: null,
  cloud_cover_pct: null,
  visibility_text: null,
  icon_url: null
});
const compactForecast = computed(() => props.weather?.forecast.slice(0, 2) ?? []);
const label = computed(() => {
  if (!props.weather) {
    return `${props.plotName} / belum ada data cuaca.`;
  }

  return `${props.weather.attribution} / ${props.weather.cache_status} / ADM4 ${props.weather.adm4_code ?? "-"}`;
});

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatTemperature(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1
  })} C`;
}

function formatNullableNumber(value: number | null, unit: string): string {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1
  })} ${unit}`;
}
</script>
