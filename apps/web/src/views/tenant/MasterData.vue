<template>
  <div class="space-y-5">
    <section class="panel-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-white">Master Data Agronomi</h2>
          <p class="mt-1 text-sm text-slate-400">Crop type, zona area, dan threshold tenant dari API.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
            Threshold perlu validasi agronomis
          </span>
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-full bg-field-green px-4 text-sm font-semibold text-[#102016] hover:bg-field-mint"
            type="button"
            @click="openCreateModal"
          >
            <Plus class="h-4 w-4" />
            Tambah Crop
          </button>
        </div>
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

      <div v-if="errorMessage" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {{ errorMessage }}
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
              <p class="mt-1 text-xs italic text-slate-400">{{ crop.latinName ?? "-" }}</p>
            </div>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(crop.status)">
              {{ statusLabel(crop.status) }}
            </span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <span class="rounded-lg bg-white/5 p-2">{{ plantingPeriodLabel(crop.plantingPeriodDays) }}</span>
            <span class="rounded-lg bg-white/5 p-2">{{ crop.varieties.join(", ") || "Varietas belum diisi" }}</span>
          </div>
        </button>

        <div v-if="isLoading" class="panel-surface p-6 text-center text-sm text-slate-400">
          Memuat crop dari API.
        </div>

        <div v-else-if="crops.length === 0" class="panel-surface p-6 text-center text-sm text-slate-400">
          Belum ada crop type. Tambahkan crop pertama untuk tenant ini.
        </div>
      </div>

      <article v-if="selectedCrop" class="panel-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold tracking-normal text-white">{{ selectedCrop.name }}</h3>
            <p class="mt-1 text-sm italic text-slate-400">{{ selectedCrop.latinName ?? "-" }}</p>
            <p class="mt-3 max-w-2xl text-sm text-slate-300">{{ selectedCrop.description ?? "Deskripsi belum diisi." }}</p>
          </div>
          <Sprout class="h-9 w-9 text-field-green" />
        </div>

        <div class="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          {{ selectedCrop.thresholdSource ?? "Belum ada sumber threshold. Isi provenance sebelum dipakai untuk rekomendasi produksi." }}
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
            class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60"
            :disabled="isSaving"
            type="button"
            @click="saveThresholds"
          >
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan Threshold" }}
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
        <p class="mt-1 text-sm text-slate-400">Ringkasan batas aman per crop dari API tenant.</p>
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
                <p class="mt-1 text-xs italic text-slate-400">{{ crop.latinName ?? "-" }}</p>
              </td>
              <td v-for="metric in thresholdMetrics" :key="metric.key" class="px-5 py-4 text-slate-300">
                {{ formatRange(crop.thresholds[metric.key]) }}
              </td>
              <td class="px-5 py-4">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(crop.status)">
                  {{ statusLabel(crop.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-400">{{ crop.thresholdSource ?? "-" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="crops.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Belum ada threshold crop dari API.
      </div>
    </section>

    <div v-if="isCreateModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-xl rounded-lg border border-field-mint/20 bg-[#101f32] p-5 shadow-field" @submit.prevent="submitCrop">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Tambah Crop Type</h2>
            <p class="mt-1 text-sm text-slate-400">Data masuk ke endpoint tenant `/crops`.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeCreateModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Nama</span>
              <input v-model.trim="cropForm.name" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" required type="text" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Latin</span>
              <input v-model.trim="cropForm.latinName" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" type="text" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Periode Tanam (hari)</span>
              <input v-model.number="cropForm.plantingPeriodDays" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" min="1" type="number" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Status</span>
              <select v-model="cropForm.status" class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25">
                <option value="active">Aktif</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Varietas</span>
            <input v-model.trim="cropForm.varieties" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" placeholder="IR64, Inpari" type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Deskripsi</span>
            <textarea v-model.trim="cropForm.description" class="min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"></textarea>
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeCreateModal">
            Batal
          </button>
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan Crop" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, Leaf, Map, Plus, Save, Sprout, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  thresholdMetrics,
  useMasterDataStore,
  type ApiCrop,
  type CropStatus,
  type ThresholdKey,
  type ThresholdRange
} from "../../stores/masterDataStore";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";

type MasterTab = "crops" | "areas" | "thresholds";

const tenantProfileStore = useTenantProfileStore();
const masterDataStore = useMasterDataStore();
const { crops, errorMessage, isLoading, isSaving } = storeToRefs(masterDataStore);
const activeTab = ref<MasterTab>("crops");
const selectedCropId = ref("");
const savedMessage = ref("Perubahan threshold akan dikirim ke API tenant.");
const isCreateModalOpen = ref(false);
const cropForm = reactive<{
  description: string;
  latinName: string;
  name: string;
  plantingPeriodDays: number | null;
  status: CropStatus;
  varieties: string;
}>({
  description: "",
  latinName: "",
  name: "",
  plantingPeriodDays: null,
  status: "draft",
  varieties: ""
});

const draftThresholds = reactive<Record<ThresholdKey, ThresholdRange>>({
  ph: { max: null, min: null, unit: "range" },
  moisture: { max: null, min: null, unit: "%" },
  nitrogen: { max: null, min: null, unit: "ppm" },
  phosphorus: { max: null, min: null, unit: "ppm" },
  potassium: { max: null, min: null, unit: "ppm" }
});

const tabs = [
  { id: "crops" as const, label: "Crop Types", icon: Leaf },
  { id: "areas" as const, label: "Zona & Area", icon: Map },
  { id: "thresholds" as const, label: "Threshold", icon: Database }
];

const selectedCrop = computed(() => crops.value.find((crop) => crop.id === selectedCropId.value) ?? crops.value[0] ?? null);

onMounted(async () => {
  await masterDataStore.fetchCrops();
  selectedCropId.value = crops.value[0]?.id ?? "";
});

watch(selectedCrop, () => {
  syncDraftThresholds();
}, {
  immediate: true
});

function selectCrop(cropId: string): void {
  selectedCropId.value = cropId;
}

async function saveThresholds(): Promise<void> {
  if (!selectedCrop.value) {
    return;
  }

  const updated = await masterDataStore.updateCrop(selectedCrop.value.id, {
    thresholds: cloneThresholds(draftThresholds)
  });

  if (updated) {
    savedMessage.value = `Threshold ${updated.name} tersimpan pada ${new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())}.`;
  }
}

function openCreateModal(): void {
  cropForm.description = "";
  cropForm.latinName = "";
  cropForm.name = "";
  cropForm.plantingPeriodDays = null;
  cropForm.status = "draft";
  cropForm.varieties = "";
  masterDataStore.clearError();
  isCreateModalOpen.value = true;
}

function closeCreateModal(): void {
  isCreateModalOpen.value = false;
}

async function submitCrop(): Promise<void> {
  const created = await masterDataStore.createCrop({
    description: cropForm.description || null,
    latinName: cropForm.latinName || null,
    name: cropForm.name,
    plantingPeriodDays: cropForm.plantingPeriodDays,
    status: cropForm.status,
    thresholdSource: "Tenant managed threshold, pending agronomist validation.",
    thresholds: cloneThresholds(draftThresholds),
    varieties: cropForm.varieties.split(",").map((value) => value.trim()).filter(Boolean)
  });

  if (created) {
    selectedCropId.value = created.id;
    closeCreateModal();
  }
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

function cloneThresholds(source: Record<ThresholdKey, ThresholdRange>): Record<ThresholdKey, ThresholdRange> {
  return {
    moisture: { ...source.moisture },
    nitrogen: { ...source.nitrogen },
    ph: { ...source.ph },
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

function plantingPeriodLabel(value: ApiCrop["plantingPeriodDays"]): string {
  return value ? `${value} hari` : "Periode belum diisi";
}

function statusLabel(status: CropStatus): string {
  if (status === "active") {
    return "Aktif";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Draft";
}

function statusClass(status: CropStatus): string {
  if (status === "active") {
    return "bg-field-mint/10 text-field-mint";
  }

  if (status === "draft") {
    return "bg-amber-300/10 text-amber-100";
  }

  return "bg-slate-500/10 text-slate-300";
}
</script>
