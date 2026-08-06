<template>
  <div class="space-y-5">
    <section class="panel-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-white">Master Data Agronomi</h2>
          <p class="mt-1 text-sm text-slate-400">Crop type, zona area, dan threshold tenant.</p>
        </div>
        <span class="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
          Draft threshold perlu validasi agronomis
        </span>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-field-mint/40"
          :class="activeTab === tab.id ? 'bg-field-green text-[#102016]' : 'border border-white/10 bg-white/5 text-slate-300 hover:border-field-mint/30 hover:text-field-mint'"
          type="button"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'crops'" class="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
      <div class="grid gap-3">
        <button
          v-for="crop in crops"
          :key="crop.id"
          class="panel-surface p-4 text-left transition hover:border-field-mint/35"
          :class="selectedCropId === crop.id ? 'border-field-mint/50 bg-field-mint/10' : ''"
          type="button"
          @click="selectCrop(crop.id)"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-semibold text-white">{{ crop.name }}</p>
              <p class="mt-1 text-xs italic text-slate-400">{{ crop.latin }}</p>
            </div>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(crop.status)">
              {{ crop.status }}
            </span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <span class="rounded-lg bg-white/5 p-2">{{ crop.plantingPeriod }}</span>
            <span class="rounded-lg bg-white/5 p-2">{{ crop.varieties }}</span>
          </div>
        </button>
      </div>

      <article v-if="selectedCrop" class="panel-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold tracking-normal text-white">{{ selectedCrop.name }}</h3>
            <p class="mt-1 text-sm italic text-slate-400">{{ selectedCrop.latin }}</p>
            <p class="mt-3 max-w-2xl text-sm text-slate-300">{{ selectedCrop.description }}</p>
          </div>
          <Sprout class="h-9 w-9 text-field-green" />
        </div>

        <div class="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          {{ selectedCrop.provenance }}
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label v-for="metric in thresholdMetrics" :key="metric.key" class="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
            <span class="flex items-center justify-between gap-3 text-sm font-medium text-slate-300">
              {{ metric.label }}
              <span class="text-xs text-slate-500">{{ metric.unit }}</span>
            </span>
            <div class="grid grid-cols-2 gap-3">
              <input
                v-model.number="draftThresholds[metric.key].min"
                class="min-h-11 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
                placeholder="Min"
                step="0.1"
                type="number"
              />
              <input
                v-model.number="draftThresholds[metric.key].max"
                class="min-h-11 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
                placeholder="Max"
                step="0.1"
                type="number"
              />
            </div>
          </label>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-slate-400">{{ savedMessage }}</p>
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint"
            type="button"
            @click="saveThresholds"
          >
            <Save class="h-4 w-4" />
            Simpan Threshold
          </button>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'areas'" class="grid gap-4 lg:grid-cols-2">
      <article v-for="field in tenantProfileStore.fields" :key="field.id" class="panel-surface p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-lg font-semibold text-white">{{ field.name }}</p>
            <p class="mt-1 text-sm text-slate-400">{{ field.regionLabel }}</p>
          </div>
          <Map class="h-7 w-7 text-field-mint" />
        </div>

        <dl class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt class="text-xs text-slate-400">Area</dt>
            <dd class="mt-2 text-sm font-semibold text-white">{{ field.areaLabel }}</dd>
          </div>
          <div class="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt class="text-xs text-slate-400">Crop</dt>
            <dd class="mt-2 text-sm font-semibold text-white">{{ field.cropLabel }}</dd>
          </div>
          <div class="rounded-lg border border-white/10 bg-white/5 p-4 sm:col-span-2">
            <dt class="text-xs text-slate-400">BMKG ADM4</dt>
            <dd class="mt-2 text-sm font-semibold text-field-mint">{{ field.bmkgAdm4Code }}</dd>
          </div>
        </dl>
      </article>
    </section>

    <section v-else class="panel-surface overflow-hidden">
      <div class="border-b border-white/10 p-5">
        <h3 class="text-base font-semibold tracking-normal text-white">Threshold Matrix</h3>
        <p class="mt-1 text-sm text-slate-400">Ringkasan batas aman per crop dari data draft tenant.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[920px] w-full text-left text-sm">
          <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-5 py-4 font-semibold">Crop Type</th>
              <th v-for="metric in thresholdMetrics" :key="metric.key" class="px-5 py-4 font-semibold">{{ metric.label }}</th>
              <th class="px-5 py-4 font-semibold">Status</th>
              <th class="px-5 py-4 font-semibold">Provenance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="crop in crops" :key="crop.id" class="hover:bg-white/[0.03]">
              <td class="px-5 py-4">
                <p class="font-semibold text-white">{{ crop.name }}</p>
                <p class="mt-1 text-xs italic text-slate-400">{{ crop.latin }}</p>
              </td>
              <td v-for="metric in thresholdMetrics" :key="metric.key" class="px-5 py-4 text-slate-300">
                {{ formatRange(crop.thresholds[metric.key]) }}
              </td>
              <td class="px-5 py-4">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(crop.status)">
                  {{ crop.status }}
                </span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-400">{{ crop.provenance }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Database, Leaf, Map, Save, SlidersHorizontal, Sprout } from "@lucide/vue";
import { computed, reactive, ref, watch } from "vue";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";

type MasterTab = "crops" | "areas" | "thresholds";
type CropStatus = "Aktif" | "Review" | "Draft";
type ThresholdKey = "ph" | "moisture" | "nitrogen" | "phosphorus" | "potassium";

interface ThresholdRange {
  min: number | null;
  max: number | null;
  unit: string;
}

interface CropMasterData {
  id: string;
  name: string;
  latin: string;
  plantingPeriod: string;
  varieties: string;
  description: string;
  status: CropStatus;
  provenance: string;
  thresholds: Record<ThresholdKey, ThresholdRange>;
}

const tenantProfileStore = useTenantProfileStore();
const activeTab = ref<MasterTab>("crops");
const selectedCropId = ref("padi");
const savedMessage = ref("Perubahan tersimpan lokal sebagai mock state.");

const tabs = [
  { id: "crops" as const, label: "Crop Types", icon: Leaf },
  { id: "areas" as const, label: "Zona & Area", icon: Map },
  { id: "thresholds" as const, label: "Threshold", icon: Database }
];

const thresholdMetrics: Array<{ key: ThresholdKey; label: string; unit: string }> = [
  { key: "ph", label: "pH", unit: "range" },
  { key: "moisture", label: "Moisture", unit: "%" },
  { key: "nitrogen", label: "Nitrogen", unit: "ppm" },
  { key: "phosphorus", label: "Phosphorus", unit: "ppm" },
  { key: "potassium", label: "Potassium", unit: "ppm" }
];

const crops = ref<CropMasterData[]>([
  createCrop("padi", "Padi", "Oryza sativa", "105-120 hari", "IR64, Inpari", "Tanaman pangan utama untuk sawah irigasi dan tadah hujan.", "Aktif"),
  createCrop("jagung", "Jagung", "Zea mays", "90-110 hari", "Bisi, Pertiwi", "Komoditas palawija untuk lahan kering dan rotasi tanam.", "Review"),
  createCrop("bawang-merah", "Bawang Merah", "Allium cepa var. aggregatum", "60-75 hari", "Bima, Tajuk", "Hortikultura intensif dengan monitoring kelembapan ketat.", "Draft"),
  createCrop("cabai", "Cabai", "Capsicum annuum", "90-120 hari", "Rawit, Keriting", "Tanaman hortikultura bernilai tinggi dengan risiko cuaca dan hama.", "Review"),
  createCrop("sawit", "Sawit", "Elaeis guineensis", "25-30 tahun", "DxP", "Tanaman perkebunan jangka panjang untuk blok monitoring luas.", "Draft")
]);

const draftThresholds = reactive<Record<ThresholdKey, ThresholdRange>>({
  ph: { min: null, max: null, unit: "range" },
  moisture: { min: null, max: null, unit: "%" },
  nitrogen: { min: null, max: null, unit: "ppm" },
  phosphorus: { min: null, max: null, unit: "ppm" },
  potassium: { min: null, max: null, unit: "ppm" }
});

const selectedCrop = computed(() => crops.value.find((crop) => crop.id === selectedCropId.value) ?? crops.value[0] ?? null);

watch(selectedCrop, () => {
  syncDraftThresholds();
}, {
  immediate: true
});

function selectCrop(cropId: string): void {
  selectedCropId.value = cropId;
}

function saveThresholds(): void {
  if (!selectedCrop.value) {
    return;
  }

  selectedCrop.value.thresholds = cloneThresholds(draftThresholds);
  selectedCrop.value.status = "Review";
  savedMessage.value = `Threshold ${selectedCrop.value.name} tersimpan lokal pada ${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date())}.`;
}

function syncDraftThresholds(): void {
  if (!selectedCrop.value) {
    return;
  }

  for (const metric of thresholdMetrics) {
    draftThresholds[metric.key].min = selectedCrop.value.thresholds[metric.key].min;
    draftThresholds[metric.key].max = selectedCrop.value.thresholds[metric.key].max;
    draftThresholds[metric.key].unit = selectedCrop.value.thresholds[metric.key].unit;
  }
}

function createCrop(
  id: string,
  name: string,
  latin: string,
  plantingPeriod: string,
  varieties: string,
  description: string,
  status: CropStatus
): CropMasterData {
  const seed = id.length;

  return {
    id,
    name,
    latin,
    plantingPeriod,
    varieties,
    description,
    status,
    provenance: "Mock tenant baseline, pending agronomist validation before production use.",
    thresholds: {
      ph: { min: 5.5 + (seed % 3) * 0.2, max: 7.1 + (seed % 2) * 0.2, unit: "range" },
      moisture: { min: 42 + seed, max: 72 + (seed % 4), unit: "%" },
      nitrogen: { min: 35 + seed * 2, max: 85 + seed * 2, unit: "ppm" },
      phosphorus: { min: 12 + seed, max: 40 + seed, unit: "ppm" },
      potassium: { min: 70 + seed * 3, max: 160 + seed * 4, unit: "ppm" }
    }
  };
}

function cloneThresholds(source: Record<ThresholdKey, ThresholdRange>): Record<ThresholdKey, ThresholdRange> {
  return {
    ph: { ...source.ph },
    moisture: { ...source.moisture },
    nitrogen: { ...source.nitrogen },
    phosphorus: { ...source.phosphorus },
    potassium: { ...source.potassium }
  };
}

function formatRange(range: ThresholdRange): string {
  if (range.min === null || range.max === null) {
    return "-";
  }

  return `${range.min}-${range.max}${range.unit === "range" ? "" : ` ${range.unit}`}`;
}

function statusClass(status: CropStatus): string {
  if (status === "Aktif") {
    return "bg-field-mint/10 text-field-mint";
  }

  if (status === "Review") {
    return "bg-amber-300/10 text-amber-100";
  }

  return "bg-slate-500/10 text-slate-300";
}
</script>
