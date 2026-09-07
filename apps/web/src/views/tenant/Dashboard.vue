<template>
  <div class="flex flex-col space-y-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
    <aside class="contents lg:order-2 lg:col-span-4 lg:flex lg:flex-col lg:space-y-6">
      <article class="order-1 glass-panel bg-white/60 p-5 backdrop-blur-lg">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">BMKG Snapshot</p>
            <h2 class="mt-1 truncate text-lg font-semibold tracking-normal text-slate-800">{{ tenantProfileStore.activeFieldLabel }}</h2>
          </div>
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-700 shadow-glass-soft">
            <CloudRain v-if="isRainy(dashboardForecast?.current.condition)" class="h-6 w-6 text-sky-500" />
            <CloudSun v-else class="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div class="mt-5 rounded-[1.5rem] border border-white/80 bg-white/60 p-4">
          <p class="text-xs font-medium text-slate-500">ADM4 {{ tenantProfileStore.activeBmkgAdm4Code || "-" }}</p>
          <p class="mt-2 text-3xl font-semibold tracking-normal text-slate-800">
            {{ dashboardForecast ? formatTemperature(dashboardForecast.current.temperatureC) : "Loading" }}
          </p>
          <p class="mt-1 text-sm font-medium text-slate-600">{{ dashboardForecast?.current.condition ?? "Mengambil data BMKG" }}</p>
        </div>

        <div class="mt-4 grid gap-3">
          <div v-for="day in dashboardDailyForecast" :key="day.date" class="rounded-[1.25rem] border border-white/80 bg-white/60 p-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-slate-700">{{ day.dateLabel }}</p>
                <p class="mt-1 truncate text-xs text-slate-500">{{ day.summary }}</p>
              </div>
              <strong class="shrink-0 text-sm font-semibold text-teal-700">{{ formatTemperature(day.averageTemperatureC) }}</strong>
            </div>
          </div>
        </div>

        <p v-if="weatherError" class="mt-4 rounded-2xl bg-amber-100/70 px-3 py-2 text-xs font-medium text-amber-700">{{ weatherError }}</p>
      </article>

      <article class="order-3 glass-panel bg-white/60 p-5 backdrop-blur-lg">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">Detail Tanaman</p>
            <h2 class="mt-1 text-lg font-semibold tracking-normal text-slate-800">{{ tenantProfileStore.activeField?.cropLabel ?? "Crop belum dipilih" }}</h2>
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

        <div class="mt-6">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-slate-600">Growth Progress</span>
            <span class="font-semibold text-teal-700">{{ growthProgressLabel }}</span>
          </div>
          <div class="mt-3 h-4 overflow-hidden rounded-full bg-slate-200/70">
            <div class="h-full rounded-full bg-emerald-400 transition-[width]" :style="{ width: growthProgressBarWidth }"></div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span class="rounded-full py-2" :class="growthStageClass('vegetatif')">Vegetatif</span>
            <span class="rounded-full py-2" :class="growthStageClass('generatif')">Generatif</span>
            <span class="rounded-full py-2" :class="growthStageClass('panen')">Panen</span>
          </div>
        </div>
      </article>
    </aside>

    <section class="order-2 w-full glass-panel overflow-hidden bg-white/60 backdrop-blur-lg lg:order-1 lg:col-span-8">
      <div class="flex flex-wrap items-center justify-between gap-3 px-2 py-3 sm:px-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">Pemantauan Lahan</p>
          <h2 class="mt-1 text-xl font-semibold tracking-normal text-slate-800">Field Map Monitoring</h2>
          <p class="mt-1 text-sm text-slate-500">{{ tenantProfileStore.activeFieldLabel }}</p>
        </div>
        <div class="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
          <span class="h-2.5 w-2.5 rounded-full" :class="telemetryNodeToneClass"></span>
          {{ telemetryNodeLabel }}
        </div>
      </div>

      <div class="relative w-full h-[450px] lg:h-[600px] rounded-[2rem] overflow-hidden border border-white/60 shadow-sm isolate bg-slate-50">
        <FieldMap />
      </div>
    </section>

    <section class="order-4 glass-panel border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-lg lg:order-4 lg:col-span-12">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-teal-700">Sensor Realtime</p>
          <h2 class="mt-1 text-xl font-semibold tracking-normal text-slate-800">Latest Metric Set</h2>
          <p class="mt-1 text-sm text-slate-500">Dynamic MQTT payload fields</p>
        </div>
        <span class="rounded-full bg-field-mint/10 px-3 py-1.5 text-xs font-semibold text-teal-700">
          {{ latestMetricCards.length }} metrics
        </span>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan status dashboard">
        <article v-for="stat in topStats" :key="stat.label" class="rounded-[1.5rem] border border-white/80 bg-white/60 p-4 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-500">{{ stat.label }}</p>
              <p class="mt-2 text-2xl font-semibold tracking-normal text-slate-800">{{ stat.value }}</p>
            </div>
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" :class="stat.iconClass">
              <component :is="stat.icon" class="h-5 w-5" />
            </div>
          </div>
          <p class="mt-4 truncate text-sm font-medium" :class="stat.detailClass">{{ stat.detail }}</p>
        </article>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="metric in latestMetricCards"
          :key="`${metric.source}-${metric.key}`"
          class="rounded-[1.5rem] border border-white/80 bg-white/60 p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-700">{{ metric.label }}</p>
              <p class="mt-1 truncate text-xs text-slate-500">{{ metric.source }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {{ metric.unit || metric.valueType }}
            </span>
          </div>

          <div class="mt-5">
            <div class="flex items-end justify-between gap-3">
              <p class="text-2xl font-semibold tracking-normal text-slate-700">{{ metric.displayValue }}</p>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="metricStatusClass(metric)">
                {{ metricStatusLabel(metric) }}
              </span>
            </div>
            <div class="mt-4 h-5 overflow-hidden rounded-full bg-slate-200/80">
              <div
                class="h-full rounded-full transition-[width]"
                :class="metricProgressClass(metric)"
                :style="{ width: `${metricProgressPercent(metric)}%` }"
              ></div>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>0%</span>
              <span>{{ metricProgressPercent(metric) }}%</span>
            </div>
          </div>
        </article>

        <div v-if="latestMetricCards.length === 0" class="rounded-[1.5rem] border border-dashed border-white/70 bg-white/40 p-5 text-sm font-medium text-slate-500 sm:col-span-2 xl:col-span-4">
          Menunggu telemetry sensor terbaru.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CloudRain, CloudSun, Cpu, Sprout, Waves } from "@lucide/vue";
import { computed, onMounted, ref, watch } from "vue";
import FieldMap from "../../components/dashboard/FieldMap.vue";
import { appEnvironment } from "../../config/environment";
import { fetchBmkgForecast, type BmkgForecastResult } from "../../services/bmkgService";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";
import { type DynamicMetric, useTelemetryStore } from "../../stores/telemetryStore";

const telemetryStore = useTelemetryStore();
const tenantProfileStore = useTenantProfileStore();
const dashboardForecast = ref<BmkgForecastResult | null>(null);
const weatherError = ref<string | null>(null);

const bmkgHost = computed(() => {
  try {
    return new URL(appEnvironment.bmkgForecastBaseUrl).host;
  } catch {
    return "BMKG endpoint";
  }
});

onMounted(async () => {
  await tenantProfileStore.fetchFields();
  void refreshDashboardForecast();
});

watch(() => tenantProfileStore.activeBmkgAdm4Code, () => {
  void refreshDashboardForecast();
});

const topStats = computed(() => [
  {
    label: "Total Devices",
    value: telemetryStore.deviceCount.toLocaleString("id-ID"),
    detail: `${telemetryStore.onlineDeviceCount.toLocaleString("id-ID")} online`,
    icon: Cpu,
    iconClass: "bg-field-mint/20 text-teal-700",
    detailClass: "text-teal-700"
  },
  {
    label: "Active Fields",
    value: tenantProfileStore.fields.length.toLocaleString("id-ID"),
    detail: activeAreaLabel.value,
    icon: Sprout,
    iconClass: "bg-field-green/30 text-emerald-700",
    detailClass: "text-emerald-700"
  },
  {
    label: "Weather",
    value: dashboardForecast.value ? formatTemperature(dashboardForecast.value.current.temperatureC) : "BMKG",
    detail: dashboardForecast.value?.current.condition ?? bmkgHost.value,
    icon: CloudSun,
    iconClass: "bg-amber-300/25 text-amber-700",
    detailClass: "text-amber-700"
  },
  {
    label: "Realtime Status",
    value: mqttStatusCard.value.value,
    detail: mqttStatusCard.value.detail,
    icon: Waves,
    iconClass: mqttStatusCard.value.iconClass,
    detailClass: mqttStatusCard.value.detailClass
  }
]);

const telemetryNodeLabel = computed(() => {
  if (telemetryStore.connectionState === "connected") {
    return `${telemetryStore.onlineDeviceCount.toLocaleString("id-ID")} live nodes`;
  }

  if (telemetryStore.connectionState === "error" || telemetryStore.connectionState === "offline") {
    return "Stream perlu dicek";
  }

  if (telemetryStore.deviceCount > 0) {
    return `${telemetryStore.deviceCount.toLocaleString("id-ID")} telemetry nodes`;
  }

  return "Menunggu telemetry";
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
        detail: `${telemetryStore.onlineDeviceCount.toLocaleString("id-ID")} live nodes via backend`,
        detailClass: "text-teal-700",
        iconClass: "bg-field-mint/20 text-teal-700",
        value: "Normal"
      };
    case "connecting":
      return {
        detail: "Membuka stream backend",
        detailClass: "text-amber-700",
        iconClass: "bg-amber-300/25 text-amber-700",
        value: "Connecting"
      };
    case "reconnecting":
      return {
        detail: "Menyambung ulang stream",
        detailClass: "text-amber-700",
        iconClass: "bg-amber-300/25 text-amber-700",
        value: "Reconnect"
      };
    case "history":
      return {
        detail: telemetryStore.deviceCount > 0 ? "Telemetry DB tersinkron" : "Belum ada data live",
        detailClass: telemetryStore.onlineDeviceCount > 0 ? "text-teal-700" : "text-amber-700",
        iconClass: telemetryStore.onlineDeviceCount > 0 ? "bg-field-mint/20 text-teal-700" : "bg-amber-300/25 text-amber-700",
        value: telemetryStore.onlineDeviceCount > 0 ? "Normal" : "Standby"
      };
    case "offline":
      return {
        detail: "Stream backend terputus",
        detailClass: "text-rose-700",
        iconClass: "bg-rose-300/20 text-rose-700",
        value: "Offline"
      };
    case "error":
      return {
        detail: telemetryStore.errorMessage ?? "Periksa API stream/backend ingestor",
        detailClass: "text-rose-700",
        iconClass: "bg-rose-300/20 text-rose-700",
        value: "Error"
      };
    case "idle":
    default:
      return {
        detail: "Menunggu telemetry",
        detailClass: "text-slate-500",
        iconClass: "bg-slate-300/30 text-slate-600",
        value: "Standby"
      };
  }
});

const activeAreaLabel = computed(() => {
  const totalArea = tenantProfileStore.fields.reduce((total, field) => total + (field.areaHectares ?? 0), 0);
  return totalArea > 0 ? `${totalArea.toLocaleString("id-ID")} ha monitored` : "Zona dari Master Data";
});

const cropInfo = computed(() => [
  { label: "Crop Type", value: tenantProfileStore.activeField?.cropLabel ?? "-" },
  { label: "Tanggal Tanam", value: plantingDateLabel.value },
  { label: "Umur Tanaman", value: hstLabel.value },
  { label: "Estimasi Panen", value: harvestEstimateLabel.value },
  { label: "Area", value: tenantProfileStore.activeField?.areaLabel ?? "-" },
  { label: "BMKG ADM4", value: tenantProfileStore.activeField?.bmkgAdm4Code || "-" },
  { label: "Region", value: tenantProfileStore.activeField?.regionLabel ?? "-" },
  { label: "Field", value: tenantProfileStore.activeField?.name ?? "-" }
]);

const latestMetricCards = computed(() => telemetryStore.latestMetrics.slice(0, 8));
const dashboardDailyForecast = computed(() => dashboardForecast.value?.daily.slice(0, 3) ?? []);
const activeCropHst = computed(() => calculateHst(tenantProfileStore.activeField?.cropPlantingDate ?? null));
const activeCropProgressPercent = computed(() => {
  const hst = activeCropHst.value;
  const periodDays = tenantProfileStore.activeField?.cropPlantingPeriodDays;
  if (hst === null || !periodDays) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round((hst / periodDays) * 100)));
});
const growthProgressLabel = computed(() => activeCropProgressPercent.value === null ? "-" : `${activeCropProgressPercent.value}%`);
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
const hstLabel = computed(() => activeCropHst.value === null ? "-" : `${activeCropHst.value} HST`);
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
    ? `BMKG fallback: ${result.errorMessage ?? "menggunakan data cadangan."}`
    : null;
}

function formatTemperature(value: number | null): string {
  return value === null ? "-" : `${value} C`;
}

function isRainy(condition?: string): boolean {
  return condition?.toLowerCase().includes("hujan") ?? false;
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

function metricProgressPercent(metric: DynamicMetric): number {
  if (metric.valueType === "boolean") {
    return metric.value === true ? 100 : 0;
  }

  if (metric.valueType !== "number" || typeof metric.value !== "number") {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(metric.value)));
}

function metricStatusLabel(metric: DynamicMetric): string {
  const level = metricStatusLevel(metric);
  if (level === "critical") {
    return "Kritis";
  }

  return level === "warning" ? "Waspada" : "Normal";
}

function metricStatusClass(metric: DynamicMetric): string {
  const level = metricStatusLevel(metric);
  if (level === "critical") {
    return "bg-rose-100 text-rose-700";
  }

  return level === "warning" ? "bg-amber-100 text-amber-700" : "bg-field-mint/10 text-teal-700";
}

function metricProgressClass(metric: DynamicMetric): string {
  const level = metricStatusLevel(metric);
  if (level === "critical") {
    return "bg-rose-400";
  }

  return level === "warning" ? "bg-amber-300" : "bg-emerald-400";
}

function metricStatusLevel(metric: DynamicMetric): "critical" | "normal" | "warning" {
  const percent = metricProgressPercent(metric);
  if (metric.valueType === "boolean") {
    return metric.value === true ? "normal" : "critical";
  }

  if (metric.valueType !== "number") {
    return "warning";
  }

  if (percent < 25 || percent > 85) {
    return "critical";
  }

  if (percent < 40 || percent > 70) {
    return "warning";
  }

  return "normal";
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

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
</script>
