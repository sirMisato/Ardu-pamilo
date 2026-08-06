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
            <p class="mt-1 text-sm text-slate-400">Kebun Utara / 14.8 ha</p>
          </div>
          <div class="flex items-center gap-2 rounded-full border border-field-mint/25 bg-field-mint/10 px-3 py-1 text-sm text-field-mint">
            <span class="h-2 w-2 rounded-full bg-field-mint"></span>
            Live nodes
          </div>
        </div>

        <div class="relative min-h-[420px] overflow-hidden bg-[#0a1728]">
          <div class="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(142,240,202,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(142,240,202,0.08)_1px,transparent_1px)] [background-size:42px_42px]"></div>
          <div class="absolute left-[7%] top-[14%] h-[72%] w-[84%] rounded-[34%_42%_32%_38%] border border-field-green/40 bg-field-green/10"></div>
          <div class="absolute left-[16%] top-[22%] h-[50%] w-[62%] rounded-[42%_30%_40%_35%] border border-field-mint/25 bg-field-mint/10"></div>

          <button
            v-for="node in mapNodes"
            :key="node.id"
            class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-field backdrop-blur"
            :class="node.online ? 'border-field-mint/50 bg-field-mint/20 text-field-mint' : 'border-rose-300/40 bg-rose-400/10 text-rose-200'"
            :style="{ left: node.x, top: node.y }"
            type="button"
          >
            <MapPin class="h-4 w-4" />
            {{ node.label }}
          </button>

          <div class="absolute bottom-5 left-5 right-5 grid gap-3 rounded-lg border border-white/10 bg-[#07111f]/90 p-4 backdrop-blur md:left-auto md:w-80">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-white">Soil Node A</p>
                <p class="text-xs text-field-mint">Online / 12 seconds ago</p>
              </div>
              <Activity class="h-5 w-5 text-field-mint" />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="metric in selectedNodeMetrics" :key="metric.key" class="rounded-lg border border-white/10 bg-white/5 p-2">
                <p class="text-[11px] uppercase tracking-normal text-slate-400">{{ metric.key }}</p>
                <p class="mt-1 text-sm font-semibold text-white">{{ metric.value }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="min-h-10 flex-1 rounded-lg bg-field-green px-3 text-sm font-semibold text-[#112016]" type="button">Details</button>
              <button class="min-h-10 flex-1 rounded-lg border border-field-mint/30 px-3 text-sm font-semibold text-field-mint" type="button">Laporan</button>
            </div>
          </div>
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Crop Information Panel</h2>
            <p class="mt-1 text-sm text-slate-400">Padi IR64 / Plot A</p>
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
            <span class="font-semibold text-field-mint">62%</span>
          </div>
          <div class="mt-3 h-3 rounded-full bg-white/10">
            <div class="h-full w-[62%] rounded-full bg-field-green"></div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <span class="rounded-lg bg-field-green/10 py-2 text-field-green">Vegetatif</span>
            <span class="rounded-lg bg-field-mint/10 py-2 text-field-mint">Generatif</span>
            <span class="rounded-lg bg-white/5 py-2 text-slate-400">Panen</span>
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
          <span class="rounded-full bg-field-mint/10 px-3 py-1 text-xs font-semibold text-field-mint">8 metrics</span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article v-for="metric in latestMetrics" :key="metric.key" class="rounded-lg border border-white/10 bg-white/5 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-white">{{ metric.label }}</p>
                <p class="mt-2 text-2xl font-semibold tracking-normal" :class="metric.tone">{{ metric.value }}</p>
              </div>
              <span class="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{{ metric.unit }}</span>
            </div>
            <p class="mt-4 text-xs text-slate-400">{{ metric.source }}</p>
          </article>
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">BMKG Snapshot</h2>
            <p class="mt-1 text-sm text-slate-400">Kecamatan demo</p>
          </div>
          <CloudSun class="h-7 w-7 text-amber-200" />
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div v-for="weather in weatherSnapshot" :key="weather.label" class="rounded-lg border border-white/10 bg-white/5 p-4">
            <p class="text-xs text-slate-400">{{ weather.label }}</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ weather.value }}</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Activity, CloudSun, Cpu, MapPin, Sprout, Waves } from "@lucide/vue";

const topStats = [
  {
    label: "Total Devices",
    value: "42",
    detail: "38 online / 4 offline",
    icon: Cpu,
    iconClass: "bg-field-mint/10 text-field-mint",
    detailClass: "text-field-mint"
  },
  {
    label: "Active Fields",
    value: "12",
    detail: "148.4 ha monitored",
    icon: Sprout,
    iconClass: "bg-field-green/10 text-field-green",
    detailClass: "text-field-green"
  },
  {
    label: "Weather",
    value: "29.4 C",
    detail: "BMKG cloudy light rain",
    icon: CloudSun,
    iconClass: "bg-amber-300/10 text-amber-200",
    detailClass: "text-amber-200"
  },
  {
    label: "Realtime",
    value: "SSE",
    detail: "Telemetry stream connected",
    icon: Waves,
    iconClass: "bg-sky-300/10 text-sky-200",
    detailClass: "text-sky-200"
  }
];

const mapNodes = [
  { id: "node-a", label: "A", x: "35%", y: "42%", online: true },
  { id: "node-b", label: "B", x: "58%", y: "36%", online: true },
  { id: "node-c", label: "C", x: "67%", y: "62%", online: false },
  { id: "node-d", label: "D", x: "46%", y: "68%", online: true }
];

const selectedNodeMetrics = [
  { key: "pH", value: "6.7" },
  { key: "N", value: "18 ppm" },
  { key: "Moisture", value: "42%" }
];

const cropInfo = [
  { label: "Crop Type", value: "Padi IR64" },
  { label: "Crop Age", value: "74 days" },
  { label: "Planting Date", value: "24 Mei 2026" },
  { label: "Estimated Harvest", value: "18 Sep 2026" },
  { label: "Growth Stage", value: "Generatif Awal" }
];

const latestMetrics = [
  { key: "ph", label: "pH Tanah", value: "6.7", unit: "pH", source: "soil-node-a", tone: "text-field-mint" },
  { key: "nitrogen", label: "Nitrogen", value: "18", unit: "ppm", source: "soil-node-a", tone: "text-field-green" },
  { key: "moisture", label: "Moisture", value: "42.1", unit: "%", source: "soil-node-a", tone: "text-sky-200" },
  { key: "temperature", label: "Temperature", value: "29.4", unit: "C", source: "soil-node-b", tone: "text-amber-200" },
  { key: "conductivity", label: "Conductivity", value: "1.2", unit: "mS/cm", source: "soil-node-b", tone: "text-cyan-200" },
  { key: "potassium", label: "Potassium", value: "24", unit: "ppm", source: "soil-node-c", tone: "text-lime-200" },
  { key: "phosphorus", label: "Phosphorus", value: "12", unit: "ppm", source: "soil-node-c", tone: "text-violet-200" },
  { key: "battery", label: "Battery", value: "87", unit: "%", source: "soil-node-a", tone: "text-emerald-200" }
];

const weatherSnapshot = [
  { label: "Rainfall", value: "2.4 mm" },
  { label: "Humidity", value: "78%" },
  { label: "Wind", value: "8 km/j" },
  { label: "Updated", value: "13:40" }
];
</script>
