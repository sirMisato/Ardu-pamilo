<template>
  <div class="space-y-5">
    <section class="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-lg">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-normal text-slate-800">Weather Station</h2>
          <p class="mt-1 text-sm text-slate-500">{{ locationLabel }}</p>
        </div>

        <button
          class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
          type="button"
          @click="refreshForecast"
        >
          <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
          Refresh
        </button>
      </div>

      <div class="mb-6 mt-5 flex w-fit gap-2 rounded-full border border-white/60 bg-white/40 p-1 shadow-sm backdrop-blur-md">
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          class="rounded-full px-5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
          :class="activeTab === tab.id ? 'bg-emerald-300 text-emerald-950 font-semibold shadow-sm' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'"
          type="button"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'forecast'" class="space-y-5">
      <div v-if="errorMessage" class="rounded-2xl border border-amber-200 bg-amber-100/70 p-4 text-sm text-amber-700 shadow-sm backdrop-blur-md">
        {{ errorMessage }}
      </div>

      <section v-if="forecast" class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <article class="rounded-[2rem] border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-lg">
          <div class="border-b border-white/60 pb-5">
            <p class="text-sm font-medium text-slate-500">Prakiraan Cuaca Saat Ini</p>
            <div class="mt-4 flex items-center justify-between gap-4">
              <div>
                <p class="text-5xl font-bold tracking-normal text-slate-800">{{ formatTemperature(forecast.current.temperatureC) }}</p>
                <h3 class="mt-3 text-xl font-semibold tracking-normal text-slate-700">{{ forecast.current.condition }}</h3>
                <p class="mt-2 text-sm text-slate-500">{{ formatDateTime(forecast.current.localDateTime) }}</p>
              </div>
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                <img
                  v-if="forecast.current.iconUrl"
                  :alt="forecast.current.condition"
                  class="h-10 w-10"
                  :src="forecast.current.iconUrl"
                />
                <CloudSun v-else class="h-7 w-7" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 py-5">
            <div v-for="metric in currentWeatherMetrics" :key="metric.label" class="rounded-2xl border border-white/60 bg-white/50 p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-slate-500">{{ metric.label }}</p>
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                  <component :is="metric.icon" class="h-4 w-4" />
                </span>
              </div>
              <p class="mt-2 text-xl font-semibold tracking-normal text-slate-800">{{ metric.value }}</p>
            </div>
          </div>

          <div class="border-t border-white/60 pt-4 text-xs text-slate-500">
            <span>{{ forecast.attribution }}</span>
            <span class="mx-2 text-slate-500">/</span>
            <span>{{ forecast.isMock ? "Mock fallback aktif" : safeUrlHost(forecast.forecastUrl) }}</span>
          </div>
        </article>

        <article class="rounded-[2rem] border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-lg">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold tracking-normal text-slate-800">3-Day Forecast Grid</h3>
              <p class="mt-1 text-sm text-slate-500">Ringkasan harian dari bucket prakiraan BMKG.</p>
            </div>
            <p class="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-xs text-slate-600">ADM4 {{ forecast.location.adm4 }}</p>
          </div>

          <div class="mt-5 grid gap-3 divide-white/60 md:grid-cols-3 md:divide-x">
            <article v-for="day in dailyForecast" :key="day.date" class="rounded-2xl border border-white/60 bg-white/50 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ day.dateLabel }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ day.summary }}</p>
                </div>
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                  <CloudRain v-if="day.rainChancePercent >= 40" class="h-5 w-5" />
                  <SunMedium v-else class="h-5 w-5" />
                </span>
              </div>

              <div class="mt-5 space-y-3 divide-y divide-white/60 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-slate-500">Avg Temp</span>
                  <strong class="text-slate-800">{{ formatTemperature(day.averageTemperatureC) }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3 pt-3">
                  <span class="text-slate-500">Humidity</span>
                  <strong class="text-slate-800">{{ day.humidityRange }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3 pt-3">
                  <span class="text-slate-500">Rain Chance</span>
                  <strong class="text-teal-700">{{ day.rainChancePercent }}%</strong>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-if="forecast" class="rounded-[2rem] border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-lg">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold tracking-normal text-slate-800">Hourly Forecast</h3>
            <p class="mt-1 text-sm text-slate-500">Sampel prakiraan 3 jam BMKG untuk pemantauan lapangan.</p>
          </div>
          <p class="text-xs text-slate-500">Updated {{ formatDateTime(forecast.fetchedAt) }}</p>
        </div>

        <div class="mt-5 grid gap-3 divide-white/60 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x">
          <article v-for="item in hourlyForecast" :key="item.id" class="rounded-2xl border border-white/60 bg-white/50 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs text-slate-500">{{ formatTimeOnly(item.localDateTime) }}</p>
                <p class="mt-2 text-sm font-semibold text-slate-800">{{ item.condition }}</p>
              </div>
              <span
                class="rounded-full px-2 py-1 text-xs font-semibold"
                :class="item.condition.toLowerCase().includes('hujan') ? 'bg-sky-100 text-sky-700' : item.condition.toLowerCase().includes('cerah') ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'"
              >
                {{ item.weatherCode ?? "-" }}
              </span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
              <span class="rounded-xl border border-white/60 bg-white/50 p-2 text-slate-700">{{ formatTemperature(item.temperatureC) }}</span>
              <span class="rounded-xl border border-white/60 bg-white/50 p-2 text-slate-700">{{ formatHumidity(item.humidityPercent) }}</span>
              <span class="rounded-xl border border-white/60 bg-white/50 p-2 text-slate-700">{{ formatRain(item.rainfallMm) }}</span>
              <span class="rounded-xl border border-white/60 bg-white/50 p-2 text-slate-700">{{ formatWind(item.windSpeed, item.windDirection) }}</span>
            </div>
          </article>
        </div>
      </section>

      <section v-if="isLoading && !forecast" class="rounded-[2rem] border border-white/80 bg-white/60 p-8 text-center shadow-sm backdrop-blur-lg">
        <Loader2 class="mx-auto h-10 w-10 animate-spin text-teal-600" />
        <p class="mt-4 text-sm text-slate-600">Mengambil prakiraan cuaca BMKG.</p>
      </section>
    </section>

    <section v-else-if="activeTab === 'monthly'" class="space-y-5">
      <section class="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-lg">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-slate-800">Report Bulanan</h2>
            <p class="mt-1 text-sm text-slate-500">{{ monthlyReportLabel }}</p>
          </div>
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400"
            type="button"
            :disabled="isHistoryLoading || monthlyMonthError !== null"
            @click="loadWeatherHistory"
          >
            <RefreshCw class="h-4 w-4" :class="isHistoryLoading ? 'animate-spin' : ''" />
            Refresh
          </button>
        </div>

        <form class="mt-5 flex flex-wrap items-end gap-3" @submit.prevent="applyMonthlyFilters">
          <label class="min-w-[220px] flex-1 space-y-2 sm:flex-none">
            <span class="text-xs font-medium text-slate-500">Bulan Report</span>
            <input
              v-model="monthlyFilters.month"
              class="min-h-10 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
              type="month"
            />
          </label>
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60"
            type="submit"
            :disabled="isHistoryLoading || monthlyMonthError !== null"
          >
            Terapkan
          </button>
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/50 px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-white/70 hover:text-teal-700"
            type="button"
            :disabled="isHistoryLoading"
            @click="resetMonthlyRangeToCurrentMonth"
          >
            Bulan Ini
          </button>
          <p v-if="monthlyMonthError" class="basis-full text-sm text-amber-700">{{ monthlyMonthError }}</p>
        </form>

        <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div class="rounded-2xl border border-white/60 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Records</p>
            <p class="mt-2 text-xl font-semibold tracking-normal text-slate-800">{{ weatherHistoryTotal.toLocaleString("id-ID") }}</p>
          </div>
          <div class="rounded-2xl border border-white/60 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Avg Temp</p>
            <p class="mt-2 text-xl font-semibold tracking-normal text-slate-800">{{ formatTemperature(monthlySummary.averageTemperatureC) }}</p>
          </div>
          <div class="rounded-2xl border border-white/60 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Total Rain</p>
            <p class="mt-2 text-xl font-semibold tracking-normal text-sky-700">{{ formatRain(monthlySummary.totalRainfallMm) }}</p>
          </div>
          <div class="rounded-2xl border border-white/60 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Rain Records</p>
            <p class="mt-2 text-xl font-semibold tracking-normal text-teal-700">{{ monthlySummary.rainyRecords }}</p>
          </div>
          <div class="rounded-2xl border border-white/60 bg-white/50 p-4">
            <p class="text-xs text-slate-500">Latest</p>
            <p class="mt-2 truncate text-sm font-semibold text-slate-800">{{ monthlySummary.latestCondition }}</p>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm backdrop-blur-lg">
        <div class="border-b border-white/60 p-5">
          <h3 class="text-base font-semibold tracking-normal text-slate-800">Histori Cuaca</h3>
          <p class="mt-1 text-sm text-slate-500">ADM4 {{ activeAdm4 || "-" }}</p>
        </div>

        <div class="w-full overflow-x-auto whitespace-nowrap">
          <table class="min-w-[980px] w-full text-left text-sm">
            <thead class="border-b border-white/60 bg-white/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3 font-semibold">Timestamp</th>
                <th class="px-4 py-3 font-semibold">Lokasi</th>
                <th class="px-4 py-3 font-semibold">Kondisi</th>
                <th class="px-4 py-3 font-semibold">Temp</th>
                <th class="px-4 py-3 font-semibold">Humidity</th>
                <th class="px-4 py-3 font-semibold">Rainfall</th>
                <th class="px-4 py-3 font-semibold">Wind</th>
                <th class="px-4 py-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/60">
              <tr v-for="item in weatherHistory" :key="item.id" class="hover:bg-white/40">
                <td class="px-4 py-4 text-slate-700">{{ formatDateTime(item.observedAt) }}</td>
                <td class="px-4 py-4 text-slate-700">{{ formatWeatherHistoryLocation(item) }}</td>
                <td class="px-4 py-4 font-semibold text-slate-800">{{ item.condition }}</td>
                <td class="px-4 py-4 text-amber-700">{{ formatTemperature(item.temperatureC) }}</td>
                <td class="px-4 py-4 text-sky-700">{{ formatHumidity(item.humidityPercent) }}</td>
                <td class="px-4 py-4 text-teal-700">{{ formatRain(item.rainfallMm) }}</td>
                <td class="px-4 py-4 text-slate-700">{{ formatWind(item.windSpeed, item.windDirection ?? "-") }}</td>
                <td class="px-4 py-4 text-slate-500">{{ item.isMock ? "Fallback" : item.source }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="isHistoryLoading" class="border-t border-white/60 p-8 text-center text-sm text-slate-500">
          Memuat histori cuaca...
        </div>
        <div v-else-if="weatherHistoryTotal === 0" class="border-t border-white/60 p-8 text-center text-sm text-slate-500">
          Belum ada histori cuaca untuk bulan ini.
        </div>

        <div v-else class="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 p-4 text-sm text-slate-700">
          <p>
            Menampilkan {{ monthlyPaginationStart }}-{{ monthlyPaginationEnd }} dari {{ weatherHistoryTotal.toLocaleString("id-ID") }} records
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <label class="flex items-center gap-2 text-xs text-slate-500">
              Rows
              <select
                v-model.number="monthlyPageSize"
                class="h-9 rounded-xl border border-emerald-200 bg-white/50 px-2 text-sm text-slate-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
                :disabled="isHistoryLoading"
                @change="applyMonthlyFilters"
              >
                <option v-for="option in monthlyPageSizeOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <button
              class="icon-button h-9 w-9"
              type="button"
              aria-label="Halaman sebelumnya"
              :disabled="isHistoryLoading || monthlyActivePage <= 1"
              @click="setMonthlyPage(monthlyActivePage - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <span class="min-w-24 text-center text-xs text-slate-500">Hal {{ monthlyActivePage }} / {{ monthlyTotalPages }}</span>
            <button
              class="icon-button h-9 w-9"
              type="button"
              aria-label="Halaman berikutnya"
              :disabled="isHistoryLoading || monthlyActivePage >= monthlyTotalPages"
              @click="setMonthlyPage(monthlyActivePage + 1)"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </section>

    <section v-else class="rounded-2xl border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-lg">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold tracking-normal text-slate-800">Konfigurasi</h2>
        <button
          class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400"
          type="button"
          @click="openCreateConfigForm"
        >
          <Plus class="h-4 w-4" />
          Tambah
        </button>
      </div>

      <form
        v-if="isConfigFormOpen"
        class="mt-5 rounded-2xl border border-white/80 bg-white/50 p-4 shadow-sm backdrop-blur-md"
        @submit.prevent="submitWeatherConfig"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-base font-semibold text-slate-800">{{ configFormTitle }}</h3>
          <button class="icon-button" type="button" aria-label="Tutup form" @click="closeConfigForm">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-700">Nama</span>
            <input
              v-model.trim="configForm.name"
              class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-700">Field</span>
            <select
              v-model="configForm.fieldId"
              class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
              required
              @change="syncConfigField"
            >
              <option v-for="field in tenantProfileStore.fields" :key="field.id" :value="field.id">
                {{ field.name }}
              </option>
            </select>
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-700">ADM4 BMKG</span>
            <input
              v-model.trim="configForm.bmkgAdm4Code"
              class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-700">Endpoint</span>
            <input
              v-model.trim="configForm.baseUrl"
              class="min-h-11 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
              required
              type="url"
            />
          </label>

          <label class="space-y-2 md:col-span-2">
            <span class="text-sm font-medium text-slate-700">Catatan</span>
            <textarea
              v-model.trim="configForm.notes"
              class="min-h-20 w-full rounded-xl border border-emerald-200 bg-white/50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70"
            ></textarea>
          </label>

          <label class="inline-flex items-center gap-3 rounded-xl border border-white/80 bg-white/50 px-3 py-3 text-sm font-medium text-slate-700">
            <input v-model="configForm.isEnabled" class="h-4 w-4 accent-[#a7e8af]" type="checkbox" />
            Aktif
          </label>
        </div>

        <div class="mt-5 flex flex-wrap justify-end gap-3">
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/50 px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-white/70 hover:text-teal-700"
            type="button"
            @click="closeConfigForm"
          >
            Batal
          </button>
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60"
            :disabled="!canSubmitConfig"
            type="submit"
          >
            <Save class="h-4 w-4" />
            Simpan
          </button>
        </div>
      </form>

      <div class="mt-5 w-full overflow-x-auto whitespace-nowrap rounded-2xl border border-white/80 bg-white/50">
        <table class="min-w-[880px] w-full text-left text-sm">
          <thead class="border-b border-white/60 bg-white/40 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 font-semibold">Nama</th>
              <th class="px-4 py-3 font-semibold">Field</th>
              <th class="px-4 py-3 font-semibold">ADM4</th>
              <th class="px-4 py-3 font-semibold">Endpoint</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/60">
            <tr v-for="config in weatherConfigs" :key="config.id" class="hover:bg-white/40">
              <td class="px-4 py-4">
                <p class="font-semibold text-slate-800">{{ config.name }}</p>
                <p v-if="config.notes" class="mt-1 truncate text-xs text-slate-500">{{ config.notes }}</p>
              </td>
              <td class="px-4 py-4 text-slate-700">{{ config.fieldName }}</td>
              <td class="px-4 py-4 font-semibold text-teal-700">{{ config.bmkgAdm4Code }}</td>
              <td class="max-w-[260px] px-4 py-4">
                <span class="block truncate text-slate-700">{{ config.baseUrl }}</span>
              </td>
              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="config.id === weatherConfigStore.activeConfigId ? 'bg-emerald-100 text-emerald-700' : config.isEnabled ? 'bg-white/70 text-slate-700' : 'bg-slate-100 text-slate-500'"
                >
                  <span class="h-2 w-2 rounded-full" :class="config.isEnabled ? 'bg-teal-500' : 'bg-slate-400'"></span>
                  {{ config.id === weatherConfigStore.activeConfigId ? "Aktif" : config.isEnabled ? "Enabled" : "Disabled" }}
                </span>
              </td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="icon-button"
                    type="button"
                    :aria-label="`Aktifkan ${config.name}`"
                    :disabled="!config.isEnabled"
                    @click="activateWeatherConfig(config.id)"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                  </button>
                  <button class="icon-button" type="button" :aria-label="`Edit ${config.name}`" @click="openEditConfigForm(config.id)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="icon-button" type="button" :aria-label="`Hapus ${config.name}`" @click="deleteWeatherConfig(config.id)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="weatherConfigs.length === 0" class="p-8 text-center text-sm text-slate-500">
          Belum ada konfigurasi weather.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  SunMedium,
  Thermometer,
  Trash2,
  Wind,
  X
} from "@lucide/vue";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { appEnvironment } from "../../config/environment";
import {
  fetchBmkgForecast,
  type BmkgForecastResult
} from "../../services/bmkgService";
import { ApiClientError, apiGet, apiPost } from "../../services/apiClient";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";
import { useAuthStore } from "../../stores/authStore";
import { useWeatherConfigStore, type WeatherConfigInput } from "../../stores/weatherConfigStore";

type WeatherTab = "forecast" | "monthly" | "config";

interface WeatherHistoryItem {
  adm4Code: string;
  cloudCoverPercent: number | null;
  condition: string;
  current: unknown;
  daily: unknown[];
  errorMessage: string | null;
  fetchedAt: string;
  forecastUrl: string;
  hourly: unknown[];
  humidityPercent: number | null;
  id: string;
  isMock: boolean;
  location: unknown;
  observedAt: string;
  plotId: string | null;
  plotName: string | null;
  rainfallMm: number | null;
  source: string;
  temperatureC: number | null;
  windDirection: string | null;
  windSpeed: number | null;
}

interface WeatherHistorySummary {
  averageTemperatureC: number | null;
  latestCondition: string;
  rainyRecords: number;
  totalRainfallMm: number | null;
}

interface WeatherHistoryResponse {
  count: number;
  items: WeatherHistoryItem[];
  limit: number;
  offset: number;
  summary?: WeatherHistorySummary;
  total?: number;
}

interface WeatherHistoryPayload {
  adm4Code: string;
  current: Record<string, unknown>;
  daily: Array<Record<string, unknown>>;
  errorMessage?: string | null;
  fetchedAt: string;
  forecastUrl: string;
  hourly: Array<Record<string, unknown>>;
  isMock: boolean;
  location: Record<string, unknown>;
  plotId: string | null;
  source: string;
}

const activeTab = ref<WeatherTab>("forecast");
const forecast = ref<BmkgForecastResult | null>(null);
const weatherHistory = ref<WeatherHistoryItem[]>([]);
const weatherHistoryTotal = ref(0);
const weatherHistorySummary = ref<WeatherHistorySummary>(createEmptyWeatherHistorySummary());
const initialMonthlyRange = currentMonthRange();
const monthlyFilters = reactive({
  month: formatMonthInput(initialMonthlyRange.start)
});
const monthlyPageSizeOptions = [10, 25, 50, 100];
const monthlyPageSize = ref(10);
const monthlyCurrentPage = ref(1);
const isHistoryLoading = ref(false);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const authStore = useAuthStore();
const tenantProfileStore = useTenantProfileStore();
const weatherConfigStore = useWeatherConfigStore();

const fallbackBaseUrl = computed(() => appEnvironment.bmkgForecastBaseUrl || "https://api.bmkg.go.id/publik/prakiraan-cuaca");
const configuredBaseUrl = computed(() => weatherConfigStore.activeBaseUrl || fallbackBaseUrl.value);
const activeField = computed(() => {
  const fieldId = weatherConfigStore.activeConfig?.fieldId;
  return tenantProfileStore.fields.find((field) => field.id === fieldId) ?? tenantProfileStore.activeField;
});
const activeAdm4 = computed(() => weatherConfigStore.activeAdm4Code || tenantProfileStore.activeBmkgAdm4Code);
const weatherConfigs = computed(() => weatherConfigStore.configs);
const isReadOnlyTenant = computed(() => authStore.isReadOnlyTenant);

const tabs: Array<{ id: WeatherTab; label: string }> = [
  { id: "forecast", label: "Prakiraan Cuaca" },
  { id: "monthly", label: "Report Bulanan" },
  { id: "config", label: "Konfigurasi" }
];
const visibleTabs = computed(() => isReadOnlyTenant.value
  ? tabs.filter((tab) => tab.id !== "config")
  : tabs);

const locationLabel = computed(() => {
  if (!forecast.value) {
    return activeField.value
      ? `${activeField.value.regionLabel} / ADM4 ${activeAdm4.value}`
      : "BMKG forecast location";
  }

  const location = forecast.value.location;
  return `${location.village}, ${location.district}, ${location.city}`;
});

const dailyForecast = computed(() => forecast.value?.daily.slice(0, 3) ?? []);
const hourlyForecast = computed(() => forecast.value?.items.slice(0, 8) ?? []);
const selectedMonthlyRange = computed(() => monthRangeFromInput(monthlyFilters.month));
const monthlyMonthError = computed(() => {
  const range = selectedMonthlyRange.value;

  if (!range) {
    return "Pilih bulan report.";
  }

  return null;
});
const monthlyTotalPages = computed(() => Math.max(1, Math.ceil(weatherHistoryTotal.value / monthlyPageSize.value)));
const monthlyActivePage = computed(() => Math.min(monthlyCurrentPage.value, monthlyTotalPages.value));
const monthlyPaginationStart = computed(() => weatherHistoryTotal.value === 0 ? 0 : (monthlyActivePage.value - 1) * monthlyPageSize.value + 1);
const monthlyPaginationEnd = computed(() => Math.min((monthlyActivePage.value - 1) * monthlyPageSize.value + weatherHistory.value.length, weatherHistoryTotal.value));
const isConfigFormOpen = ref(false);
const editingConfigId = ref<string | null>(null);
const configForm = reactive<WeatherConfigInput>({
  baseUrl: "",
  bmkgAdm4Code: "",
  fieldId: "",
  fieldName: "",
  isEnabled: true,
  name: "",
  notes: ""
});
const configFormTitle = computed(() => editingConfigId.value ? "Edit Konfigurasi" : "Tambah Konfigurasi");
const canSubmitConfig = computed(() => {
  return configForm.name.trim().length > 0
    && configForm.fieldId.length > 0
    && configForm.fieldName.trim().length > 0
    && configForm.bmkgAdm4Code.trim().length > 0
    && configForm.baseUrl.trim().length > 0;
});

const currentWeatherMetrics = computed(() => {
  const current = forecast.value?.current;

  return [
    {
      label: "Temperature",
      value: formatTemperature(current?.temperatureC ?? null),
      icon: Thermometer,
      iconClass: "text-amber-200"
    },
    {
      label: "Humidity",
      value: formatHumidity(current?.humidityPercent ?? null),
      icon: Droplets,
      iconClass: "text-sky-200"
    },
    {
      label: "Rainfall",
      value: formatRain(current?.rainfallMm ?? null),
      icon: CloudRain,
      iconClass: "text-field-mint"
    },
    {
      label: "Wind",
      value: formatWind(current?.windSpeed ?? null, current?.windDirection ?? "-"),
      icon: Wind,
      iconClass: "text-field-green"
    },
    {
      label: "Cloud Cover",
      value: formatPercent(current?.cloudCoverPercent ?? null),
      icon: CloudSun,
      iconClass: "text-violet-200"
    },
    {
      label: "Visibility",
      value: current?.visibility ?? "-",
      icon: Eye,
      iconClass: "text-cyan-200"
    }
  ];
});
const monthlySummary = computed(() => weatherHistorySummary.value);
const monthlyReportLabel = computed(() => {
  const range = selectedMonthlyRange.value;

  if (!range) {
    return "Bulan report belum dipilih";
  }

  return `${formatDateOnly(range.start)} - ${formatDateOnly(range.end)}`;
});

onMounted(async () => {
  await tenantProfileStore.fetchFields();
  weatherConfigStore.ensureDefaults(tenantProfileStore.fields, fallbackBaseUrl.value);
  void refreshForecast();
});

watch([activeAdm4, configuredBaseUrl], () => {
  void refreshForecast();
});

watch(activeTab, (tab) => {
  if (tab === "monthly") {
    void loadWeatherHistory();
  }
});

watch(isReadOnlyTenant, (readOnly) => {
  if (readOnly && activeTab.value === "config") {
    activeTab.value = "forecast";
    closeConfigForm();
  }
}, {
  immediate: true
});

async function refreshForecast(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  const result = await fetchBmkgForecast({
    adm4: activeAdm4.value,
    baseUrl: configuredBaseUrl.value
  });

  forecast.value = result;
  const messages = result.isMock
    ? [`BMKG live data belum bisa diambil: ${result.errorMessage ?? "menggunakan data contoh."}`]
    : [];

  try {
    await persistWeatherHistory(result);
  } catch (error) {
    messages.push(`Histori cuaca belum tersimpan: ${normalizeApiError(error)}`);
  }

  errorMessage.value = messages.length > 0 ? messages.join(" ") : null;
  isLoading.value = false;

  if (activeTab.value === "monthly") {
    void loadWeatherHistory();
  }
}

async function persistWeatherHistory(result: BmkgForecastResult): Promise<void> {
  await apiPost<{ inserted: boolean; item: WeatherHistoryItem | null }>("/api/v1/weather/history", buildWeatherHistoryPayload(result));
}

async function loadWeatherHistory(): Promise<void> {
  if (!activeAdm4.value) {
    clearWeatherHistory();
    return;
  }

  if (monthlyMonthError.value || !selectedMonthlyRange.value) {
    clearWeatherHistory();
    errorMessage.value = monthlyMonthError.value;
    return;
  }

  isHistoryLoading.value = true;

  try {
    const { end, start } = selectedMonthlyRange.value;
    const params = new URLSearchParams({
      adm4Code: activeAdm4.value,
      end: end.toISOString(),
      limit: String(monthlyPageSize.value),
      offset: String((monthlyCurrentPage.value - 1) * monthlyPageSize.value),
      start: start.toISOString()
    });
    const response = await apiGet<WeatherHistoryResponse>(`/api/v1/weather/history?${params.toString()}`);

    weatherHistory.value = response.items;
    weatherHistoryTotal.value = response.total ?? response.count;
    weatherHistorySummary.value = response.summary ?? createWeatherHistorySummary(response.items);
    errorMessage.value = null;

    if (monthlyCurrentPage.value > monthlyTotalPages.value) {
      monthlyCurrentPage.value = monthlyTotalPages.value;
      await loadWeatherHistory();
    }
  } catch (error) {
    errorMessage.value = normalizeApiError(error);
    clearWeatherHistory();
  } finally {
    isHistoryLoading.value = false;
  }
}

function applyMonthlyFilters(): void {
  monthlyCurrentPage.value = 1;
  void loadWeatherHistory();
}

function resetMonthlyRangeToCurrentMonth(): void {
  const { start } = currentMonthRange();
  monthlyFilters.month = formatMonthInput(start);
  applyMonthlyFilters();
}

function setMonthlyPage(page: number): void {
  const nextPage = Math.min(Math.max(page, 1), monthlyTotalPages.value);

  if (nextPage === monthlyCurrentPage.value) {
    return;
  }

  monthlyCurrentPage.value = nextPage;
  void loadWeatherHistory();
}

function clearWeatherHistory(): void {
  weatherHistory.value = [];
  weatherHistoryTotal.value = 0;
  weatherHistorySummary.value = createEmptyWeatherHistorySummary();
}

function buildWeatherHistoryPayload(result: BmkgForecastResult): WeatherHistoryPayload {
  return {
    adm4Code: result.location.adm4 || activeAdm4.value,
    current: toCurrentWeatherPayload(result.current),
    daily: result.daily.slice(0, 7).map((day) => ({
      averageTemperatureC: day.averageTemperatureC,
      date: day.date,
      dateLabel: day.dateLabel,
      humidityRange: day.humidityRange,
      rainChancePercent: day.rainChancePercent,
      summary: day.summary
    })),
    errorMessage: result.errorMessage ?? null,
    fetchedAt: result.fetchedAt,
    forecastUrl: result.forecastUrl,
    hourly: result.items.slice(0, 24).map(toCurrentWeatherPayload),
    isMock: result.isMock,
    location: {
      adm4: result.location.adm4,
      city: result.location.city,
      district: result.location.district,
      latitude: result.location.latitude,
      longitude: result.location.longitude,
      province: result.location.province,
      timezone: result.location.timezone,
      village: result.location.village
    },
    plotId: activeField.value?.id ?? null,
    source: result.isMock ? "BMKG fallback" : result.attribution
  };
}

function toCurrentWeatherPayload(item: BmkgForecastResult["current"]): Record<string, unknown> {
  return {
    cloudCoverPercent: item.cloudCoverPercent,
    condition: item.condition,
    conditionEn: item.conditionEn,
    dateTime: item.dateTime,
    humidityPercent: item.humidityPercent,
    localDateTime: item.localDateTime,
    rainfallMm: item.rainfallMm,
    temperatureC: item.temperatureC,
    visibility: item.visibility,
    weatherCode: item.weatherCode,
    windDirection: item.windDirection,
    windSpeed: item.windSpeed
  };
}

function openCreateConfigForm(): void {
  if (isReadOnlyTenant.value) {
    return;
  }

  const field = activeField.value ?? tenantProfileStore.fields[0] ?? null;
  editingConfigId.value = null;
  Object.assign(configForm, {
    baseUrl: configuredBaseUrl.value,
    bmkgAdm4Code: field?.bmkgAdm4Code ?? activeAdm4.value,
    fieldId: field?.id ?? "",
    fieldName: field?.name ?? "",
    isEnabled: true,
    name: field ? `BMKG ${field.name}` : "BMKG Field",
    notes: field?.regionLabel ?? ""
  });
  isConfigFormOpen.value = true;
}

function openEditConfigForm(configId: string): void {
  if (isReadOnlyTenant.value) {
    return;
  }

  const config = weatherConfigStore.configs.find((item) => item.id === configId);
  if (!config) {
    return;
  }

  editingConfigId.value = config.id;
  Object.assign(configForm, {
    baseUrl: config.baseUrl,
    bmkgAdm4Code: config.bmkgAdm4Code,
    fieldId: config.fieldId,
    fieldName: config.fieldName,
    isEnabled: config.isEnabled,
    name: config.name,
    notes: config.notes
  });
  isConfigFormOpen.value = true;
}

function closeConfigForm(): void {
  isConfigFormOpen.value = false;
  editingConfigId.value = null;
}

function syncConfigField(): void {
  const field = tenantProfileStore.fields.find((item) => item.id === configForm.fieldId);
  if (!field) {
    return;
  }

  configForm.fieldName = field.name;
  configForm.bmkgAdm4Code = field.bmkgAdm4Code;
  configForm.notes = field.regionLabel;
}

function submitWeatherConfig(): void {
  if (isReadOnlyTenant.value) {
    return;
  }

  if (!canSubmitConfig.value) {
    return;
  }

  if (editingConfigId.value) {
    weatherConfigStore.updateConfig(editingConfigId.value, { ...configForm });
  } else {
    weatherConfigStore.createConfig({ ...configForm });
  }

  closeConfigForm();
}

function activateWeatherConfig(configId: string): void {
  if (isReadOnlyTenant.value) {
    return;
  }

  const config = weatherConfigStore.configs.find((item) => item.id === configId);
  if (!config) {
    return;
  }

  weatherConfigStore.setActiveConfig(configId);
  tenantProfileStore.setActiveField(config.fieldId);
}

function deleteWeatherConfig(configId: string): void {
  if (isReadOnlyTenant.value) {
    return;
  }

  const config = weatherConfigStore.configs.find((item) => item.id === configId);
  if (!config || !window.confirm(`Hapus konfigurasi ${config.name}?`)) {
    return;
  }

  weatherConfigStore.deleteConfig(configId);
}

function formatTemperature(value: number | null): string {
  return value === null ? "-" : `${value} C`;
}

function formatHumidity(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

function formatPercent(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

function formatRain(value: number | null): string {
  return value === null ? "-" : `${value} mm`;
}

function formatWind(value: number | null, direction: string): string {
  return value === null ? "-" : `${value} km/j ${direction}`.trim();
}

function formatWeatherHistoryLocation(item: WeatherHistoryItem): string {
  if (isRecord(item.location)) {
    const village = typeof item.location.village === "string" ? item.location.village : "";
    const district = typeof item.location.district === "string" ? item.location.district : "";
    const city = typeof item.location.city === "string" ? item.location.city : "";
    const locationParts = [village, district, city].filter(Boolean);

    if (locationParts.length > 0) {
      return locationParts.join(", ");
    }
  }

  return item.plotName ?? `ADM4 ${item.adm4Code}`;
}

function formatDateTime(value: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatDateOnly(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(value);
}

function formatTimeOnly(value: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function weatherToneClass(condition: string): string {
  const normalized = condition.toLowerCase();
  if (normalized.includes("hujan")) {
    return "bg-sky-300/10 text-sky-200";
  }

  if (normalized.includes("cerah")) {
    return "bg-amber-300/10 text-amber-200";
  }

  return "bg-field-mint/10 text-field-mint";
}

function safeUrlHost(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

function currentMonthRange(): { end: Date; start: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { end, start };
}

function createEmptyWeatherHistorySummary(): WeatherHistorySummary {
  return {
    averageTemperatureC: null,
    latestCondition: "-",
    rainyRecords: 0,
    totalRainfallMm: null
  };
}

function createWeatherHistorySummary(items: WeatherHistoryItem[]): WeatherHistorySummary {
  const temperatureValues = items
    .map((item) => item.temperatureC)
    .filter((value): value is number => typeof value === "number");
  const rainfallValues = items
    .map((item) => item.rainfallMm)
    .filter((value): value is number => typeof value === "number");
  const latest = [...items].sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt))[0] ?? null;

  return {
    averageTemperatureC: temperatureValues.length > 0
      ? roundMetric(temperatureValues.reduce((total, value) => total + value, 0) / temperatureValues.length)
      : null,
    latestCondition: latest?.condition ?? "-",
    rainyRecords: items.filter((item) => isRainyWeather(item)).length,
    totalRainfallMm: rainfallValues.length > 0
      ? roundMetric(rainfallValues.reduce((total, value) => total + value, 0))
      : null
  };
}

function monthRangeFromInput(value: string): { end: Date; start: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, yearValue, monthValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { end, start };
}

function formatMonthInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function isRainyWeather(item: WeatherHistoryItem): boolean {
  return (item.rainfallMm ?? 0) > 0 || item.condition.toLowerCase().includes("hujan");
}

function normalizeApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? "Sesi login berakhir. Silakan login ulang." : error.message;
  }

  if (error instanceof TypeError) {
    return "API backend belum dapat dihubungi.";
  }

  return "Gagal memproses histori cuaca.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>
