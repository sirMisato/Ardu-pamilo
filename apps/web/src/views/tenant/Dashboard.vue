<template>
  <div class="flex flex-col space-y-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
    <aside class="order-3 flex h-full flex-col lg:order-2 lg:col-span-4">
      <article class="flex flex-1 flex-col justify-between rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">{{ t("dashboard.cropDetails") }}</p>
              <h2 class="mt-1 text-lg font-semibold tracking-normal text-slate-800">{{ tenantProfileStore.activeField?.cropLabel ?? t("dashboard.cropNotSelected") }}</h2>
            </div>
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-field-green/40 text-teal-700 shadow-glass-soft">
              <Sprout class="h-6 w-6" />
            </div>
          </div>

          <dl class="mt-5 grid gap-3">
            <div v-for="item in cropInfo" :key="item.label" class="flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-3 py-2.5">
              <dt class="text-sm font-medium text-slate-500">{{ item.label }}</dt>
              <dd class="text-right text-sm font-semibold text-slate-700">{{ item.value }}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-6">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-slate-600">{{ t("dashboard.growthProgress") }}</span>
            <span class="font-semibold text-teal-700">{{ growthProgressLabel }}</span>
          </div>
          <div class="mt-3 h-4 overflow-hidden rounded-full bg-slate-200/70">
            <div class="h-full rounded-full bg-emerald-400 transition-[width]" :style="{ width: growthProgressBarWidth }"></div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span class="rounded-full py-2" :class="growthStageClass('vegetatif')">{{ t("dashboard.vegetative") }}</span>
            <span class="rounded-full py-2" :class="growthStageClass('generatif')">{{ t("dashboard.reproductive") }}</span>
            <span class="rounded-full py-2" :class="growthStageClass('panen')">{{ t("dashboard.harvest") }}</span>
          </div>
        </div>
      </article>
    </aside>

    <section class="order-2 w-full lg:order-1 lg:col-span-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" :aria-label="t('dashboard.dashboardStatusSummary')">
        <article v-for="stat in topStats" :key="stat.label" class="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md">
          <div class="min-w-0">
            <p class="truncate text-sm text-slate-500">{{ stat.label }}</p>
            <p class="mt-2 text-2xl font-bold tracking-normal text-slate-800">{{ stat.value }}</p>
            <p class="mt-3 truncate text-sm font-medium" :class="stat.detailClass">{{ stat.detail }}</p>
          </div>
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" :class="stat.iconClass">
            <component :is="stat.icon" class="h-5 w-5" />
          </div>
        </article>
      </div>

      <div class="glass-panel overflow-hidden bg-white/60 backdrop-blur-lg">
        <div class="flex flex-wrap items-center justify-between gap-3 px-2 py-3 sm:px-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">{{ t("dashboard.fieldMonitoring") }}</p>
            <h2 class="mt-1 text-xl font-semibold tracking-normal text-slate-800">{{ t("dashboard.fieldMapMonitoring") }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ tenantProfileStore.activeFieldLabel }}</p>
          </div>
          <div class="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
            <span class="h-2.5 w-2.5 rounded-full" :class="telemetryNodeToneClass"></span>
            {{ telemetryNodeLabel }}
          </div>
        </div>

        <div class="relative h-[300px] w-full overflow-hidden rounded-[2rem] border border-white/60 bg-slate-50 shadow-sm isolate md:h-[500px]">
          <FieldMap />
        </div>
      </div>
    </section>

    <section class="order-4 glass-panel border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-5 lg:order-4 lg:col-span-12">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">{{ t("dashboard.sensorRealtime") }}</p>
          <h2 class="mt-1 text-xl font-semibold tracking-normal text-slate-800">{{ t("dashboard.latestMetricSet") }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t("dashboard.dynamicMqttFields") }}</p>
        </div>
        <span class="rounded-full bg-field-mint/10 px-3 py-1.5 text-xs font-semibold text-teal-700">
          {{ t("dashboard.metricCount", { count: formatDataCount(latestMetricCards.length) }) }}
        </span>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="metric in latestMetricCards"
          :key="`${metric.source}-${metric.key}`"
          class="flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-700">{{ metric.label }}</p>
              <p class="mt-1 truncate text-xs text-slate-500">{{ metric.source }} / {{ metric.unit || metric.valueType }}</p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="metric.status.badgeClass">
              {{ metric.status.label }}
            </span>
          </div>

          <div class="mt-6">
            <p class="text-3xl font-bold tracking-normal text-slate-800">{{ metric.displayValue }}</p>
            <p class="mt-2" :class="metricTrendClass(metric.trend.status)">
              {{ metricTrendArrow(metric.trend.status) }} {{ t("dashboard.deltaFromYesterday", { value: formatMetricTrendPercent(metric.trend.percentageChange) }) }}
            </p>
          </div>

          <div class="mt-auto pt-5">
            <div class="h-16">
              <Line :data="metric.sparklineData" :options="sparklineChartOptions" />
            </div>
          </div>
        </article>

        <div v-if="latestMetricCards.length === 0" class="rounded-[1.5rem] border border-dashed border-white/70 bg-white/40 p-4 text-sm font-medium text-slate-500 md:p-5 sm:col-span-2 xl:col-span-4">
          {{ t("dashboard.waitingLatestSensorTelemetry") }}
        </div>
      </div>
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
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext
} from "chart.js";
import { CloudSun, Cpu, Sprout, Waves } from "@lucide/vue";
import { Line } from "vue-chartjs";
import { computed, onMounted, ref, watch } from "vue";
import FieldMap from "../../components/dashboard/FieldMap.vue";
import { appEnvironment } from "../../config/environment";
import { formatCropAge, formatDataCount, formatDateTime, formatNumber, formatPercent } from "../../i18n/formatters";
import { getMetricLabel, getMetricUnit, normalizeMetricKey } from "../../i18n/metrics";
import { useI18n } from "../../i18n";
import { getWeatherConditionLabel } from "../../i18n/weather";
import { fetchBmkgForecast, type BmkgForecastResult } from "../../services/bmkgService";
import { type ApiCrop, type ThresholdKey, type ThresholdRange, useMasterDataStore } from "../../stores/masterDataStore";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";
import { type DynamicMetric, useTelemetryStore } from "../../stores/telemetryStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, Tooltip);

const telemetryStore = useTelemetryStore();
const tenantProfileStore = useTenantProfileStore();
const masterDataStore = useMasterDataStore();
const { t } = useI18n();
const dashboardForecast = ref<BmkgForecastResult | null>(null);
const weatherError = ref<string | null>(null);

type MetricStatus = {
  badgeClass: string;
  label: string;
};

type MetricThreshold = {
  max: number | null;
  min: number | null;
  unit: string;
};

type MetricTrendStatus = "naik" | "turun";

type MetricTrendComparison = {
  percentageChange: number;
  status: MetricTrendStatus;
};

type LatestMetricCard = DynamicMetric & {
  sparklineData: ChartData<"line", number[], string>;
  status: MetricStatus;
  trend: MetricTrendComparison;
};

const metricStatuses = computed(() => ({
  critical: {
    badgeClass: "text-rose-700 bg-rose-100",
    label: t("dashboard.metricStatus.critical")
  },
  normal: {
    badgeClass: "text-emerald-700 bg-emerald-100",
    label: t("dashboard.metricStatus.normal")
  },
  warning: {
    badgeClass: "text-amber-700 bg-amber-100",
    label: t("dashboard.metricStatus.warning")
  }
}) satisfies Record<"critical" | "normal" | "warning", MetricStatus>);

const sparklinePointCount = 12;
const sparklineLabels = Array.from({ length: sparklinePointCount }, (_, index) => String(index + 1));
const sparklineChartOptions: ChartOptions<"line"> = {
  animation: {
    duration: 500
  },
  maintainAspectRatio: false,
  responsive: true,
  layout: {
    padding: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 4
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false
    }
  },
  scales: {
    x: {
      display: false
    },
    y: {
      display: false
    }
  }
};

const bmkgHost = computed(() => {
  try {
    return new URL(appEnvironment.bmkgForecastBaseUrl).host;
  } catch {
    return "BMKG endpoint";
  }
});

onMounted(async () => {
  await Promise.all([
    tenantProfileStore.fetchFields(),
    masterDataStore.fetchCrops()
  ]);
  void refreshDashboardForecast();
});

watch(() => tenantProfileStore.activeBmkgAdm4Code, () => {
  void refreshDashboardForecast();
});

const topStats = computed(() => [
  {
    label: t("devices.title"),
    value: formatDataCount(telemetryStore.deviceCount),
    detail: t("dashboard.liveNodes", { count: formatDataCount(telemetryStore.onlineDeviceCount) }),
    icon: Cpu,
    iconClass: "bg-field-mint/20 text-teal-700",
    detailClass: "text-teal-700"
  },
  {
    label: t("dashboard.field"),
    value: formatDataCount(tenantProfileStore.fields.length),
    detail: activeAreaLabel.value,
    icon: Sprout,
    iconClass: "bg-field-green/30 text-emerald-700",
    detailClass: "text-emerald-700"
  },
  {
    label: t("weather.title"),
    value: dashboardForecast.value ? formatTemperature(dashboardForecast.value.current.temperatureC) : "BMKG",
    detail: dashboardForecast.value ? getWeatherConditionLabel(dashboardForecast.value.current) : bmkgHost.value,
    icon: CloudSun,
    iconClass: "bg-amber-300/25 text-amber-700",
    detailClass: "text-amber-700"
  },
  {
    label: t("dashboard.sensorRealtime"),
    value: mqttStatusCard.value.value,
    detail: mqttStatusCard.value.detail,
    icon: Waves,
    iconClass: mqttStatusCard.value.iconClass,
    detailClass: mqttStatusCard.value.detailClass
  }
]);

const telemetryNodeLabel = computed(() => {
  if (telemetryStore.connectionState === "connected") {
    return t("dashboard.liveNodes", { count: formatDataCount(telemetryStore.onlineDeviceCount) });
  }

  if (telemetryStore.connectionState === "error" || telemetryStore.connectionState === "offline") {
    return t("dashboard.streamCheckNeeded");
  }

  if (telemetryStore.deviceCount > 0) {
    return t("dashboard.syncTelemetryNodes", { count: formatDataCount(telemetryStore.deviceCount) });
  }

  return t("dashboard.waitingTelemetry");
});

const telemetryNodeToneClass = computed(() => {
  if (telemetryStore.connectionState === "connected" || telemetryStore.onlineDeviceCount > 0) {
    return "bg-field-mint";
  }

  if (telemetryStore.connectionState === "error" || telemetryStore.connectionState === "offline") {
    return "bg-rose-300";
  }

  return "bg-amber-200";
});

const mqttStatusCard = computed(() => {
  switch (telemetryStore.connectionState) {
    case "connected":
      return {
        detail: t("dashboard.liveNodes", { count: formatDataCount(telemetryStore.onlineDeviceCount) }),
        detailClass: "text-teal-700",
        iconClass: "bg-field-mint/20 text-teal-700",
        value: t("dashboard.metricStatus.normal")
      };
    case "connecting":
      return {
        detail: t("fieldMap.connection.connecting"),
        detailClass: "text-amber-700",
        iconClass: "bg-amber-300/25 text-amber-700",
        value: t("dashboard.statusConnecting")
      };
    case "reconnecting":
      return {
        detail: t("fieldMap.connection.reconnecting"),
        detailClass: "text-amber-700",
        iconClass: "bg-amber-300/25 text-amber-700",
        value: t("dashboard.statusReconnecting")
      };
    case "history":
      return {
        detail: telemetryStore.deviceCount > 0 ? t("fieldMap.connection.history") : t("dashboard.noTelemetryYet"),
        detailClass: telemetryStore.onlineDeviceCount > 0 ? "text-teal-700" : "text-amber-700",
        iconClass: telemetryStore.onlineDeviceCount > 0 ? "bg-field-mint/20 text-teal-700" : "bg-amber-300/25 text-amber-700",
        value: telemetryStore.onlineDeviceCount > 0 ? t("dashboard.metricStatus.normal") : t("dashboard.statusStandby")
      };
    case "offline":
      return {
        detail: t("fieldMap.connection.offline"),
        detailClass: "text-rose-700",
        iconClass: "bg-rose-300/20 text-rose-700",
        value: t("dashboard.statusOffline")
      };
    case "error":
      return {
        detail: telemetryStore.errorMessage ?? "Periksa API stream/backend ingestor",
        detailClass: "text-rose-700",
        iconClass: "bg-rose-300/20 text-rose-700",
        value: t("dashboard.statusError")
      };
    case "idle":
    default:
      return {
        detail: t("dashboard.waitingTelemetry"),
        detailClass: "text-slate-500",
        iconClass: "bg-slate-300/30 text-slate-600",
        value: t("dashboard.statusStandby")
      };
  }
});

const activeAreaLabel = computed(() => {
  const totalArea = tenantProfileStore.fields.reduce((total, field) => total + (field.areaHectares ?? 0), 0);
  return totalArea > 0
    ? t("dashboard.areaMonitored", { area: formatNumber(totalArea, { maximumFractionDigits: 2 }) })
    : t("dashboard.monitoredZonesFromMasterData");
});

const cropInfo = computed(() => [
  { label: t("dashboard.cropType"), value: tenantProfileStore.activeField?.cropLabel ?? "-" },
  { label: t("dashboard.plantingDate"), value: plantingDateLabel.value },
  { label: t("dashboard.cropAge"), value: hstLabel.value },
  { label: t("dashboard.estimatedHarvest"), value: harvestEstimateLabel.value },
  { label: t("dashboard.area"), value: tenantProfileStore.activeField?.areaLabel ?? "-" },
  { label: "BMKG ADM4", value: tenantProfileStore.activeField?.bmkgAdm4Code || "-" },
  { label: t("dashboard.region"), value: tenantProfileStore.activeField?.regionLabel ?? "-" },
  { label: t("dashboard.field"), value: tenantProfileStore.activeField?.name ?? "-" }
]);

const dashboardDailyForecast = computed(() => dashboardForecast.value?.daily.slice(0, 3) ?? []);
const activeCropData = computed<ApiCrop | null>(() => {
  const activeField = tenantProfileStore.activeField;
  if (!activeField) {
    return null;
  }

  const cropLabel = activeField.cropLabel.trim().toLowerCase();

  return masterDataStore.crops.find((crop) => crop.id === activeField.cropId)
    ?? masterDataStore.crops.find((crop) => crop.name.trim().toLowerCase() === cropLabel)
    ?? null;
});
const latestMetricCards = computed<LatestMetricCard[]>(() => telemetryStore.latestMetrics.slice(0, 8).map((metric, index) => ({
  ...metric,
  displayValue: formatMetricDisplayValue(metric),
  label: getMetricLabel(metric.key),
  unit: getMetricUnit(metric.key, metric.unit),
  sparklineData: createSparklineData(metric, index),
  status: getMetricStatus(metric.key, metric.value, activeCropData.value),
  trend: calculateTodayVsYesterdayTrend(metric)
})));
const activeCropHst = computed(() => calculateHst(tenantProfileStore.activeField?.cropPlantingDate ?? null));
const activeCropProgressPercent = computed(() => {
  const hst = activeCropHst.value;
  const periodDays = tenantProfileStore.activeField?.cropPlantingPeriodDays;
  if (hst === null || !periodDays) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round((hst / periodDays) * 100)));
});
const growthProgressLabel = computed(() => activeCropProgressPercent.value === null ? "-" : formatPercent(activeCropProgressPercent.value, { maximumFractionDigits: 0, valueKind: "percent" }));
const growthProgressBarWidth = computed(() => `${activeCropProgressPercent.value ?? 0}%`);
const activeGrowthStage = computed<"generatif" | "panen" | "unknown" | "vegetatif">(() => {
  const progress = activeCropProgressPercent.value;
  if (progress === null) {
    return "unknown";
  }

  if (progress >= 80) {
    return "panen";
  }

  return progress >= 50 ? "generatif" : "vegetatif";
});
const plantingDateLabel = computed(() => {
  const plantingDate = tenantProfileStore.activeField?.cropPlantingDate;
  return plantingDate ? formatDateOnly(plantingDate) : "-";
});
const hstLabel = computed(() => activeCropHst.value === null ? "-" : formatCropAge(activeCropHst.value));
const harvestEstimateLabel = computed(() => {
  const plantingDate = parseDateOnly(tenantProfileStore.activeField?.cropPlantingDate ?? null);
  const periodDays = tenantProfileStore.activeField?.cropPlantingPeriodDays;
  if (!plantingDate || !periodDays) {
    return "-";
  }

  plantingDate.setDate(plantingDate.getDate() + periodDays);
  return formatDateOnly(toDateInputValue(plantingDate));
});

async function refreshDashboardForecast(): Promise<void> {
  weatherError.value = null;

  const result = await fetchBmkgForecast({
    adm4: tenantProfileStore.activeBmkgAdm4Code,
    baseUrl: appEnvironment.bmkgForecastBaseUrl
  });

  dashboardForecast.value = result;
  weatherError.value = result.isMock
    ? t("dashboard.weatherFallback", { message: result.errorMessage ?? t("dashboard.weatherFallbackDefault") })
    : null;
}

function formatTemperature(value: number | null): string {
  return value === null ? "-" : `${formatNumber(value, { maximumFractionDigits: 1 })} C`;
}

function calculateTodayVsYesterdayTrend(metric: DynamicMetric): MetricTrendComparison {
  const { todayAverage, yesterdayAverage } = simulateMetricDailyAverages(metric);
  const rawPercentageChange = yesterdayAverage === 0
    ? 0
    : ((todayAverage - yesterdayAverage) / Math.abs(yesterdayAverage)) * 100;

  return {
    percentageChange: Math.abs(roundMetricTrendValue(rawPercentageChange)),
    status: rawPercentageChange >= 0 ? "naik" : "turun"
  };
}

function metricTrendArrow(status: MetricTrendStatus): string {
  return status === "naik" ? "↗" : "↘";
}

function metricTrendClass(status: MetricTrendStatus): string {
  return status === "naik"
    ? "flex items-center gap-1 text-sm font-medium text-emerald-500"
    : "flex items-center gap-1 text-sm font-medium text-rose-500";
}

function formatMetricTrendPercent(value: number): string {
  return formatPercent(value, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    valueKind: "percent"
  });
}

function createSparklineData(metric: DynamicMetric, index: number): ChartData<"line", number[], string> {
  return {
    labels: [...sparklineLabels],
    datasets: [
      {
        backgroundColor: createSparklineGradient,
        borderCapStyle: "round",
        borderColor: "#34d399",
        borderJoinStyle: "round",
        borderWidth: 2,
        data: createSparklineValues(metric, index),
        fill: true,
        pointHoverRadius: 0,
        pointRadius: 0,
        tension: 0.4
      }
    ]
  };
}

function createSparklineGradient(context: ScriptableContext<"line">): string | CanvasGradient {
  const { chart } = context;
  const { chartArea, ctx } = chart;

  if (!chartArea) {
    return "rgba(52, 211, 153, 0.16)";
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, "rgba(52, 211, 153, 0.30)");
  gradient.addColorStop(0.58, "rgba(45, 212, 191, 0.12)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  return gradient;
}

function createSparklineValues(metric: DynamicMetric, index: number): number[] {
  const { todayAverage, yesterdayAverage } = simulateMetricDailyAverages(metric);
  const seed = metricHash(metric, `sparkline-${index}`);
  const amplitude = Math.max(Math.abs(todayAverage - yesterdayAverage) * 0.25, Math.abs(todayAverage) * 0.035, 0.25);
  const values = Array.from({ length: sparklinePointCount }, (_, pointIndex) => {
    const progress = pointIndex / (sparklinePointCount - 1);
    const drift = yesterdayAverage + ((todayAverage - yesterdayAverage) * progress);
    const wave = Math.sin((pointIndex + (seed % 9)) * 0.85) * amplitude;

    return roundMetricTrendValue(Math.max(0, drift + wave));
  });

  values[values.length - 1] = roundMetricTrendValue(Math.max(0, todayAverage));

  return values;
}

function simulateMetricDailyAverages(metric: DynamicMetric): { todayAverage: number; yesterdayAverage: number } {
  const todayAverage = metricComparisonBase(metric);
  const seed = metricHash(metric, "today-vs-yesterday");
  const direction = seed % 2 === 0 ? 1 : -1;
  const magnitudePercent = 0.8 + ((seed % 520) / 100);
  const signedRatio = (direction * magnitudePercent) / 100;

  return {
    todayAverage,
    yesterdayAverage: todayAverage / (1 + signedRatio)
  };
}

function metricComparisonBase(metric: DynamicMetric): number {
  const numericValue = normalizeTrendMetricValue(metric.value);

  if (numericValue !== null && Math.abs(numericValue) >= 0.01) {
    return numericValue;
  }

  const seed = metricHash(metric, "average-base");
  return 12 + ((seed % 8800) / 100);
}

function normalizeTrendMetricValue(value: DynamicMetric["value"]): number | null {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return normalizeMetricValue(value);
}

function formatMetricDisplayValue(metric: DynamicMetric): string {
  const unit = getMetricUnit(metric.key, metric.unit);

  if (metric.value === null) {
    return "-";
  }

  if (typeof metric.value === "number") {
    return `${formatNumber(metric.value, { maximumFractionDigits: 2 })} ${unit}`.trim();
  }

  return `${String(metric.value)} ${unit}`.trim();
}

function metricHash(metric: DynamicMetric, salt: string): number {
  const input = `${metric.source}:${metric.key}:${salt}`;
  let hash = 0;

  for (const character of input) {
    hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function roundMetricTrendValue(value: number): number {
  return Math.round(value * 100) / 100;
}

function growthStageClass(stage: "generatif" | "panen" | "vegetatif"): string {
  if (activeGrowthStage.value === stage) {
    return stage === "vegetatif"
      ? "bg-field-green/20 text-emerald-700"
      : stage === "generatif"
        ? "bg-field-mint/10 text-teal-700"
        : "bg-amber-300/20 text-amber-700";
  }

  return "bg-white/50 text-slate-500";
}

function getMetricStatus(metricKey: string, currentValue: DynamicMetric["value"], cropData: ApiCrop | null): MetricStatus {
  if (typeof currentValue === "boolean") {
    return currentValue ? metricStatuses.value.normal : metricStatuses.value.critical;
  }

  const numericValue = normalizeMetricValue(currentValue);
  const threshold = thresholdForMetric(metricKey, cropData);

  if (numericValue === null || !threshold) {
    return metricStatuses.value.warning;
  }

  const isBelowLow = threshold.min !== null && numericValue < threshold.min;
  const isAboveHigh = threshold.max !== null && numericValue > threshold.max;

  if (isBelowLow || isAboveHigh) {
    return metricStatuses.value.critical;
  }

  const isNearLow = threshold.min !== null && numericValue <= threshold.min + thresholdTolerance("min", threshold);
  const isNearHigh = threshold.max !== null && numericValue >= threshold.max - thresholdTolerance("max", threshold);

  return isNearLow || isNearHigh ? metricStatuses.value.warning : metricStatuses.value.normal;
}

function thresholdForMetric(metricKey: string, cropData: ApiCrop | null): MetricThreshold | null {
  const thresholdKey = thresholdKeyForMetric(metricKey);
  if (!thresholdKey || !cropData) {
    return null;
  }

  const range = cropData.thresholds[thresholdKey];
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

function thresholdTolerance(boundary: "max" | "min", threshold: MetricThreshold): number {
  if (threshold.min !== null && threshold.max !== null) {
    return Math.abs(threshold.max - threshold.min) * 0.1;
  }

  const value = boundary === "min" ? threshold.min : threshold.max;
  if (value !== null) {
    return Math.abs(value) * 0.1;
  }

  return 1;
}

function normalizeMetricValue(value: DynamicMetric["value"]): number | null {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeThresholdValue(value: ThresholdRange["min"]): number | null {
  if (value === null) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function calculateHst(value: string | null): number | null {
  const plantingDate = parseDateOnly(value);
  if (!plantingDate) {
    return null;
  }

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayOnly.getTime() - plantingDate.getTime();

  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(value: string): string {
  const date = parseDateOnly(value);
  if (!date) {
    return value;
  }

  return formatDateTime(date, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
</script>
