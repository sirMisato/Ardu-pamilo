<template>
  <div class="space-y-5 text-slate-700">
    <section class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-slate-700">{{ t("masterData.titleAgronomy") }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ t("masterData.description") }}</p>
        </div>
        <button
          class="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400"
          type="button"
          @click="activeTab === 'areas' ? openAreaModal() : openCropModal()"
        >
          <Plus class="h-4 w-4" />
          {{ activeTab === "areas" ? t("masterData.area.addArea") : t("masterData.crop.addCrop") }}
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
      <div class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
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
                <span class="rounded-lg border border-slate-200/70 bg-white/50 p-2" :title="t('masterData.crop.cropAgeHelp')">{{ hstLabel(crop) }}</span>
                <span class="rounded-lg border border-slate-200/70 bg-white/50 p-2">{{ crop.varieties.join(", ") || t("masterData.crop.varietiesEmpty") }}</span>
              </div>
            </button>
            <div class="mt-4 flex justify-end gap-2 border-t border-slate-200/70 pt-3">
              <button class="icon-button" type="button" :aria-label="t('masterData.actions.editCrop', { name: crop.name })" @click="openCropModal(crop)">
                <Pencil class="h-4 w-4" />
              </button>
              <button class="icon-button" type="button" :aria-label="t('masterData.actions.deleteCrop', { name: crop.name })" @click="removeCrop(crop)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </article>

        <div v-if="isLoading" class="rounded-2xl border border-slate-200/80 bg-white/50 p-4 text-center text-sm text-slate-500 md:p-6">
          {{ t("masterData.loading") }}
        </div>

        <div v-else-if="crops.length === 0" class="rounded-2xl border border-slate-200/80 bg-white/50 p-4 text-center text-sm text-slate-500 md:p-6">
          {{ t("masterData.crop.empty") }}
        </div>
        </div>
      </div>

      <article v-if="selectedCrop" class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold tracking-normal text-slate-700">{{ selectedCrop.name }}</h3>
            <p class="mt-1 text-sm italic text-slate-500">{{ selectedCrop.latinName ?? "-" }}</p>
            <p class="mt-3 max-w-2xl text-sm text-slate-600">{{ selectedCrop.description ?? t("masterData.crop.descriptionEmpty") }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="icon-button" type="button" :aria-label="t('masterData.actions.editCrop', { name: selectedCrop.name })" @click="openCropModal(selectedCrop)">
              <Pencil class="h-4 w-4" />
            </button>
            <button class="icon-button" type="button" :aria-label="t('masterData.actions.deleteCrop', { name: selectedCrop.name })" @click="removeCrop(selectedCrop)">
              <Trash2 class="h-4 w-4" />
            </button>
            <Sprout class="h-9 w-9 text-field-green" />
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">{{ t("masterData.crop.plantingDate") }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-700">{{ plantingDateLabel(selectedCrop.plantingDate) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500" :title="t('masterData.crop.cropAgeHelp')">{{ t("masterData.crop.cropAge") }}</p>
            <p class="mt-2 text-sm font-semibold text-emerald-700">{{ hstLabel(selectedCrop) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">{{ t("masterData.crop.progress") }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-700">{{ cropProgressLabel(selectedCrop) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <p class="text-xs text-slate-500">{{ t("masterData.crop.harvestEstimate") }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-700">{{ harvestEstimateLabel(selectedCrop) }}</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label v-for="metric in localizedThresholdMetrics" :key="metric.key" class="space-y-2 rounded-xl border border-slate-200/80 bg-white/50 p-4">
            <span class="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
              {{ metric.label }}
              <span class="text-xs font-medium text-slate-500">{{ metric.unit }}</span>
            </span>
            <div class="grid grid-cols-2 gap-3">
              <input
                class="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-1.5 text-center text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                :placeholder="t('masterData.threshold.min')"
                step="0.1"
                type="text"
                inputmode="decimal"
                :value="thresholdInputValue(draftThresholds[metric.key].min)"
                @input="setThresholdValue(metric.key, 'min', ($event.target as HTMLInputElement).value)"
              />
              <input
                class="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-1.5 text-center text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                :placeholder="t('masterData.threshold.max')"
                step="0.1"
                type="text"
                inputmode="decimal"
                :value="thresholdInputValue(draftThresholds[metric.key].max)"
                @input="setThresholdValue(metric.key, 'max', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </label>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm" :class="thresholdFeedbackToneClass">{{ thresholdFeedbackMessage }}</p>
          <button
            class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
            :disabled="isSaving"
            type="button"
            @click="saveThresholds"
          >
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("masterData.threshold.save") }}
          </button>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'areas'" class="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
      <div class="w-full overflow-x-auto whitespace-nowrap">
        <table class="min-w-[920px] w-full text-left text-sm">
          <thead class="border-b border-slate-200/80 bg-white/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-4 font-semibold">{{ t("masterData.area.columns.zoneArea") }}</th>
              <th class="px-5 py-4 font-semibold">{{ t("masterData.area.columns.area") }}</th>
              <th class="px-5 py-4 font-semibold">{{ t("masterData.area.columns.crop") }}</th>
              <th class="px-5 py-4 font-semibold">{{ t("masterData.area.columns.bmkgAdm4") }}</th>
              <th class="px-5 py-4 text-right font-semibold">{{ t("common.actions") }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/70">
            <tr v-for="plot in plots" :key="plot.id" class="hover:bg-white/50">
              <td class="px-5 py-4">
                <p class="font-semibold text-slate-700">{{ plot.name }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ plot.id }}</p>
              </td>
              <td class="px-5 py-4 text-slate-600">{{ areaDisplayLabel(plot) }}</td>
              <td class="px-5 py-4 text-slate-600">{{ plot.cropName ?? t("masterData.area.cropUnselected") }}</td>
              <td class="px-5 py-4 font-semibold text-emerald-700">{{ plot.bmkgAdm4Code ?? "-" }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="icon-button" type="button" :aria-label="t('masterData.actions.editArea', { name: plot.name })" @click="openAreaModal(plot)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="icon-button" type="button" :aria-label="t('masterData.actions.deleteArea', { name: plot.name })" @click="removePlot(plot)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="areaFeedbackMessage" class="border-t border-slate-200/80 px-5 py-3 text-sm" :class="areaFeedbackToneClass">
        {{ areaFeedbackMessage }}
      </div>

      <div v-if="plots.length === 0" class="border-t border-slate-200/80 p-8 text-center text-sm text-slate-500">
        {{ isLoading ? t("masterData.loading") : t("masterData.area.empty") }}
      </div>
    </section>

    <section v-else class="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
      <div class="border-b border-slate-200/80 p-4 md:p-5">
        <h3 class="text-base font-semibold tracking-normal text-slate-700">{{ t("masterData.threshold.matrixTitle") }}</h3>
        <p class="mt-1 text-sm text-slate-600">{{ t("masterData.threshold.matrixDescription") }}</p>
      </div>

      <div class="w-full overflow-x-auto whitespace-nowrap">
        <table class="min-w-[920px] w-full text-left text-sm">
          <thead class="border-b border-slate-200/80 bg-white/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-4 font-semibold">{{ t("masterData.crop.cropType") }}</th>
              <th v-for="metric in localizedThresholdMetrics" :key="metric.key" class="px-5 py-4 font-semibold">{{ metric.label }}</th>
              <th class="px-5 py-4 font-semibold">{{ t("common.status") }}</th>
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
                  <option value="active">{{ statusLabel("active") }}</option>
                  <option value="draft">{{ statusLabel("draft") }}</option>
                  <option value="archived">{{ statusLabel("archived") }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="crops.length === 0" class="border-t border-slate-200/80 p-8 text-center text-sm text-slate-500">
        {{ t("masterData.threshold.empty") }}
      </div>
    </section>

    <div v-if="isCropModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl backdrop-blur-xl md:p-6" @submit.prevent="submitCrop">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-slate-700">{{ cropModalTitle }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ t("masterData.crop.modalSubtitle") }}</p>
          </div>
          <button class="icon-button" type="button" :aria-label="t('masterData.crop.closeModal')" @click="closeCropModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.name") }}</span>
              <input v-model.trim="cropForm.name" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="text" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.scientificName") }}</span>
              <input v-model.trim="cropForm.latinName" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="text" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.plantingPeriodDays") }}</span>
              <input v-model.number="cropForm.plantingPeriodDays" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" min="1" type="number" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.plantingDate") }}</span>
              <input v-model="cropForm.plantingDate" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="date" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("common.status") }}</span>
              <select v-model="cropForm.status" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400">
                <option value="active">{{ statusLabel("active") }}</option>
                <option value="draft">{{ statusLabel("draft") }}</option>
                <option value="archived">{{ statusLabel("archived") }}</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.varieties") }}</span>
            <input v-model.trim="cropForm.varieties" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" placeholder="IR64, Inpari" type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.thresholdSource") }}</span>
            <input v-model.trim="cropForm.thresholdSource" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" :placeholder="t('masterData.crop.thresholdSourcePlaceholder')" type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.crop.description") }}</span>
            <textarea v-model.trim="cropForm.description" class="min-h-24 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"></textarea>
          </label>
        </div>
        <p v-if="cropFormErrorKey" class="mt-4 text-sm font-semibold text-rose-600">
          {{ t(cropFormErrorKey) }}
        </p>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100" type="button" @click="closeCropModal">
            {{ t("common.cancel") }}
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : cropSubmitLabel }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="isAreaModalOpen" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl backdrop-blur-xl md:p-6" novalidate @submit.prevent="submitArea">
        <div class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-slate-700">{{ areaModalTitle }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ t("masterData.area.modalSubtitle") }}</p>
          </div>
          <button class="icon-button" type="button" :aria-label="t('masterData.area.closeModal')" @click="closeAreaModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="grid gap-4 overflow-y-auto py-5 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.area.name") }}</span>
            <input v-model.trim="areaForm.name" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="text" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.area.areaHectares") }}</span>
            <input v-model.number="areaForm.areaHectares" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" min="0" step="0.01" type="number" />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.area.crop") }}</span>
            <select v-model="areaForm.cropId" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400">
              <option value="">{{ t("masterData.area.cropUnselected") }}</option>
              <option v-for="crop in crops" :key="crop.id" :value="crop.id">
                {{ crop.name }}
              </option>
            </select>
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.area.bmkgAdm4") }}</span>
            <input v-model.trim="areaForm.bmkgAdm4Code" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" placeholder="31.71.03.1001" type="text" />
          </label>

          <div class="space-y-2 md:col-span-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("masterData.area.locationPolygon") }}</span>
            <div class="overflow-hidden rounded-xl border border-slate-200">
              <PolygonMapEditor v-model="areaPolygon" @cancel="closeAreaModal" @save="submitAreaFromPolygon" />
            </div>
          </div>
        </div>

        <div v-if="areaFormErrorMessage" class="mb-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
          {{ areaFormErrorMessage }}
        </div>

        <div class="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100" type="button" @click="closeAreaModal">
            {{ t("common.back") }}
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("masterData.area.saveArea") }}
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
import { useI18n } from "../../i18n";
import { formatCropAge, formatDateTime, formatNumber, formatPercent } from "../../i18n/formatters";
import { getMetricLabel, getMetricUnit } from "../../i18n/metrics";
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
type DraftThresholdRange = {
  max: number | string | null;
  min: number | string | null;
  unit: string;
};

const tenantProfileStore = useTenantProfileStore();
const masterDataStore = useMasterDataStore();
const { crops, errorMessage, isLoading, isSaving, plots } = storeToRefs(masterDataStore);
const { t } = useI18n();
const activeTab = ref<MasterTab>("crops");
const selectedCropId = ref("");
const thresholdFeedback = ref<{ key: string; params?: Record<string, string | number>; tone: "error" | "neutral" | "success" }>({
  key: "masterData.threshold.saveHelper",
  tone: "neutral"
});
const isCropModalOpen = ref(false);
const isAreaModalOpen = ref(false);
const editingCropId = ref<string | null>(null);
const cropFormErrorKey = ref<string | null>(null);
const editingAreaId = ref<string | null>(null);
const areaFormErrorKey = ref<string | null>(null);
const areaFeedback = ref<{ key: string; params?: Record<string, string | number>; tone: "error" | "neutral" | "success" } | null>(null);
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

const draftThresholds = reactive<Record<ThresholdKey, DraftThresholdRange>>({
  ph: { max: null, min: null, unit: "range" },
  moisture: { max: null, min: null, unit: "%" },
  nitrogen: { max: null, min: null, unit: "mg/Kg" },
  phosphorus: { max: null, min: null, unit: "mg/Kg" },
  potassium: { max: null, min: null, unit: "mg/Kg" }
});

const tabs = computed(() => [
  { id: "crops" as const, label: t("masterData.tabs.crops"), icon: Leaf },
  { id: "areas" as const, label: t("masterData.tabs.areas"), icon: Map },
  { id: "thresholds" as const, label: t("masterData.tabs.thresholds"), icon: Database }
]);

const selectedCrop = computed(() => crops.value.find((crop) => crop.id === selectedCropId.value) ?? crops.value[0] ?? null);
const cropModalTitle = computed(() => editingCropId.value ? t("masterData.crop.editTitle") : t("masterData.crop.addTitle"));
const cropSubmitLabel = computed(() => editingCropId.value ? t("masterData.crop.update") : t("masterData.crop.save"));
const areaModalTitle = computed(() => editingAreaId.value ? t("masterData.area.editTitle") : t("masterData.area.addTitle"));
const areaFormErrorMessage = computed(() => areaFormErrorKey.value ? t(areaFormErrorKey.value) : null);
const areaFeedbackMessage = computed(() => areaFeedback.value ? t(areaFeedback.value.key, areaFeedback.value.params) : null);
const areaFeedbackToneClass = computed(() => {
  if (areaFeedback.value?.tone === "error") {
    return "text-rose-600";
  }

  if (areaFeedback.value?.tone === "success") {
    return "text-emerald-700";
  }

  return "text-slate-500";
});
const thresholdFeedbackMessage = computed(() => t(thresholdFeedback.value.key, thresholdFeedback.value.params));
const thresholdFeedbackToneClass = computed(() => {
  if (thresholdFeedback.value.tone === "error") {
    return "text-rose-600";
  }

  if (thresholdFeedback.value.tone === "success") {
    return "text-emerald-700";
  }

  return "text-slate-500";
});
const localizedThresholdMetrics = computed(() => thresholdMetrics.map((metric) => ({
  ...metric,
  label: getMetricLabel(metric.key),
  unit: getMetricUnit(metric.key, metric.unit)
})));

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

  const validationKey = validateThresholds();
  if (validationKey) {
    thresholdFeedback.value = {
      key: validationKey,
      tone: "error"
    };
    return;
  }

  const updated = await masterDataStore.updateCrop(selectedCrop.value.id, {
    thresholds: cloneThresholds(draftThresholds)
  });

  if (updated) {
    thresholdFeedback.value = {
      key: "masterData.threshold.saved",
      params: {
        name: updated.name,
        time: formatDateTime(new Date(), {
          hour: "2-digit",
          minute: "2-digit"
        })
      },
      tone: "success"
    };
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
    thresholdFeedback.value = {
      key: "masterData.crop.statusUpdated",
      params: {
        name: updated.name,
        status: statusLabel(updated.status)
      },
      tone: "success"
    };
  }
}

function openCropModal(crop?: ApiCrop): void {
  cropFormErrorKey.value = null;
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
  cropFormErrorKey.value = validateCropForm();
  if (cropFormErrorKey.value) {
    return;
  }

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
    thresholdFeedback.value = {
      key: editingCropId.value ? "masterData.crop.updated" : "masterData.crop.created",
      params: { name: saved.name },
      tone: "success"
    };
    await masterDataStore.fetchPlots();
    tenantProfileStore.syncFieldsFromPlots(plots.value);
    closeCropModal();
  }
}

async function removeCrop(crop: ApiCrop): Promise<void> {
  const usageCount = plots.value.filter((plot) => plot.cropId === crop.id).length;
  const usageMessage = usageCount > 0
    ? ` ${t("masterData.crop.deleteUsageWarning", { count: formatNumber(usageCount, { maximumFractionDigits: 0 }) })}`
    : "";

  if (!window.confirm(`${t("masterData.crop.deleteConfirm", { name: crop.name })}${usageMessage}`)) {
    return;
  }

  const deleted = await masterDataStore.deleteCrop(crop.id);

  if (deleted) {
    selectedCropId.value = crops.value[0]?.id ?? "";
    thresholdFeedback.value = {
      key: "masterData.crop.deleted",
      params: { name: crop.name },
      tone: "success"
    };
  }
}

function openAreaModal(plot?: ApiPlot): void {
  editingAreaId.value = plot?.id ?? null;
  areaForm.name = plot?.name ?? "";
  areaForm.areaHectares = plot?.areaHectares ?? null;
  areaForm.cropId = plot?.cropId ?? "";
  areaForm.bmkgAdm4Code = plot?.bmkgAdm4Code ?? "";
  areaPolygon.value = plot?.polygonGeojson ?? defaultPolygon();
  areaFormErrorKey.value = null;
  areaFeedback.value = null;
  masterDataStore.clearError();
  isAreaModalOpen.value = true;
}

function closeAreaModal(): void {
  isAreaModalOpen.value = false;
  editingAreaId.value = null;
  areaFormErrorKey.value = null;
}

async function submitArea(): Promise<void> {
  areaFormErrorKey.value = validateAreaForm();
  if (areaFormErrorKey.value) {
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
    areaFeedback.value = {
      key: editingAreaId.value ? "masterData.area.updated" : "masterData.area.created",
      params: { name: saved.name },
      tone: "success"
    };
    tenantProfileStore.syncFieldsFromPlots(plots.value);
    closeAreaModal();
  }
}

async function submitAreaFromPolygon(polygonGeojson: Record<string, unknown>): Promise<void> {
  areaPolygon.value = polygonGeojson;

  await submitArea();
}

async function removePlot(plot: ApiPlot): Promise<void> {
  if (!window.confirm(t("masterData.area.deleteConfirm", { name: plot.name }))) {
    return;
  }

  const deleted = await masterDataStore.deletePlot(plot.id);
  if (deleted) {
    areaFeedback.value = {
      key: "masterData.area.deleted",
      params: { name: plot.name },
      tone: "success"
    };
    tenantProfileStore.syncFieldsFromPlots(plots.value);
  }
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

function cloneThresholds(source: Record<ThresholdKey, DraftThresholdRange>): Record<ThresholdKey, ThresholdRange> {
  return {
    moisture: normalizeRange(source.moisture),
    nitrogen: normalizeRange(source.nitrogen),
    ph: normalizeRange(source.ph),
    phosphorus: normalizeRange(source.phosphorus),
    potassium: normalizeRange(source.potassium)
  };
}

function normalizeRange(range: DraftThresholdRange): ThresholdRange {
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

  const normalizedValue = typeof value === "string" ? normalizeDecimalInput(value) : value;
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatRange(range: ThresholdRange): string {
  if (range.min === null || range.max === null) {
    return t("format.nullValue");
  }

  const formattedMin = formatNumber(range.min, { maximumFractionDigits: 2 });
  const formattedMax = formatNumber(range.max, { maximumFractionDigits: 2 });
  const unit = getMetricUnit("", range.unit);
  return `${formattedMin}-${formattedMax}${unit === "range" ? "" : ` ${unit}`}`;
}

function plantingPeriodLabel(value: ApiCrop["plantingPeriodDays"]): string {
  return value ? t("masterData.crop.plantingPeriodValue", { count: formatNumber(value, { maximumFractionDigits: 0 }) }) : t("masterData.crop.plantingPeriodEmpty");
}

function plantingDateLabel(value: ApiCrop["plantingDate"]): string {
  if (!value) {
    return t("masterData.crop.plantingDateEmpty");
  }

  return formatDateOnly(value);
}

function hstLabel(crop: ApiCrop): string {
  const hst = calculateHst(crop.plantingDate);
  return formatCropAge(hst);
}

function cropProgressLabel(crop: ApiCrop): string {
  const progress = cropProgressPercent(crop);
  return progress === null ? t("format.nullValue") : formatPercent(progress, { maximumFractionDigits: 0, valueKind: "percent" });
}

function harvestEstimateLabel(crop: ApiCrop): string {
  if (!crop.plantingDate || !crop.plantingPeriodDays) {
    return t("format.nullValue");
  }

  const plantingDate = parseDateOnly(crop.plantingDate);
  if (!plantingDate) {
    return t("format.nullValue");
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

function statusLabel(status: CropStatus): string {
  return t(`masterData.status.${status}`);
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

function thresholdInputValue(value: number | string | null): string {
  return value === null ? "" : String(value);
}

function setThresholdValue(metricKey: ThresholdKey, boundary: "max" | "min", rawValue: string): void {
  draftThresholds[metricKey][boundary] = rawValue.trim() === "" ? null : rawValue.trim();
}

function validateThresholds(): string | null {
  for (const metric of thresholdMetrics) {
    const minValue = parseThresholdInput(draftThresholds[metric.key].min);
    const maxValue = parseThresholdInput(draftThresholds[metric.key].max);

    if (!minValue.valid || !maxValue.valid) {
      return "masterData.threshold.invalidNumber";
    }

    if (minValue.value !== null && maxValue.value !== null && minValue.value > maxValue.value) {
      return "masterData.threshold.minGreaterThanMax";
    }
  }

  return null;
}

function parseThresholdInput(value: number | string | null): { valid: boolean; value: number | null } {
  if (value === null || value === "") {
    return { valid: true, value: null };
  }

  const normalizedValue = typeof value === "string" ? normalizeDecimalInput(value) : value;
  const numericValue = Number(normalizedValue);
  return {
    valid: Number.isFinite(numericValue),
    value: Number.isFinite(numericValue) ? numericValue : null
  };
}

function normalizeDecimalInput(value: string): string {
  const trimmedValue = value.trim();
  if (trimmedValue.includes(",") && !trimmedValue.includes(".")) {
    return trimmedValue.replace(",", ".");
  }

  return trimmedValue;
}

function validateCropForm(): string | null {
  if (!cropForm.name.trim()) {
    return "masterData.crop.validationNameRequired";
  }

  if (cropForm.plantingPeriodDays !== null && (!Number.isFinite(cropForm.plantingPeriodDays) || cropForm.plantingPeriodDays <= 0)) {
    return "masterData.crop.validationPlantingPeriod";
  }

  return null;
}

function validateAreaForm(): string | null {
  if (!areaForm.name.trim()) {
    return "masterData.area.validationNameRequired";
  }

  if (areaForm.areaHectares !== null && (!Number.isFinite(areaForm.areaHectares) || areaForm.areaHectares < 0)) {
    return "masterData.area.validationAreaInvalid";
  }

  if (polygonPointCount(areaPolygon.value) < 3) {
    return "masterData.area.validationPolygonMinPoints";
  }

  return null;
}

function areaDisplayLabel(plot: ApiPlot): string {
  if (plot.areaHectares === null || !Number.isFinite(plot.areaHectares)) {
    return t("format.nullValue");
  }

  return t("masterData.area.areaValue", {
    value: formatNumber(plot.areaHectares, {
      maximumFractionDigits: 2
    })
  });
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
