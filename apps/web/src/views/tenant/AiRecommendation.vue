<template>
  <div class="space-y-5">
    <section class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto] xl:items-end">
        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Leaf class="h-4 w-4 text-teal-600" />
            {{ t("ai.filters.zoneArea") }}
          </span>
          <select
            v-model="filters.plotId"
            class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
          >
            <option value="">{{ t("common.allZones") }}</option>
            <option v-for="field in fieldOptions" :key="field.id" :value="field.id">
              {{ field.name }} / {{ field.cropLabel }}
            </option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarDays class="h-4 w-4 text-emerald-600" />
            {{ t("ai.filters.startDate") }}
          </span>
          <input
            v-model="filters.startDate"
            class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarDays class="h-4 w-4 text-sky-600" />
            {{ t("ai.filters.endDate") }}
          </span>
          <input
            v-model="filters.endDate"
            class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
            type="date"
          />
        </label>

        <label class="space-y-2">
          <span class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Database class="h-4 w-4 text-amber-600" />
            {{ t("ai.filters.telemetryRows") }}
          </span>
          <select
            v-model.number="filters.telemetryLimit"
            class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
          >
            <option :value="60">{{ t("ai.filters.rowsOption", { count: formatNumber(60, { maximumFractionDigits: 0 }) }) }}</option>
            <option :value="180">{{ t("ai.filters.rowsOption", { count: formatNumber(180, { maximumFractionDigits: 0 }) }) }}</option>
            <option :value="360">{{ t("ai.filters.rowsOption", { count: formatNumber(360, { maximumFractionDigits: 0 }) }) }}</option>
            <option :value="500">{{ t("ai.filters.rowsOption", { count: formatNumber(500, { maximumFractionDigits: 0 }) }) }}</option>
          </select>
        </label>

        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60"
          :disabled="isBusy"
          @click="generateRecommendation"
        >
          <Sparkles class="h-4 w-4" />
          {{ aiStore.isGenerating ? t("ai.status.processing") : t("ai.actions.generate") }}
        </button>
      </div>

      <div v-if="validationMessage || errorMessage" class="mt-4 rounded-xl border border-amber-200 bg-amber-100/70 p-4 text-sm text-amber-700">
        <p v-if="validationMessage">{{ validationMessage }}</p>
        {{ errorMessage }}
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold tracking-normal text-slate-800">{{ t("ai.weatherContext.title") }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ weatherLocationLabel }}</p>
          </div>
          <button
            class="icon-button"
            type="button"
            :aria-label="t('ai.weatherContext.refresh')"
            :disabled="isWeatherLoading"
            @click="refreshForecast"
          >
            <RefreshCw class="h-4 w-4" :class="isWeatherLoading ? 'animate-spin' : ''" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-teal-100 bg-teal-50/70 p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-medium text-teal-700">{{ t("ai.weatherContext.current") }}</p>
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                <CloudRain v-if="isRainy(forecast?.current.condition)" class="h-5 w-5" />
                <CloudSun v-else class="h-5 w-5" />
              </span>
            </div>
            <p class="mt-2 text-xl font-semibold tracking-normal text-slate-800">{{ currentConditionLabel }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ formatTemperature(forecast?.current.temperatureC ?? null) }}</p>
          </div>

          <div class="rounded-xl border border-white/80 bg-white/50 p-4">
            <p class="text-xs font-medium text-slate-500">{{ t("ai.weatherContext.rainChance") }}</p>
            <p class="mt-2 text-xl font-semibold tracking-normal text-sky-700">{{ rainChanceLabel }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ humidityLabel }}</p>
          </div>
        </div>

        <div v-if="weatherError" class="mt-4 rounded-xl border border-amber-200 bg-amber-100/70 p-3 text-sm text-amber-700">
          {{ weatherError }}
        </div>
      </article>

      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold tracking-normal text-slate-800">{{ t("ai.fieldNotes.title") }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ selectedFieldLabel }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
            <Bot class="h-5 w-5" />
          </div>
        </div>

        <textarea
          v-model.trim="filters.farmerNotes"
          class="mt-5 min-h-28 w-full rounded-xl border border-emerald-200 bg-white/50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
          maxlength="3000"
          :placeholder="t('ai.fieldNotes.placeholder')"
        ></textarea>
      </article>
    </section>

    <section v-if="aiStore.isGenerating" class="rounded-2xl border border-white/80 bg-white/60 p-8 text-center shadow-sm backdrop-blur-lg">
      <Loader2 class="mx-auto h-10 w-10 animate-spin text-teal-600" />
      <p class="mt-4 text-sm text-slate-600">{{ t("ai.status.analyzingFieldData") }}</p>
    </section>

    <section v-else-if="result" class="space-y-5">
      <div v-if="contentNotice" class="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
        {{ contentNotice }}
      </div>

      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-4xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                <Sparkles class="h-3.5 w-3.5" />
                {{ formatProvider(result.provider) }} / {{ result.model }}
              </span>
              <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="levelClass(result.recommendation.confidence)">
                {{ t("ai.result.confidenceWithLevel", { level: formatLevel(result.recommendation.confidence) }) }}
              </span>
            </div>
            <h2 class="mt-4 text-xl font-semibold tracking-normal text-slate-800">{{ t("ai.result.summaryTitle") }}</h2>
            <p class="mt-3 text-sm leading-6 text-slate-700">{{ result.recommendation.executiveSummary }}</p>
          </div>

          <dl class="grid min-w-60 grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl border border-white/80 bg-white/50 p-3">
              <dt class="text-xs text-slate-500">{{ t("ai.result.telemetry") }}</dt>
              <dd class="mt-1 font-semibold text-slate-800">{{ formatNumber(result.analysisWindow.telemetryRows, { maximumFractionDigits: 0 }) }}</dd>
            </div>
            <div class="rounded-xl border border-white/80 bg-white/50 p-3">
              <dt class="text-xs text-slate-500">{{ t("ai.result.metrics") }}</dt>
              <dd class="mt-1 font-semibold text-slate-800">{{ formatNumber(result.context.metricCount, { maximumFractionDigits: 0 }) }}</dd>
            </div>
            <div class="rounded-xl border border-white/80 bg-white/50 p-3">
              <dt class="text-xs text-slate-500">{{ t("ai.result.devices") }}</dt>
              <dd class="mt-1 font-semibold text-slate-800">{{ formatNumber(result.context.deviceCount, { maximumFractionDigits: 0 }) }}</dd>
            </div>
            <div class="rounded-xl border border-white/80 bg-white/50 p-3">
              <dt class="text-xs text-slate-500">{{ t("ai.result.generated") }}</dt>
              <dd class="mt-1 font-semibold text-slate-800">{{ formatTimeOnly(result.generatedAt) }}</dd>
            </div>
          </dl>
        </div>
      </article>

      <section v-if="result.recommendation.riskAlerts.length > 0" class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <h2 class="text-base font-semibold tracking-normal text-slate-800">{{ t("ai.sections.riskAlerts") }}</h2>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-2">
          <article v-for="alert in result.recommendation.riskAlerts" :key="`${alert.title}-${alert.severity}`" class="rounded-xl border border-white/80 bg-white/50 p-4">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-sm font-semibold text-slate-800">{{ alert.title }}</h3>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="levelClass(alert.severity)">
                {{ formatLevel(alert.severity) }}
              </span>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-700">{{ alert.rationale }}</p>
            <p class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm font-medium text-emerald-800">{{ alert.action }}</p>
          </article>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-2">
        <article v-for="section in recommendationSections" :key="section.id" class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="section.iconClass">
                <component :is="section.icon" class="h-5 w-5" />
              </div>
              <h2 class="text-base font-semibold tracking-normal text-slate-800">{{ section.title }}</h2>
            </div>
            <span class="rounded-full border border-white/80 bg-white/50 px-3 py-1 text-xs text-slate-600">{{ section.items.length }}</span>
          </div>

          <div v-if="section.items.length > 0" class="mt-5 space-y-4">
            <article v-for="item in section.items" :key="`${section.id}-${item.title}`" class="rounded-xl border border-white/80 bg-white/50 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">{{ item.title }}</h3>
                  <p class="mt-1 text-xs text-slate-500">{{ item.timing }}</p>
                </div>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="levelClass(item.priority)">
                  {{ formatLevel(item.priority) }}
                </span>
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-700">{{ item.rationale }}</p>
              <ul class="mt-3 space-y-2 text-sm text-slate-700">
                <li v-for="action in item.actions" :key="action" class="flex gap-2">
                  <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>{{ action }}</span>
                </li>
              </ul>
            </article>
          </div>

          <div v-else class="mt-5 rounded-xl border border-white/80 bg-white/50 p-4 text-sm text-slate-600 md:p-5">
            {{ t("ai.empty.noRecommendationsInCategory") }}
          </div>
        </article>
      </section>

      <section v-if="result.recommendation.dataGaps.length > 0" class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
            <Database class="h-5 w-5" />
          </div>
          <h2 class="text-base font-semibold tracking-normal text-slate-800">{{ t("ai.sections.dataGaps") }}</h2>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span v-for="gap in result.recommendation.dataGaps" :key="gap" class="rounded-full border border-emerald-200 bg-white/50 px-3 py-1.5 text-sm text-slate-700">
            {{ gap }}
          </span>
        </div>
      </section>
    </section>

    <section v-else class="rounded-2xl border border-white/80 bg-white/60 p-8 text-center shadow-sm backdrop-blur-lg">
      <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
        <Sparkles class="h-6 w-6" />
      </span>
      <h2 class="mt-4 text-lg font-semibold tracking-normal text-slate-800">{{ t("ai.title") }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        {{ t("ai.empty.readyDescription") }}
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
import { useI18n } from "../../i18n";
import { formatDateTime, formatNumber, formatPercent } from "../../i18n/formatters";
import { getWeatherConditionLabel, isRainyCondition } from "../../i18n/weather";
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
const { locale, t } = useI18n();
const forecast = ref<BmkgForecastResult | null>(null);
const isWeatherLoading = ref(false);
const weatherError = ref<string | null>(null);
const validationKey = ref<string | null>(null);

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
    return t("ai.filters.allTenantZones");
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
const result = computed(() => aiStore.localizedResponse);
const isBusy = computed(() => aiStore.isGenerating || tenantProfileStore.isLoading || isWeatherLoading.value);
const errorMessage = computed(() => aiStore.errorMessage || tenantProfileStore.errorMessage);
const validationMessage = computed(() => validationKey.value ? t(validationKey.value) : null);
const activeLanguageLabel = computed(() => locale.value === "en" ? t("ai.language.en") : t("ai.language.id"));
const contentNotice = computed(() => {
  const response = aiStore.lastResponse;
  if (!response) {
    return null;
  }

  if (response.recommendations?.[locale.value]) {
    return null;
  }

  if (response.recommendations && !response.recommendations[locale.value]) {
    return t("ai.legacy.variantMissing", { language: activeLanguageLabel.value });
  }

  const sourceLanguage = response.generatedLocale === "en" ? t("ai.language.en") : t("ai.language.id");
  return t("ai.legacy.sourceShown", { language: sourceLanguage });
});

const weatherLocationLabel = computed(() => {
  if (forecast.value) {
    const location = forecast.value.location;
    return `${location.village}, ${location.district}, ${location.city}`;
  }

  return selectedAdm4.value ? `ADM4 ${selectedAdm4.value}` : t("ai.weatherContext.bmkgNotConfigured");
});
const rainChanceLabel = computed(() => {
  const rainChance = forecast.value?.daily[0]?.rainChancePercent;
  return typeof rainChance === "number" ? formatPercent(rainChance, { maximumFractionDigits: 0, valueKind: "percent" }) : t("format.nullValue");
});
const humidityLabel = computed(() => forecast.value?.daily[0]?.humidityRange
  ? t("ai.weatherContext.humidityValue", { value: forecast.value.daily[0].humidityRange })
  : t("ai.weatherContext.humidityValue", { value: t("format.nullValue") }));
const currentConditionLabel = computed(() => forecast.value ? getWeatherConditionLabel(forecast.value.current) : t("format.nullValue"));

const recommendationSections = computed(() => {
  const recommendation = result.value?.recommendation;

  return [
    {
      icon: FlaskConical,
      iconClass: "bg-teal-100 text-teal-600",
      id: "fertilizer",
      items: recommendation?.fertilizer ?? [],
      title: t("ai.sections.fertilization")
    },
    {
      icon: ShieldCheck,
      iconClass: "bg-amber-100 text-amber-600",
      id: "pest",
      items: recommendation?.pestManagement ?? [],
      title: t("ai.sections.pestManagement")
    },
    {
      icon: Droplets,
      iconClass: "bg-sky-100 text-sky-600",
      id: "irrigation",
      items: recommendation?.irrigation ?? [],
      title: t("ai.sections.irrigation")
    },
    {
      icon: TrendingUp,
      iconClass: "bg-emerald-100 text-emerald-600",
      id: "yield",
      items: recommendation?.yieldOptimization ?? [],
      title: t("ai.sections.harvestOptimization")
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
    ? t("ai.weatherContext.fallback", { message: response.errorMessage ?? t("ai.weatherContext.usingSampleData") })
    : null;
  isWeatherLoading.value = false;
}

async function generateRecommendation(): Promise<void> {
  validationKey.value = validateFilters();
  if (validationKey.value) {
    return;
  }

  if (!forecast.value && selectedAdm4.value) {
    await refreshForecast();
  }

  await aiStore.generateRecommendation({
    end: endOfDayIso(filters.endDate),
    farmerNotes: filters.farmerNotes,
    locale: locale.value,
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
      conditionEn: forecast.value.current.conditionEn,
      humidityPercent: forecast.value.current.humidityPercent,
      rainfallMm: forecast.value.current.rainfallMm,
      temperatureC: forecast.value.current.temperatureC,
      windDirection: forecast.value.current.windDirection,
      weatherCode: forecast.value.current.weatherCode,
      windSpeed: forecast.value.current.windSpeed
    },
    daily: forecast.value.daily.slice(0, 3).map((day) => ({
      averageTemperatureC: day.averageTemperatureC,
      date: day.date,
      humidityRange: day.humidityRange,
      rainChancePercent: day.rainChancePercent,
      summary: day.summary,
      summaryEn: day.summaryEn
    })),
    hourly: forecast.value.items.slice(0, 24).map((item) => ({
      cloudCoverPercent: item.cloudCoverPercent,
      condition: item.condition,
      conditionEn: item.conditionEn,
      dateTime: item.dateTime,
      humidityPercent: item.humidityPercent,
      localDateTime: item.localDateTime,
      rainfallMm: item.rainfallMm,
      temperatureC: item.temperatureC,
      weatherCode: item.weatherCode,
      windDirection: item.windDirection,
      windSpeed: item.windSpeed
    })),
    fetchedAt: forecast.value.fetchedAt,
    location: {
      adm4: forecast.value.location.adm4,
      city: forecast.value.location.city,
      district: forecast.value.location.district,
      village: forecast.value.location.village
    },
    source: forecast.value.isMock ? "BMKG fallback" : forecast.value.attribution,
    summary: `${forecast.value.current.condition}; ${forecast.value.current.conditionEn ?? ""}; rain chance ${rainChanceLabel.value}; ${humidityLabel.value}`
  };
}

function validateFilters(): string | null {
  if (!filters.startDate || !filters.endDate) {
    return "ai.validation.dateRequired";
  }

  if (new Date(`${filters.startDate}T00:00:00`).getTime() > new Date(`${filters.endDate}T23:59:59.999`).getTime()) {
    return "ai.validation.invalidDateRange";
  }

  if (!Number.isFinite(filters.telemetryLimit) || filters.telemetryLimit < 10) {
    return "ai.validation.telemetryRowsInvalid";
  }

  return null;
}

function levelClass(level: RecommendationLevel): string {
  if (level === "high") {
    return "bg-rose-100 text-rose-700";
  }

  if (level === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function formatLevel(level: RecommendationLevel): string {
  return t(`ai.level.${level}`);
}

function formatProvider(provider: string): string {
  if (provider === "openai") return "OpenAI";
  if (provider === "tencent") return "Tencent";
  if (provider === "sumopod") return "Sumopod";
  return "Custom";
}

function formatTemperature(value: number | null): string {
  return value === null ? t("format.nullValue") : t("ai.weatherContext.temperatureValue", { value: formatNumber(value, { maximumFractionDigits: 1 }) });
}

function formatTimeOnly(value: string): string {
  return formatDateTime(value, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isRainy(condition?: string): boolean {
  return isRainyCondition({
    condition,
    conditionEn: forecast.value?.current.conditionEn,
    weatherCode: forecast.value?.current.weatherCode
  });
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
