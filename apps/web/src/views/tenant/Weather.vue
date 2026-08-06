<template>
  <div class="space-y-5">
    <section class="panel-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-white">Weather Station</h2>
          <p class="mt-1 text-sm text-slate-400">{{ locationLabel }}</p>
        </div>

        <button
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-field-mint/30 bg-field-mint/10 px-4 text-sm font-semibold text-field-mint transition hover:bg-field-mint/15 focus:outline-none focus:ring-2 focus:ring-field-mint/40"
          type="button"
          @click="refreshForecast"
        >
          <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
          Refresh
        </button>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="min-h-10 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-field-mint/40"
          :class="activeTab === tab.id ? 'bg-field-green text-[#102016]' : 'border border-white/10 bg-white/5 text-slate-300 hover:border-field-mint/30 hover:text-field-mint'"
          type="button"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'forecast'" class="space-y-5">
      <div v-if="errorMessage" class="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {{ errorMessage }}
      </div>

      <section v-if="forecast" class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <article class="panel-surface overflow-hidden">
          <div class="border-b border-white/10 p-5">
            <p class="text-sm font-medium text-slate-400">Prakiraan Cuaca Saat Ini</p>
            <div class="mt-4 flex items-center justify-between gap-4">
              <div>
                <h3 class="text-3xl font-semibold tracking-normal text-white">{{ forecast.current.condition }}</h3>
                <p class="mt-2 text-sm text-slate-400">{{ formatDateTime(forecast.current.localDateTime) }}</p>
              </div>
              <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-field-mint/20 bg-field-mint/10">
                <img
                  v-if="forecast.current.iconUrl"
                  :alt="forecast.current.condition"
                  class="h-14 w-14"
                  :src="forecast.current.iconUrl"
                />
                <CloudSun v-else class="h-10 w-10 text-amber-200" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 p-5">
            <div v-for="metric in currentWeatherMetrics" :key="metric.label" class="rounded-lg border border-white/10 bg-white/5 p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-slate-400">{{ metric.label }}</p>
                <component :is="metric.icon" class="h-4 w-4" :class="metric.iconClass" />
              </div>
              <p class="mt-2 text-xl font-semibold tracking-normal text-white">{{ metric.value }}</p>
            </div>
          </div>

          <div class="border-t border-white/10 px-5 py-4 text-xs text-slate-400">
            <span>{{ forecast.attribution }}</span>
            <span class="mx-2 text-white/20">/</span>
            <span>{{ forecast.isMock ? "Mock fallback aktif" : safeUrlHost(forecast.forecastUrl) }}</span>
          </div>
        </article>

        <article class="panel-surface p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold tracking-normal text-white">3-Day Forecast Grid</h3>
              <p class="mt-1 text-sm text-slate-400">Ringkasan harian dari bucket prakiraan BMKG.</p>
            </div>
            <p class="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">ADM4 {{ forecast.location.adm4 }}</p>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-3">
            <article v-for="day in dailyForecast" :key="day.date" class="rounded-lg border border-white/10 bg-white/5 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-white">{{ day.dateLabel }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ day.summary }}</p>
                </div>
                <CloudRain v-if="day.rainChancePercent >= 40" class="h-5 w-5 text-sky-200" />
                <SunMedium v-else class="h-5 w-5 text-amber-200" />
              </div>

              <div class="mt-5 space-y-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-slate-400">Avg Temp</span>
                  <strong class="text-white">{{ formatTemperature(day.averageTemperatureC) }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-slate-400">Humidity</span>
                  <strong class="text-white">{{ day.humidityRange }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-slate-400">Rain Chance</span>
                  <strong class="text-field-mint">{{ day.rainChancePercent }}%</strong>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-if="forecast" class="panel-surface p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold tracking-normal text-white">Hourly Forecast</h3>
            <p class="mt-1 text-sm text-slate-400">Sampel prakiraan 3 jam BMKG untuk pemantauan lapangan.</p>
          </div>
          <p class="text-xs text-slate-400">Updated {{ formatDateTime(forecast.fetchedAt) }}</p>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article v-for="item in hourlyForecast" :key="item.id" class="rounded-lg border border-white/10 bg-white/5 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs text-slate-400">{{ formatTimeOnly(item.localDateTime) }}</p>
                <p class="mt-2 text-sm font-semibold text-white">{{ item.condition }}</p>
              </div>
              <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="weatherToneClass(item.condition)">
                {{ item.weatherCode ?? "-" }}
              </span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
              <span class="rounded-lg bg-white/5 p-2 text-slate-300">{{ formatTemperature(item.temperatureC) }}</span>
              <span class="rounded-lg bg-white/5 p-2 text-slate-300">{{ formatHumidity(item.humidityPercent) }}</span>
              <span class="rounded-lg bg-white/5 p-2 text-slate-300">{{ formatRain(item.rainfallMm) }}</span>
              <span class="rounded-lg bg-white/5 p-2 text-slate-300">{{ formatWind(item.windSpeed, item.windDirection) }}</span>
            </div>
          </article>
        </div>
      </section>

      <section v-if="isLoading && !forecast" class="panel-surface p-8 text-center">
        <Loader2 class="mx-auto h-10 w-10 animate-spin text-field-mint" />
        <p class="mt-4 text-sm text-slate-400">Mengambil prakiraan cuaca BMKG.</p>
      </section>
    </section>

    <section v-else-if="activeTab === 'monthly'" class="panel-surface p-6">
      <h2 class="text-lg font-semibold tracking-normal text-white">Report Bulanan</h2>
      <p class="mt-2 text-sm text-slate-400">Ringkasan bulanan akan menggunakan histori cuaca dan telemetry setelah backend report aktif.</p>
    </section>

    <section v-else class="panel-surface p-6">
      <h2 class="text-lg font-semibold tracking-normal text-white">Konfigurasi</h2>
      <dl class="mt-5 grid gap-4 md:grid-cols-2">
        <div class="rounded-lg border border-white/10 bg-white/5 p-4">
          <dt class="text-xs text-slate-400">BMKG ADM4</dt>
          <dd class="mt-2 text-sm font-semibold text-white">{{ configuredAdm4 }}</dd>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-4">
          <dt class="text-xs text-slate-400">Forecast Endpoint</dt>
          <dd class="mt-2 break-all text-sm font-semibold text-white">{{ configuredBaseUrl }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Loader2,
  RefreshCw,
  SunMedium,
  Thermometer,
  Wind
} from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import { appEnvironment } from "../../config/environment";
import {
  fetchBmkgForecast,
  type BmkgForecastResult
} from "../../services/bmkgService";

type WeatherTab = "forecast" | "monthly" | "config";

const activeTab = ref<WeatherTab>("forecast");
const forecast = ref<BmkgForecastResult | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const configuredAdm4 = computed(() => appEnvironment.bmkgForecastAdm4 || "31.71.03.1001");
const configuredBaseUrl = computed(() => appEnvironment.bmkgForecastBaseUrl || "https://api.bmkg.go.id/publik/prakiraan-cuaca");

const tabs: Array<{ id: WeatherTab; label: string }> = [
  { id: "forecast", label: "Prakiraan Cuaca" },
  { id: "monthly", label: "Report Bulanan" },
  { id: "config", label: "Konfigurasi" }
];

const locationLabel = computed(() => {
  if (!forecast.value) {
    return "BMKG forecast location";
  }

  const location = forecast.value.location;
  return `${location.village}, ${location.district}, ${location.city}`;
});

const dailyForecast = computed(() => forecast.value?.daily.slice(0, 3) ?? []);
const hourlyForecast = computed(() => forecast.value?.items.slice(0, 8) ?? []);

const currentWeatherMetrics = computed(() => {
  const current = forecast.value?.current;

  return [
    {
      label: "Temperature",
      value: formatTemperature(current?.temperatureC ?? null),
      icon: Thermometer,
      iconClass: "text-amber-200"
    },
    {
      label: "Humidity",
      value: formatHumidity(current?.humidityPercent ?? null),
      icon: Droplets,
      iconClass: "text-sky-200"
    },
    {
      label: "Rainfall",
      value: formatRain(current?.rainfallMm ?? null),
      icon: CloudRain,
      iconClass: "text-field-mint"
    },
    {
      label: "Wind",
      value: formatWind(current?.windSpeed ?? null, current?.windDirection ?? "-"),
      icon: Wind,
      iconClass: "text-field-green"
    },
    {
      label: "Cloud Cover",
      value: formatPercent(current?.cloudCoverPercent ?? null),
      icon: CloudSun,
      iconClass: "text-violet-200"
    },
    {
      label: "Visibility",
      value: current?.visibility ?? "-",
      icon: Eye,
      iconClass: "text-cyan-200"
    }
  ];
});

onMounted(() => {
  void refreshForecast();
});

async function refreshForecast(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  const result = await fetchBmkgForecast({
    adm4: configuredAdm4.value,
    baseUrl: configuredBaseUrl.value
  });

  forecast.value = result;
  errorMessage.value = result.isMock
    ? `BMKG live data belum bisa diambil: ${result.errorMessage ?? "menggunakan data contoh."}`
    : null;
  isLoading.value = false;
}

function formatTemperature(value: number | null): string {
  return value === null ? "-" : `${value} C`;
}

function formatHumidity(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

function formatPercent(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

function formatRain(value: number | null): string {
  return value === null ? "-" : `${value} mm`;
}

function formatWind(value: number | null, direction: string): string {
  return value === null ? "-" : `${value} km/j ${direction}`.trim();
}

function formatDateTime(value: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatTimeOnly(value: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function weatherToneClass(condition: string): string {
  const normalized = condition.toLowerCase();
  if (normalized.includes("hujan")) {
    return "bg-sky-300/10 text-sky-200";
  }

  if (normalized.includes("cerah")) {
    return "bg-amber-300/10 text-amber-200";
  }

  return "bg-field-mint/10 text-field-mint";
}

function safeUrlHost(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}
</script>
