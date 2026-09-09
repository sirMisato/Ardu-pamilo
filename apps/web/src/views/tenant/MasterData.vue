<template>
  <div class="space-y-5 text-slate-700">
    <section class="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-slate-700">Master Data Agronomi</h2>
          <p class="mt-1 text-sm text-slate-600">Crop type, zona area, dan threshold tenant dari API.</p>
        </div>
        <button
          class="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400"
          type="button"
          @click="activeTab === 'areas' ? openAreaModal() : openCropModal()"
        >
          <Plus class="h-4 w-4" />
          {{ activeTab === "areas" ? "Tambah Area" : "Tambah Crop" }}
        </button>
      </div>

      <div class="mt-5 mb-6 flex w-fit flex-wrap gap-2 rounded-full border border-white/60 bg-white/40 p-1 shadow-sm backdrop-blur-md">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          :class="activeTab === tab.id ? 'bg-emerald-300 text-emerald-950 shadow-sm' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'"
          type="button"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
        {{ errorMessage }}
      </div>
    </section>

    <section v-if="activeTab === 'crops'" class="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
      <div class="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
        <div class="grid gap-3">
          <article
            v-for="crop in crops"
            :key="crop.id"
            class="rounded-2xl border border-slate-200/80 bg-white/50 p-4 text-left shadow-sm transition hover:border-emerald-300/70 hover:bg-white/70"
            :class="selectedCropId === crop.id ? 'border-emerald-300 bg-emerald-50/80 ring-2 ring-emerald-200/60' : ''"
          >
            <button class="w-full text-left" type="button" @click="selectCrop(crop.id)">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-semibold text-slate-700">{{ crop.name }}</p>
                  <p class="mt-1 text-xs italic text-slate-500">{{ crop.latinName ?? "-" }}</p>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="crop.status === 'active' ? 'bg-emerald-100 text-emerald-700' : crop.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'"
                >
                  {{ statusLabel(crop.status) }}
                </span>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <span class="rounded-lg border border-slate-200/70 bg-white/50 p-2">{{ plantingPeriodLabel(crop.plantingPeriodDays) }}</span>
                <span class="rounded-lg border border-slate-200/70 bg-white/50 p-2">{{ plantingDateLabel(crop.plantingDate) }}</span>
                <span class="rounded-lg border border-slate-200/70 bg-white/50 p-2">{{ hstLabel(crop) }}</span>
                <span class="rounded-lg border border-slate-200/70 bg-white/50 p-2">{{ crop.varieties.join(", ") || "Varietas belum diisi" }}</span>
              </div>
            </button>
            <div class="mt-4 flex justify-end gap-2 border-t border-slate-200/70 pt-3">
              <button class="icon-button" type="button" :aria-label="`Edit ${crop.name}`" @click="openCropModal(crop)">
                <Pencil class="h-4 w-4" />
              </button>
              <button class="icon-button" type="button" :aria-label="`Hapus ${crop.name}`" @click="removeCrop(crop)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </article>

        <div v-if="isLoading" class="rounded-2xl border border-slate-200/80 bg-white/50 p-6 text-center text-sm text-slate-500">
          Memuat data.
        </div>

        <div v-else-if="crops.length === 0" class="rounded-2xl border border-slate-200/80 bg-white/50 p-6 text-center text-sm text-slate-500">
          Belum ada crop type.
        </div>
        </div>
      </div>

      <article v-if="selectedCrop" class="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold tracking-normal text-slate-700">{{ selectedCrop.name }}</h3>
            <p class="mt-1 text-sm italic text-slate-500">{{ selectedCrop.latinName ?? "-" }}</p>
            <p class="mt-3 max-w-2xl text-sm text-slate-600">{{ selectedCrop.description ?? "Deskripsi belum diisi." }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="icon-button" type="button" :aria-label="`Edit ${selectedCrop.name}`" @click="openCropModal(selectedCrop)">
              <Pencil class="h-4 w-4" />
            </button>
            <button class="icon-button" type="button" :aria-label="`Hapus ${selectedCrop.name}`" @click="removeCrop(selectedCrop)">
              <Trash2 class="h-4 w-4" />
            </button>
            <Sprout class="h-9 w-9 text-field-green" />
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Tanggal Tanam</p>
            <p class="mt-2 text-sm font-semibold text-slate-700">{{ plantingDateLabel(selectedCrop.plantingDate) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Umur Tanaman</p>
            <p class="mt-2 text-sm font-semibold text-emerald-700">{{ hstLabel(selectedCrop) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Progress</p>
            <p class="mt-2 text-sm font-semibold text-slate-700">{{ cropProgressLabel(selectedCrop) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Estimasi Panen</p>
            <p class="mt-2 text-sm font-semibold text-slate-700">{{ harvestEstimateLabel(selectedCrop) }}</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label v-for="metric in thresholdMetrics" :key="metric.key" class="space-y-2 rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <span class="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
              {{ metric.label }}
              <span class="text-xs font-medium text-slate-500">{{ metric.unit }}</span>
            </span>
            <div class="grid grid-cols-2 gap-3">
              <input
                v-model.number="draftThresholds[metric.key].min"
                class="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-1.5 text-center text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                placeholder="Min"
                step="0.1"
                type="number"
              />
              <input
                v-model.number="draftThresholds[metric.key].max"
                class="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-1.5 text-center text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                placeholder="Max"
                step="0.1"
                type="number"
              />
            </div>
          </label>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-slate-500">{{ savedMessage }}</p>
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
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

    <section v-else-if="activeTab === 'areas'" class="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="min-w-[920px] w-full text-left text-sm">
          <thead class="border-b border-slate-200/80 bg-white/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-4 font-semibold">Zona / Area</th>
              <th class="px-5 py-4 font-semibold">Luas</th>
              <th class="px-5 py-4 font-semibold">Crop</th>
              <th class="px-5 py-4 font-semibold">BMKG ADM4</th>
              <th class="px-5 py-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/70">
            <tr v-for="plot in plots" :key="plot.id" class="hover:bg-white/50">
              <td class="px-5 py-4">
                <p class="font-semibold text-slate-700">{{ plot.name }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ plot.id }}</p>
              </td>
              <td class="px-5 py-4 text-slate-600">{{ plot.areaLabel }}</td>
              <td class="px-5 py-4 text-slate-600">{{ plot.cropName ?? "Belum dipilih" }}</td>
              <td class="px-5 py-4 font-semibold text-emerald-700">{{ plot.bmkgAdm4Code ?? "-" }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="icon-button" type="button" :aria-label="`Edit ${plot.name}`" @click="openAreaModal(plot)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="icon-button" type="button" :aria-label="`Hapus ${plot.name}`" @click="removePlot(plot)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="plots.length === 0" class="border-t border-slate-200/80 p-8 text-center text-sm text-slate-500">
        Belum ada zona atau area.
      </div>
    </section>

    <section v-else class="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
      <div class="border-b border-slate-200/80 p-5">
        <h3 class="text-base font-semibold tracking-normal text-slate-700">Threshold Matrix</h3>
        <p class="mt-1 text-sm text-slate-600">Ringkasan batas per crop dari API tenant.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[920px] w-full text-left text-sm">
          <thead class="border-b border-slate-200/80 bg-white/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-4 font-semibold">Crop Type</th>
              <th v-for="metric in thresholdMetrics" :key="metric.key" class="px-5 py-4 font-semibold">{{ metric.label }}</th>
              <th class="px-5 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/70">
            <tr v-for="crop in crops" :key="crop.id" class="hover:bg-white/50">
              <td class="px-5 py-4">
                <p class="font-semibold text-slate-700">{{ crop.name }}</p>
                <p class="mt-1 text-xs italic text-slate-500">{{ crop.latinName ?? "-" }}</p>
              </td>
              <td v-for="metric in thresholdMetrics" :key="metric.key" class="px-5 py-4 text-slate-600">
                {{ formatRange(crop.thresholds[metric.key]) }}
              </td>
              <td class="px-5 py-4">
                <select
                  class="min-h-9 rounded-full border border-slate-200 bg-white/50 px-3 text-xs font-semibold outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                  :class="crop.status === 'active' ? 'text-emerald-700' : crop.status === 'draft' ? 'text-amber-700' : 'text-slate-600'"
                  :disabled="isSaving"
                  :value="crop.status"
                  @change="updateCropStatus(crop.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="active">Aktif</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="crops.length === 0" class="border-t border-slate-200/80 p-8 text-center text-sm text-slate-500">
        Belum ada threshold crop dari API.
      </div>
    </section>

    <div v-if="isCropModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-2xl backdrop-blur-xl" @submit.prevent="submitCrop">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-slate-700">{{ cropModalTitle }}</h2>
            <p class="mt-1 text-sm text-slate-600">Data crop tenant.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeCropModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Nama</span>
              <input v-model.trim="cropForm.name" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" required type="text" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Latin</span>
              <input v-model.trim="cropForm.latinName" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="text" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Periode Tanam (hari)</span>
              <input v-model.number="cropForm.plantingPeriodDays" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" min="1" type="number" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Tanggal Tanam</span>
              <input v-model="cropForm.plantingDate" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="date" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Status</span>
              <select v-model="cropForm.status" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400">
                <option value="active">Aktif</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Varietas</span>
            <input v-model.trim="cropForm.varieties" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" placeholder="IR64, Inpari" type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Sumber Threshold</span>
            <input v-model.trim="cropForm.thresholdSource" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" placeholder="Manual, rekomendasi agronom, jurnal" type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Deskripsi</span>
            <textarea v-model.trim="cropForm.description" class="min-h-24 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"></textarea>
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100" type="button" @click="closeCropModal">
            Batal
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : cropSubmitLabel }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="isAreaModalOpen" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/20 p-4 backdrop-blur-sm">
      <form ref="areaFormElement" class="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-2xl backdrop-blur-xl" @submit.prevent="submitArea">
        <div class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-slate-700">{{ areaModalTitle }}</h2>
            <p class="mt-1 text-sm text-slate-600">Relasi zona, crop, dan BMKG.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeAreaModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="grid gap-4 overflow-y-auto py-5 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Nama Zona / Area</span>
            <input v-model.trim="areaForm.name" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" required type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Luas (ha)</span>
            <input v-model.number="areaForm.areaHectares" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" min="0" step="0.01" type="number" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Crop</span>
            <select v-model="areaForm.cropId" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400">
              <option value="">Belum dipilih</option>
              <option v-for="crop in crops" :key="crop.id" :value="crop.id">
                {{ crop.name }}
              </option>
            </select>
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">BMKG ADM4</span>
            <input v-model.trim="areaForm.bmkgAdm4Code" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" placeholder="31.71.03.1001" type="text" />
          </label>

          <div class="space-y-2 md:col-span-2">
            <span class="text-sm font-semibold text-slate-700">Polygon Lokasi</span>
            <div class="overflow-hidden rounded-xl border border-slate-200">
              <PolygonMapEditor v-model="areaPolygon" @cancel="closeAreaModal" @save="submitAreaFromPolygon" />
            </div>
          </div>
        </div>

        <div v-if="areaFormError" class="mb-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
          {{ areaFormError }}
        </div>

        <div class="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100" type="button" @click="closeAreaModal">
            Kembali
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan Area" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, Leaf, Map, Pencil, Plus, Save, Sprout, Trash2, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import PolygonMapEditor from "../../components/maps/PolygonMapEditor.vue";
import {
  thresholdMetrics,
  useMasterDataStore,
  type ApiCrop,
  type ApiPlot,
  type CropPayload,
  type CropStatus,
  type PlotPayload,
  type ThresholdKey,
  type ThresholdRange
} from "../../stores/masterDataStore";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";

type MasterTab = "crops" | "areas" | "thresholds";

const tenantProfileStore = useTenantProfileStore();
const masterDataStore = useMasterDataStore();
const { crops, errorMessage, isLoading, isSaving, plots } = storeToRefs(masterDataStore);
const activeTab = ref<MasterTab>("crops");
const selectedCropId = ref("");
const savedMessage = ref("Perubahan threshold akan dikirim ke API tenant.");
const isCropModalOpen = ref(false);
const isAreaModalOpen = ref(false);
const editingCropId = ref<string | null>(null);
const editingAreaId = ref<string | null>(null);
const areaFormError = ref<string | null>(null);
const areaFormElement = ref<HTMLFormElement | null>(null);
const areaPolygon = ref<unknown>(defaultPolygon());

const cropForm = reactive<{
  description: string;
  latinName: string;
  name: string;
  plantingDate: string;
  plantingPeriodDays: number | null;
  status: CropStatus;
  thresholdSource: string;
  varieties: string;
}>({
  description: "",
  latinName: "",
  name: "",
  plantingDate: "",
  plantingPeriodDays: null,
  status: "draft",
  thresholdSource: "",
  varieties: ""
});

const areaForm = reactive<{
  areaHectares: number | null;
  bmkgAdm4Code: string;
  cropId: string;
  name: string;
}>({
  areaHectares: null,
  bmkgAdm4Code: "",
  cropId: "",
  name: ""
});

const draftThresholds = reactive<Record<ThresholdKey, ThresholdRange>>({
  ph: { max: null, min: null, unit: "range" },
  moisture: { max: null, min: null, unit: "%" },
  nitrogen: { max: null, min: null, unit: "mg/Kg" },
  phosphorus: { max: null, min: null, unit: "mg/Kg" },
  potassium: { max: null, min: null, unit: "mg/Kg" }
});

const tabs = [
  { id: "crops" as const, label: "Crop Types", icon: Leaf },
  { id: "areas" as const, label: "Zona & Area", icon: Map },
  { id: "thresholds" as const, label: "Threshold", icon: Database }
];

const selectedCrop = computed(() => crops.value.find((crop) => crop.id === selectedCropId.value) ?? crops.value[0] ?? null);
const cropModalTitle = computed(() => editingCropId.value ? "Edit Crop Type" : "Tambah Crop Type");
const cropSubmitLabel = computed(() => editingCropId.value ? "Update Crop" : "Simpan Crop");
const areaModalTitle = computed(() => editingAreaId.value ? "Edit Zona / Area" : "Tambah Zona / Area");

onMounted(async () => {
  await Promise.all([
    masterDataStore.fetchCrops(),
    masterDataStore.fetchPlots()
  ]);
  selectedCropId.value = crops.value[0]?.id ?? "";
  tenantProfileStore.syncFieldsFromPlots(plots.value);
});

watch(selectedCrop, () => {
  syncDraftThresholds();
}, {
  immediate: true
});

watch(plots, () => {
  tenantProfileStore.syncFieldsFromPlots(plots.value);
}, {
  deep: true
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

async function updateCropStatus(cropId: string, status: string): Promise<void> {
  if (!isCropStatus(status)) {
    return;
  }

  const updated = await masterDataStore.updateCrop(cropId, {
    status
  });

  if (updated) {
    savedMessage.value = `Status ${updated.name} menjadi ${statusLabel(updated.status)}.`;
  }
}

function openCropModal(crop?: ApiCrop): void {
  editingCropId.value = crop?.id ?? null;
  cropForm.description = crop?.description ?? "";
  cropForm.latinName = crop?.latinName ?? "";
  cropForm.name = crop?.name ?? "";
  cropForm.plantingDate = crop?.plantingDate ?? "";
  cropForm.plantingPeriodDays = crop?.plantingPeriodDays ?? null;
  cropForm.status = crop?.status ?? "draft";
  cropForm.thresholdSource = crop?.thresholdSource ?? "";
  cropForm.varieties = crop?.varieties.join(", ") ?? "";
  masterDataStore.clearError();
  isCropModalOpen.value = true;
}

function closeCropModal(): void {
  isCropModalOpen.value = false;
  editingCropId.value = null;
}

async function submitCrop(): Promise<void> {
  const payload: CropPayload = {
    description: cropForm.description || null,
    latinName: cropForm.latinName || null,
    name: cropForm.name,
    plantingDate: cropForm.plantingDate || null,
    plantingPeriodDays: cropForm.plantingPeriodDays,
    status: cropForm.status,
    thresholdSource: cropForm.thresholdSource || null,
    varieties: cropForm.varieties.split(",").map((value) => value.trim()).filter(Boolean)
  };

  const saved = editingCropId.value
    ? await masterDataStore.updateCrop(editingCropId.value, payload)
    : await masterDataStore.createCrop(payload);

  if (saved) {
    selectedCropId.value = saved.id;
    await masterDataStore.fetchPlots();
    tenantProfileStore.syncFieldsFromPlots(plots.value);
    closeCropModal();
  }
}

async function removeCrop(crop: ApiCrop): Promise<void> {
  const usageCount = plots.value.filter((plot) => plot.cropId === crop.id).length;
  const usageMessage = usageCount > 0
    ? ` Crop ini sedang dipakai oleh ${usageCount} zona/area dan relasinya akan dikosongkan.`
    : "";

  if (!window.confirm(`Hapus crop ${crop.name}?${usageMessage}`)) {
    return;
  }

  const deleted = await masterDataStore.deleteCrop(crop.id);

  if (deleted) {
    selectedCropId.value = crops.value[0]?.id ?? "";
    savedMessage.value = `Crop ${crop.name} sudah dihapus.`;
  }
}

function openAreaModal(plot?: ApiPlot): void {
  editingAreaId.value = plot?.id ?? null;
  areaForm.name = plot?.name ?? "";
  areaForm.areaHectares = plot?.areaHectares ?? null;
  areaForm.cropId = plot?.cropId ?? "";
  areaForm.bmkgAdm4Code = plot?.bmkgAdm4Code ?? "";
  areaPolygon.value = plot?.polygonGeojson ?? defaultPolygon();
  areaFormError.value = null;
  masterDataStore.clearError();
  isAreaModalOpen.value = true;
}

function closeAreaModal(): void {
  isAreaModalOpen.value = false;
  editingAreaId.value = null;
  areaFormError.value = null;
}

async function submitArea(): Promise<void> {
  if (polygonPointCount(areaPolygon.value) < 3) {
    areaFormError.value = "Tentukan minimal 3 titik polygon pada peta.";
    return;
  }

  const payload: PlotPayload = {
    areaHectares: areaForm.areaHectares,
    bmkgAdm4Code: areaForm.bmkgAdm4Code || null,
    cropId: areaForm.cropId || null,
    name: areaForm.name,
    polygonGeojson: areaPolygon.value
  };
  const saved = editingAreaId.value
    ? await masterDataStore.updatePlot(editingAreaId.value, payload)
    : await masterDataStore.createPlot(payload);

  if (saved) {
    closeAreaModal();
  }
}

async function submitAreaFromPolygon(polygonGeojson: Record<string, unknown>): Promise<void> {
  areaPolygon.value = polygonGeojson;

  if (!areaFormElement.value?.reportValidity()) {
    return;
  }

  await submitArea();
}

async function removePlot(plot: ApiPlot): Promise<void> {
  if (!window.confirm(`Hapus zona ${plot.name}?`)) {
    return;
  }

  await masterDataStore.deletePlot(plot.id);
}

function syncDraftThresholds(): void {
  if (!selectedCrop.value) {
    return;
  }

  for (const metric of thresholdMetrics) {
    draftThresholds[metric.key].min = selectedCrop.value.thresholds[metric.key].min;
    draftThresholds[metric.key].max = selectedCrop.value.thresholds[metric.key].max;
    draftThresholds[metric.key].unit = metric.unit;
  }
}

function cloneThresholds(source: Record<ThresholdKey, ThresholdRange>): Record<ThresholdKey, ThresholdRange> {
  return {
    moisture: normalizeRange(source.moisture),
    nitrogen: normalizeRange(source.nitrogen),
    ph: normalizeRange(source.ph),
    phosphorus: normalizeRange(source.phosphorus),
    potassium: normalizeRange(source.potassium)
  };
}

function normalizeRange(range: ThresholdRange): ThresholdRange {
  return {
    max: normalizeNumber(range.max),
    min: normalizeNumber(range.min),
    unit: range.unit
  };
}

function normalizeNumber(value: number | string | null): number | null {
  if (value === "" || value === null) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
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

function plantingDateLabel(value: ApiCrop["plantingDate"]): string {
  if (!value) {
    return "Tanggal tanam belum diisi";
  }

  return formatDateOnly(value);
}

function hstLabel(crop: ApiCrop): string {
  const hst = calculateHst(crop.plantingDate);
  return hst === null ? "HST belum tersedia" : `${hst} HST`;
}

function cropProgressLabel(crop: ApiCrop): string {
  const progress = cropProgressPercent(crop);
  return progress === null ? "-" : `${progress}%`;
}

function harvestEstimateLabel(crop: ApiCrop): string {
  if (!crop.plantingDate || !crop.plantingPeriodDays) {
    return "-";
  }

  const plantingDate = parseDateOnly(crop.plantingDate);
  if (!plantingDate) {
    return "-";
  }

  plantingDate.setDate(plantingDate.getDate() + crop.plantingPeriodDays);
  return formatDateOnly(toDateInputValue(plantingDate));
}

function cropProgressPercent(crop: ApiCrop): number | null {
  const hst = calculateHst(crop.plantingDate);
  if (hst === null || !crop.plantingPeriodDays) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round((hst / crop.plantingPeriodDays) * 100)));
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

function isCropStatus(value: string): value is CropStatus {
  return value === "active" || value === "draft" || value === "archived";
}

function defaultPolygon(): Record<string, unknown> {
  return {
    coordinates: [],
    type: "Polygon"
  };
}

function polygonPointCount(value: unknown): number {
  const geometry = readGeometry(value);
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return 0;
  }

  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring)) {
    return 0;
  }

  const hasClosingPoint = ring.length > 1
    && Array.isArray(ring[0])
    && Array.isArray(ring[ring.length - 1])
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1];

  return hasClosingPoint ? ring.length - 1 : ring.length;
}

function readGeometry(value: unknown): { coordinates?: unknown; type?: unknown } | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.type === "Feature" && isRecord(value.geometry)) {
    return value.geometry;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>
