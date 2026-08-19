<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Top level stats and weather">
      <article v-for="stat in topStats" :key="stat.label" class="panel-surface p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-slate-400">{{ stat.label }}</p>
            <p class="mt-2 text-2xl font-semibold tracking-normal text-white">{{ stat.value }}</p>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-lg" :class="stat.iconClass">
            <component :is="stat.icon" class="h-5 w-5" />
          </div>
        </div>
        <p class="mt-4 text-sm" :class="stat.detailClass">{{ stat.detail }}</p>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
      <article class="panel-surface overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Field Map Monitoring</h2>
            <p class="mt-1 text-sm text-slate-400">{{ tenantProfileStore.activeFieldLabel }}</p>
          </div>
          <div class="flex items-center gap-2 rounded-full border border-field-mint/25 bg-field-mint/10 px-3 py-1 text-sm text-field-mint">
            <span class="h-2 w-2 rounded-full" :class="telemetryNodeToneClass"></span>
            {{ telemetryNodeLabel }}
          </div>
        </div>

        <FieldMap />
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Crop Information Panel</h2>
            <p class="mt-1 text-sm text-slate-400">{{ tenantProfileStore.activeField?.cropLabel ?? "Crop belum dipilih" }}</p>
          </div>
          <Sprout class="h-6 w-6 text-field-green" />
        </div>

        <dl class="mt-6 grid gap-4">
          <div v-for="item in cropInfo" :key="item.label" class="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
            <dt class="text-sm text-slate-400">{{ item.label }}</dt>
            <dd class="text-right text-sm font-semibold text-white">{{ item.value }}</dd>
          </div>
        </dl>

        <div class="mt-6">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-slate-300">Growth Progress</span>
            <span class="font-semibold text-field-mint">{{ growthProgressLabel }}</span>
          </div>
          <div class="mt-3 h-3 rounded-full bg-white/10">
            <div class="h-full rounded-full bg-field-green transition-[width]" :style="{ width: growthProgressBarWidth }"></div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <span class="rounded-lg py-2" :class="growthStageClass('vegetatif')">Vegetatif</span>
            <span class="rounded-lg py-2" :class="growthStageClass('generatif')">Generatif</span>
            <span class="rounded-lg py-2" :class="growthStageClass('panen')">Panen</span>
          </div>
        </div>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article class="panel-surface p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Latest Metric Set</h2>
            <p class="mt-1 text-sm text-slate-400">Dynamic MQTT payload fields</p>
          </div>
          <span class="rounded-full bg-field-mint/10 px-3 py-1 text-xs font-semibold text-field-mint">
            {{ latestMetricCards.length }} metrics
          </span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="metric in latestMetricCards"
            :key="`${metric.source}-${metric.key}`"
            class="rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-white">{{ metric.label }}</p>
                <p class="mt-2 text-2xl font-semibold tracking-normal" :class="metricToneClass(metric.key)">
                  {{ metric.displayValue }}
                </p>
              </div>
              <span class="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                {{ metric.unit || metric.valueType }}
              </span>
            </div>
            <p class="mt-4 text-xs text-slate-400">{{ metric.source }}</p>
          </article>
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">BMKG Snapshot</h2>
            <p class="mt-1 text-sm text-slate-400">{{ tenantProfileStore.activeFieldLabel }}</p>
          </div>
          <CloudRain v-if="isRainy(dashboardForecast?.current.condition)" class="h-7 w-7 text-sky-200" />
          <CloudSun v-else class="h-7 w-7 text-amber-200" />
        </div>

        <div class="mt-5 rounded-lg border border-field-mint/20 bg-field-mint/10 p-4">
          <p class="text-xs text-field-mint">ADM4 {{ tenantProfileStore.activeBmkgAdm4Code || "-" }}</p>
          <p class="mt-2 text-2xl font-semibold tracking-normal text-white">
            {{ dashboardForecast ? formatTemperature(dashboardForecast.current.temperatureC) : "Loading" }}
          </p>
          <p class="mt-1 text-sm text-slate-300">{{ dashboardForecast?.current.condition ?? "Mengambil data BMKG" }}</p>
        </div>

        <div class="mt-4 grid gap-3">
          <div v-for="day in dashboardDailyForecast" :key="day.date" class="rounded-lg border border-white/10 bg-white/5 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-white">{{ day.dateLabel }}</p>
                <p class="mt-1 text-xs text-slate-400">{{ day.summary }}</p>
              </div>
              <strong class="text-sm text-field-mint">{{ formatTemperature(day.averageTemperatureC) }}</strong>
            </div>
          </div>
        </div>

        <p v-if="weatherError" class="mt-4 text-xs text-amber-100">{{ weatherError }}</p>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CloudRain, CloudSun, Cpu, Sprout, Waves } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import FieldMap from "../../components/dashboard/FieldMap.vue";
import { appEnvironment } from "../../config/environment";
import { fetchBmkgForecast, type BmkgForecastResult } from "../../services/bmkgService";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";
import { useTelemetryStore } from "../../stores/telemetryStore";

const telemetryStore = useTelemetryStore();
const tenantProfileStore = useTenantProfileStore();
const dashboardForecast = ref<BmkgForecastResult | null>(null);
const weatherError = ref<string | null>(null);
let telemetryRefreshTimer: number | undefined;

const bmkgHost = computed(() => {
  try {
    return new URL(appEnvironment.bmkgForecastBaseUrl).host;
  } catch {
    return "BMKG endpoint";
  }
});

onMounted(async () => {
  await tenantProfileStore.fetchFields();
  telemetryStore.connect();
  await telemetryStore.refreshHistory();
  telemetryRefreshTimer = window.setInterval(() => {
    void telemetryStore.refreshHistory();
  }, 30_000);
  void refreshDashboardForecast();
});

onBeforeUnmount(() => {
  if (telemetryRefreshTimer) {
    window.clearInterval(telemetryRefreshTimer);
  }
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
    iconClass: "bg-field-mint/10 text-field-mint",
    detailClass: "text-field-mint"
  },
  {
    label: "Active Fields",
    value: tenantProfileStore.fields.length.toLocaleString("id-ID"),
    detail: activeAreaLabel.value,
    icon: Sprout,
    iconClass: "bg-field-green/10 text-field-green",
    detailClass: "text-field-green"
  },
  {
    label: "Weather",
    value: dashboardForecast.value ? formatTemperature(dashboardForecast.value.current.temperatureC) : "BMKG",
    detail: dashboardForecast.value?.current.condition ?? bmkgHost.value,
    icon: CloudSun,
    iconClass: "bg-amber-300/10 text-amber-200",
    detailClass: "text-amber-200"
  },
  {
    label: "MQTT Status",
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
    return "MQTT perlu dicek";
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
        detail: `${telemetryStore.onlineDeviceCount.toLocaleString("id-ID")} live nodes`,
        detailClass: "text-field-mint",
        iconClass: "bg-field-mint/10 text-field-mint",
        value: "Normal"
      };
    case "connecting":
      return {
        detail: "Membuka koneksi MQTT",
        detailClass: "text-amber-200",
        iconClass: "bg-amber-300/10 text-amber-200",
        value: "Connecting"
      };
    case "reconnecting":
      return {
        detail: "Mencoba reconnect broker",
        detailClass: "text-amber-200",
        iconClass: "bg-amber-300/10 text-amber-200",
        value: "Reconnect"
      };
    case "history":
      return {
        detail: telemetryStore.deviceCount > 0 ? "Telemetry tersinkron" : "Belum ada data live",
        detailClass: telemetryStore.onlineDeviceCount > 0 ? "text-field-mint" : "text-amber-200",
        iconClass: telemetryStore.onlineDeviceCount > 0 ? "bg-field-mint/10 text-field-mint" : "bg-amber-300/10 text-amber-200",
        value: telemetryStore.onlineDeviceCount > 0 ? "Normal" : "Standby"
      };
    case "offline":
      return {
        detail: "Koneksi broker terputus",
        detailClass: "text-rose-200",
        iconClass: "bg-rose-300/10 text-rose-200",
        value: "Error MQTT"
      };
    case "error":
      return {
        detail: telemetryStore.errorMessage ?? "Periksa credential atau ACL",
        detailClass: "text-rose-200",
        iconClass: "bg-rose-300/10 text-rose-200",
        value: "Error MQTT"
      };
    case "idle":
    default:
      return {
        detail: "Menunggu telemetry",
        detailClass: "text-slate-400",
        iconClass: "bg-slate-300/10 text-slate-300",
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

function metricToneClass(metricKey: string): string {
  const palette = [
    "text-field-mint",
    "text-field-green",
    "text-sky-200",
    "text-amber-200",
    "text-cyan-200",
    "text-lime-200",
    "text-violet-200",
    "text-emerald-200"
  ];
  const hash = Array.from(metricKey).reduce((total, character) => total + character.charCodeAt(0), 0);

  return palette[hash % palette.length] ?? "text-field-mint";
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
      ? "bg-field-green/10 text-field-green"
      : stage === "generatif"
        ? "bg-field-mint/10 text-field-mint"
        : "bg-amber-300/10 text-amber-200";
  }

  return "bg-white/5 text-slate-400";
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
