<template>
  <div class="space-y-5">
    <section class="panel-surface p-5">
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto] xl:items-end">
        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Leaf class="h-4 w-4 text-field-mint" />
            Zona/Area
          </span>
          <select
            v-model="filters.plotId"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          >
            <option value="">Semua Zona</option>
            <option v-for="field in fieldOptions" :key="field.id" :value="field.id">
              {{ field.name }} / {{ field.cropLabel }}
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
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
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
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Database class="h-4 w-4 text-amber-200" />
            Telemetry
          </span>
          <select
            v-model.number="filters.telemetryLimit"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          >
            <option :value="60">60 rows</option>
            <option :value="180">180 rows</option>
            <option :value="360">360 rows</option>
            <option :value="500">500 rows</option>
          </select>
        </label>

        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] transition hover:bg-field-mint disabled:opacity-60"
          :disabled="isBusy"
          @click="generateRecommendation"
        >
          <Sparkles class="h-4 w-4" />
          {{ aiStore.isGenerating ? "Menganalisis" : "Generate" }}
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {{ errorMessage }}
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold tracking-normal text-white">Konteks Cuaca</h2>
            <p class="mt-1 text-sm text-slate-400">{{ weatherLocationLabel }}</p>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="Refresh cuaca"
            :disabled="isWeatherLoading"
            @click="refreshForecast"
          >
            <RefreshCw class="h-4 w-4" :class="isWeatherLoading ? 'animate-spin' : ''" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-field-mint/20 bg-field-mint/10 p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-field-mint">Saat Ini</p>
              <CloudRain v-if="isRainy(forecast?.current.condition)" class="h-5 w-5 text-sky-200" />
              <CloudSun v-else class="h-5 w-5 text-amber-200" />
            </div>
            <p class="mt-2 text-xl font-semibold tracking-normal text-white">{{ forecast?.current.condition ?? "-" }}</p>
            <p class="mt-1 text-sm text-slate-300">{{ formatTemperature(forecast?.current.temperatureC ?? null) }}</p>
          </div>

          <div class="rounded-lg border border-white/10 bg-white/5 p-4">
            <p class="text-xs text-slate-400">Rain Chance</p>
            <p class="mt-2 text-xl font-semibold tracking-normal text-sky-200">{{ rainChanceLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">{{ humidityLabel }}</p>
          </div>
        </div>

        <div v-if="weatherError" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          {{ weatherError }}
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold tracking-normal text-white">Catatan Lapang</h2>
            <p class="mt-1 text-sm text-slate-400">{{ selectedFieldLabel }}</p>
          </div>
          <Bot class="h-6 w-6 text-field-mint" />
        </div>

        <textarea
          v-model.trim="filters.farmerNotes"
          class="mt-5 min-h-28 w-full rounded-lg border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
          maxlength="3000"
          placeholder="Gejala daun, serangan OPT, kondisi saluran irigasi, fase tanaman, target panen"
        ></textarea>
      </article>
    </section>

    <section v-if="aiStore.isGenerating" class="panel-surface p-8 text-center">
      <Loader2 class="mx-auto h-10 w-10 animate-spin text-field-mint" />
      <p class="mt-4 text-sm text-slate-400">Menganalisis data lahan.</p>
    </section>

    <section v-else-if="result" class="space-y-5">
      <article class="panel-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-4xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-2 rounded-full bg-field-mint/10 px-3 py-1 text-xs font-semibold text-field-mint">
                <Sparkles class="h-3.5 w-3.5" />
                {{ result.model }}
              </span>
              <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="levelClass(result.recommendation.confidence)">
                Confidence {{ formatLevel(result.recommendation.confidence) }}
              </span>
            </div>
            <h2 class="mt-4 text-xl font-semibold tracking-normal text-white">Ringkasan Rekomendasi</h2>
            <p class="mt-3 text-sm leading-6 text-slate-300">{{ result.recommendation.executiveSummary }}</p>
          </div>

          <dl class="grid min-w-60 grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg border border-white/10 bg-white/5 p-3">
              <dt class="text-xs text-slate-400">Telemetry</dt>
              <dd class="mt-1 font-semibold text-white">{{ result.analysisWindow.telemetryRows }}</dd>
            </div>
            <div class="rounded-lg border border-white/10 bg-white/5 p-3">
              <dt class="text-xs text-slate-400">Metrics</dt>
              <dd class="mt-1 font-semibold text-white">{{ result.context.metricCount }}</dd>
            </div>
            <div class="rounded-lg border border-white/10 bg-white/5 p-3">
              <dt class="text-xs text-slate-400">Device</dt>
              <dd class="mt-1 font-semibold text-white">{{ result.context.deviceCount }}</dd>
            </div>
            <div class="rounded-lg border border-white/10 bg-white/5 p-3">
              <dt class="text-xs text-slate-400">Generated</dt>
              <dd class="mt-1 font-semibold text-white">{{ formatTimeOnly(result.generatedAt) }}</dd>
            </div>
          </dl>
        </div>
      </article>

      <section v-if="result.recommendation.riskAlerts.length > 0" class="panel-surface p-5">
        <div class="flex items-center gap-3">
          <AlertTriangle class="h-5 w-5 text-amber-200" />
          <h2 class="text-base font-semibold tracking-normal text-white">Peringatan Risiko</h2>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-2">
          <article v-for="alert in result.recommendation.riskAlerts" :key="`${alert.title}-${alert.severity}`" class="rounded-lg border border-white/10 bg-white/5 p-4">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-sm font-semibold text-white">{{ alert.title }}</h3>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="levelClass(alert.severity)">
                {{ formatLevel(alert.severity) }}
              </span>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-300">{{ alert.rationale }}</p>
            <p class="mt-3 rounded-lg bg-[#07111f] p-3 text-sm text-field-mint">{{ alert.action }}</p>
          </article>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-2">
        <article v-for="section in recommendationSections" :key="section.id" class="panel-surface p-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="section.iconClass">
                <component :is="section.icon" class="h-5 w-5" />
              </div>
              <h2 class="text-base font-semibold tracking-normal text-white">{{ section.title }}</h2>
            </div>
            <span class="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{{ section.items.length }}</span>
          </div>

          <div v-if="section.items.length > 0" class="mt-5 space-y-4">
            <article v-for="item in section.items" :key="`${section.id}-${item.title}`" class="rounded-lg border border-white/10 bg-white/5 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-white">{{ item.title }}</h3>
                  <p class="mt-1 text-xs text-slate-400">{{ item.timing }}</p>
                </div>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="levelClass(item.priority)">
                  {{ formatLevel(item.priority) }}
                </span>
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-300">{{ item.rationale }}</p>
              <ul class="mt-3 space-y-2 text-sm text-slate-200">
                <li v-for="action in item.actions" :key="action" class="flex gap-2">
                  <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-field-mint" />
                  <span>{{ action }}</span>
                </li>
              </ul>
            </article>
          </div>

          <div v-else class="mt-5 rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
            Tidak ada rekomendasi pada kategori ini.
          </div>
        </article>
      </section>

      <section v-if="result.recommendation.dataGaps.length > 0" class="panel-surface p-5">
        <div class="flex items-center gap-3">
          <Database class="h-5 w-5 text-sky-200" />
          <h2 class="text-base font-semibold tracking-normal text-white">Data Gap</h2>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span v-for="gap in result.recommendation.dataGaps" :key="gap" class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300">
            {{ gap }}
          </span>
        </div>
      </section>
    </section>

    <section v-else class="panel-surface p-8 text-center">
      <Sparkles class="mx-auto h-10 w-10 text-field-mint" />
      <h2 class="mt-4 text-lg font-semibold tracking-normal text-white">AI Rekomendasi</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm text-slate-400">
        Data tanah, cuaca, histori lahan, dan telemetry siap dianalisis.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  CloudRain,
  CloudSun,
  Database,
  Droplets,
  FlaskConical,
  Leaf,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "@lucide/vue";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { appEnvironment } from "../../config/environment";
import { fetchBmkgForecast, type BmkgForecastResult } from "../../services/bmkgService";
import { useAiRecommendationStore, type AiRecommendationRequest, type RecommendationLevel } from "../../stores/aiRecommendationStore";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";
import { useWeatherConfigStore } from "../../stores/weatherConfigStore";

const today = new Date();
const fourteenDaysAgo = new Date(today);
fourteenDaysAgo.setDate(today.getDate() - 14);

const aiStore = useAiRecommendationStore();
const tenantProfileStore = useTenantProfileStore();
const weatherConfigStore = useWeatherConfigStore();
const forecast = ref<BmkgForecastResult | null>(null);
const isWeatherLoading = ref(false);
const weatherError = ref<string | null>(null);

const filters = reactive({
  endDate: toInputDate(today),
  farmerNotes: "",
  plotId: "",
  startDate: toInputDate(fourteenDaysAgo),
  telemetryLimit: 180
});

const fieldOptions = computed(() => tenantProfileStore.fields);
const selectedField = computed(() => {
  if (!filters.plotId) {
    return tenantProfileStore.activeField;
  }

  return tenantProfileStore.fields.find((field) => field.id === filters.plotId) ?? null;
});
const selectedFieldLabel = computed(() => {
  if (!selectedField.value) {
    return "Semua zona tenant";
  }

  return `${selectedField.value.name} / ${selectedField.value.cropLabel}`;
});
const selectedWeatherConfig = computed(() => {
  const fieldId = selectedField.value?.id;
  return weatherConfigStore.configs.find((config) => config.fieldId === fieldId && config.isEnabled)
    ?? weatherConfigStore.activeConfig;
});
const selectedAdm4 = computed(() => selectedWeatherConfig.value?.bmkgAdm4Code || selectedField.value?.bmkgAdm4Code || "");
const selectedBaseUrl = computed(() => selectedWeatherConfig.value?.baseUrl || appEnvironment.bmkgForecastBaseUrl);
const result = computed(() => aiStore.lastResponse);
const isBusy = computed(() => aiStore.isGenerating || tenantProfileStore.isLoading || isWeatherLoading.value);
const errorMessage = computed(() => aiStore.errorMessage || tenantProfileStore.errorMessage);

const weatherLocationLabel = computed(() => {
  if (forecast.value) {
    const location = forecast.value.location;
    return `${location.village}, ${location.district}, ${location.city}`;
  }

  return selectedAdm4.value ? `ADM4 ${selectedAdm4.value}` : "BMKG belum diatur";
});
const rainChanceLabel = computed(() => {
  const rainChance = forecast.value?.daily[0]?.rainChancePercent;
  return typeof rainChance === "number" ? `${rainChance}%` : "-";
});
const humidityLabel = computed(() => forecast.value?.daily[0]?.humidityRange ? `Humidity ${forecast.value.daily[0].humidityRange}` : "Humidity -");

const recommendationSections = computed(() => {
  const recommendation = result.value?.recommendation;

  return [
    {
      icon: FlaskConical,
      iconClass: "bg-field-mint/10 text-field-mint",
      id: "fertilizer",
      items: recommendation?.fertilizer ?? [],
      title: "Pemupukan"
    },
    {
      icon: ShieldCheck,
      iconClass: "bg-amber-300/10 text-amber-200",
      id: "pest",
      items: recommendation?.pestManagement ?? [],
      title: "Penanganan OPT"
    },
    {
      icon: Droplets,
      iconClass: "bg-sky-300/10 text-sky-200",
      id: "irrigation",
      items: recommendation?.irrigation ?? [],
      title: "Irigasi"
    },
    {
      icon: TrendingUp,
      iconClass: "bg-field-green/10 text-field-green",
      id: "yield",
      items: recommendation?.yieldOptimization ?? [],
      title: "Optimalisasi Panen"
    }
  ];
});

onMounted(async () => {
  await tenantProfileStore.fetchFields();
  weatherConfigStore.ensureDefaults(tenantProfileStore.fields, appEnvironment.bmkgForecastBaseUrl);
  void refreshForecast();
});

watch(() => filters.plotId, () => {
  if (filters.plotId) {
    tenantProfileStore.setActiveField(filters.plotId);
  }

  void refreshForecast();
});

async function refreshForecast(): Promise<void> {
  isWeatherLoading.value = true;
  weatherError.value = null;

  const response = await fetchBmkgForecast({
    adm4: selectedAdm4.value,
    baseUrl: selectedBaseUrl.value
  });

  forecast.value = response;
  weatherError.value = response.isMock
    ? `BMKG fallback: ${response.errorMessage ?? "menggunakan data contoh."}`
    : null;
  isWeatherLoading.value = false;
}

async function generateRecommendation(): Promise<void> {
  if (!forecast.value && selectedAdm4.value) {
    await refreshForecast();
  }

  await aiStore.generateRecommendation({
    end: endOfDayIso(filters.endDate),
    farmerNotes: filters.farmerNotes,
    plotId: filters.plotId || null,
    start: startOfDayIso(filters.startDate),
    telemetryLimit: filters.telemetryLimit,
    weatherContext: buildWeatherContext()
  });
}

function buildWeatherContext(): AiRecommendationRequest["weatherContext"] {
  if (!forecast.value) {
    return undefined;
  }

  return {
    current: {
      cloudCoverPercent: forecast.value.current.cloudCoverPercent,
      condition: forecast.value.current.condition,
      humidityPercent: forecast.value.current.humidityPercent,
      rainfallMm: forecast.value.current.rainfallMm,
      temperatureC: forecast.value.current.temperatureC,
      windDirection: forecast.value.current.windDirection,
      windSpeed: forecast.value.current.windSpeed
    },
    daily: forecast.value.daily.slice(0, 3).map((day) => ({
      averageTemperatureC: day.averageTemperatureC,
      date: day.date,
      humidityRange: day.humidityRange,
      rainChancePercent: day.rainChancePercent,
      summary: day.summary
    })),
    fetchedAt: forecast.value.fetchedAt,
    location: {
      adm4: forecast.value.location.adm4,
      city: forecast.value.location.city,
      district: forecast.value.location.district,
      village: forecast.value.location.village
    },
    source: forecast.value.isMock ? "BMKG fallback" : forecast.value.attribution,
    summary: `${forecast.value.current.condition}; rain chance ${rainChanceLabel.value}; ${humidityLabel.value}`
  };
}

function levelClass(level: RecommendationLevel): string {
  if (level === "high") {
    return "bg-rose-300/10 text-rose-100";
  }

  if (level === "medium") {
    return "bg-amber-300/10 text-amber-100";
  }

  return "bg-field-mint/10 text-field-mint";
}

function formatLevel(level: RecommendationLevel): string {
  return level.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTemperature(value: number | null): string {
  return value === null ? "-" : `${value} C`;
}

function formatTimeOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function isRainy(condition?: string): boolean {
  return condition?.toLowerCase().includes("hujan") ?? false;
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
</script>
