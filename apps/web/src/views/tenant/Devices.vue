<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">{{ t("devices.summary.total") }}</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ formatDataCount(devices.length) }}</p>
          </div>
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 p-2.5 text-teal-600">
            <Cpu class="h-6 w-6" />
          </span>
        </div>
      </article>

      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">{{ t("devices.summary.online") }}</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ formatDataCount(onlineDeviceCount) }}</p>
          </div>
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 p-2.5 text-teal-600">
            <Wifi class="h-6 w-6" />
          </span>
        </div>
      </article>

      <article class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">{{ t("devices.summary.activePlots") }}</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ formatDataCount(activePlotCount) }}</p>
          </div>
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 p-2.5 text-teal-600">
            <MapPin class="h-6 w-6" />
          </span>
        </div>
      </article>
    </section>

    <section class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative w-full max-w-md">
            <Search class="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model.trim="searchQuery"
              class="min-h-11 w-full rounded-full border border-white/80 bg-white/50 py-2.5 pl-12 pr-5 text-sm text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400"
              :aria-label="t('devices.searchAria')"
              :placeholder="t('devices.searchPlaceholder')"
              type="search"
            />
          </label>

          <select
            v-model="statusFilter"
            class="min-h-11 rounded-full border border-white/80 bg-white/50 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">{{ t("common.allStatuses") }}</option>
            <option value="online">{{ statusLabel("online") }}</option>
            <option value="offline">{{ statusLabel("offline") }}</option>
            <option value="maintenance">{{ statusLabel("maintenance") }}</option>
          </select>
        </div>

        <button
          class="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/80"
          type="button"
          @click="openAddModal"
        >
          <Plus class="h-4 w-4" />
          {{ t("devices.addDevice") }}
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-medium text-amber-700">
        {{ errorMessage }}
      </div>
      <div v-if="feedbackMessage" class="mt-4 rounded-2xl border p-4 text-sm font-medium" :class="feedbackToneClass">
        {{ feedbackMessage }}
      </div>
    </section>

    <section class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6">
      <div class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[900px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("devices.columns.deviceId") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("common.status") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("devices.columns.assignedPlot") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("devices.columns.sensorProfile") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("devices.columns.lastSeen") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("devices.columns.battery") }}</th>
              <th class="border-b border-white/60 px-5 py-4 text-right font-bold">{{ t("common.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in filteredDevices" :key="device.id" class="border-b border-white/60 transition-colors hover:bg-white/40">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <Cpu class="h-5 w-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-700">{{ device.deviceUid }}</p>
                    <div class="mt-1 flex max-w-xs items-center gap-2">
                      <p class="truncate text-xs font-medium text-slate-400">{{ device.telemetryTopic }}</p>
                      <button
                        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50"
                        type="button"
                        :aria-label="t('devices.actions.copyTopicAria', { topic: device.telemetryTopic })"
                        :title="t('devices.actions.copyTopic')"
                        @click="copyTopic(device)"
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-semibold"
                  :class="statusBadgeClass(device.status)"
                >
                  <component :is="statusIcon(device.status)" class="h-3.5 w-3.5" />
                  {{ statusLabel(device.status) }}
                </span>
              </td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ assignedPlotLabel(device) }}</td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ sensorProfileLabel(device.metadata) }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 font-medium text-slate-700">
                  <Clock3 class="h-4 w-4 text-slate-400" />
                  {{ formatLastSeen(device.lastSeenAt) }}
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <BatteryMedium class="h-4 w-4 text-teal-600" />
                  <div class="h-2 w-24 rounded-full bg-slate-200/70">
                    <div class="h-full rounded-full bg-emerald-300" :style="{ width: `${batteryProgressWidth(device.metadata)}%` }"></div>
                  </div>
                  <span class="text-xs font-medium text-slate-400">{{ batteryLabel(device.metadata) }}</span>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    type="button"
                    :aria-label="t('devices.actions.viewAria', { deviceUid: device.deviceUid })"
                    :title="t('devices.actions.view')"
                    @click="openDetail(device.id)"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    type="button"
                    :aria-label="t('devices.actions.copyIdAria', { deviceUid: device.deviceUid })"
                    :title="t('devices.actions.copyId')"
                    @click="copyDeviceId(device)"
                  >
                    <Copy class="h-4 w-4" />
                  </button>
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white/80 text-rose-500 shadow-sm transition-all hover:bg-rose-50"
                    type="button"
                    :aria-label="t('devices.actions.deleteAria', { deviceUid: device.deviceUid })"
                    :title="t('devices.actions.delete')"
                    @click="removeDevice(device.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading" class="border-t border-white/60 p-6 text-center text-sm font-medium text-slate-400 md:p-8">
        {{ t("devices.loading") }}
      </div>

      <div v-else-if="filteredDevices.length === 0" class="border-t border-white/60 p-6 text-center text-sm font-medium text-slate-400 md:p-8">
        {{ devices.length === 0 ? t("devices.empty.noDevices") : t("devices.empty.noFilterResults") }}
      </div>
    </section>

    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl backdrop-blur-xl md:p-6" @submit.prevent="submitDevice">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold tracking-normal text-slate-800">{{ t("devices.modal.addTitle") }}</h2>
            <p class="mt-1 text-sm font-medium text-slate-400">{{ t("devices.modal.addSubtitle") }}</p>
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100"
            type="button"
            :aria-label="t('devices.modal.close')"
            @click="closeAddModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Device UID</span>
              <input
                v-model.trim="deviceForm.deviceUid"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                placeholder="SensorNode04"
                type="text"
              />
              <span class="block text-xs font-medium text-slate-400">{{ t("devices.modal.deviceUidHelper") }}</span>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("devices.modal.displayName") }}</span>
              <input
                v-model.trim="deviceForm.displayName"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                placeholder="Soil Node Blok C"
                type="text"
              />
              <span class="block text-xs font-medium text-slate-400">{{ t("devices.modal.displayNameHelper") }}</span>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("devices.modal.plotId") }}</span>
            <select
              v-model.trim="deviceForm.plotId"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">{{ t("devices.modal.autoMainField") }}</option>
              <option v-for="plot in plots" :key="plot.id" :value="plot.id">
                {{ plot.name }} / {{ plot.id }}
              </option>
            </select>
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("devices.modal.sensorProfile") }}</span>
              <select
                v-model="deviceForm.sensorProfile"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              >
                <option v-for="profile in sensorProfileOptions" :key="profile.value" :value="profile.value">
                  {{ profile.label }}
                </option>
              </select>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">{{ t("devices.modal.initialStatus") }}</span>
              <select
                v-model="deviceForm.status"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              >
                <option value="online">{{ statusLabel("online") }}</option>
                <option value="offline">{{ statusLabel("offline") }}</option>
                <option value="maintenance">{{ statusLabel("maintenance") }}</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Telemetry Topic</span>
            <input
              v-model.trim="deviceForm.telemetryTopic"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="pamilo/v1/tenants/demo-tenant/devices/SensorNode04/telemetry"
              type="text"
            />
            <p class="text-xs font-medium text-slate-400">{{ t("devices.modal.topicHelper") }}</p>
          </label>
        </div>
        <p v-if="formErrorMessage" class="mt-4 text-sm font-semibold text-rose-600">
          {{ formErrorMessage }}
        </p>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100" type="button" @click="closeAddModal">
            {{ t("common.cancel") }}
          </button>
          <button
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60"
            :disabled="isSaving"
            type="submit"
          >
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("common.save") }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="selectedDevice" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <section class="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-2xl backdrop-blur-xl md:p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-lg font-bold tracking-normal text-slate-800">{{ t("devices.detail.title") }}</h2>
            <p class="mt-1 truncate text-sm font-medium text-slate-400">{{ selectedDevice.displayName }} / {{ selectedDevice.deviceUid }}</p>
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100"
            type="button"
            :aria-label="t('devices.detail.close')"
            @click="closeDetail"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("devices.columns.deviceId") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ selectedDevice.deviceUid }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("common.status") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ statusLabel(selectedDevice.status) }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("devices.columns.assignedPlot") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ assignedPlotLabel(selectedDevice) }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("devices.columns.sensorProfile") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ sensorProfileLabel(selectedDevice.metadata) }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("devices.columns.lastSeen") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ formatLastSeen(selectedDevice.lastSeenAt) }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("devices.columns.battery") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ batteryLabel(selectedDevice.metadata) }}</p>
          </div>
        </div>

        <div class="mt-5 rounded-2xl border border-white/80 bg-white/60 p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Telemetry Topic</p>
              <p class="mt-1 break-all text-xs font-semibold text-slate-700">{{ selectedDevice.telemetryTopic }}</p>
            </div>
            <button
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              type="button"
              :aria-label="t('devices.actions.copyTopicAria', { topic: selectedDevice.telemetryTopic })"
              :title="t('devices.actions.copyTopic')"
              @click="copyTopic(selectedDevice)"
            >
              <Copy class="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BatteryMedium,
  Clock3,
  Copy,
  Cpu,
  Eye,
  MapPin,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Wifi,
  WifiOff,
  X
} from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "../../i18n";
import { formatDataCount, formatDateTime, formatNumber } from "../../i18n/formatters";
import { apiGet } from "../../services/apiClient";
import { useAuthStore } from "../../stores/authStore";
import { useDeviceStore, type ApiDevice, type DeviceStatus } from "../../stores/deviceStore";

type StatusFilter = "all" | DeviceStatus;

interface PlotOption {
  id: string;
  name: string;
}

const authStore = useAuthStore();
const deviceStore = useDeviceStore();
const { activePlotCount, devices, errorMessage, isLoading, isSaving, onlineDeviceCount } = storeToRefs(deviceStore);
const { t } = useI18n();
const searchQuery = ref("");
const statusFilter = ref<StatusFilter>("all");
const isAddModalOpen = ref(false);
const selectedDeviceId = ref<string | null>(null);
const formErrorKey = ref<string | null>(null);
const feedback = ref<{ key: string; params?: Record<string, string | number>; tone: "success" | "error" } | null>(null);
const plots = ref<PlotOption[]>([]);
const deviceForm = reactive<{
  deviceUid: string;
  displayName: string;
  plotId: string;
  sensorProfile: string;
  status: DeviceStatus;
  telemetryTopic: string;
}>({
  deviceUid: "",
  displayName: "",
  plotId: "",
  sensorProfile: "Soil NPK + pH",
  status: "offline",
  telemetryTopic: ""
});

const tenantId = computed(() => authStore.tenant?.id ?? "demo-tenant");
const formErrorMessage = computed(() => formErrorKey.value ? t(formErrorKey.value) : "");
const feedbackMessage = computed(() => feedback.value ? t(feedback.value.key, feedback.value.params) : "");
const feedbackToneClass = computed(() => feedback.value?.tone === "error"
  ? "border-rose-100 bg-rose-50/80 text-rose-700"
  : "border-emerald-100 bg-emerald-50/80 text-emerald-700");
const selectedDevice = computed(() => devices.value.find((device) => device.id === selectedDeviceId.value) ?? null);
const sensorProfileOptions = computed(() => systemSensorProfiles.map((profile) => ({
  label: t(`devices.sensorProfiles.${profile.key}`),
  value: profile.value
})));

const filteredDevices = computed(() => {
  const query = searchQuery.value.toLowerCase();

  return devices.value.filter((device) => {
    const matchesStatus = statusFilter.value === "all" || device.status === statusFilter.value;
    const matchesQuery = !query
      || device.deviceUid.toLowerCase().includes(query)
      || device.displayName.toLowerCase().includes(query)
      || (device.plotName ?? device.plotId).toLowerCase().includes(query)
      || sensorProfileRaw(device.metadata).toLowerCase().includes(query)
      || sensorProfileLabel(device.metadata).toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });
});

onMounted(() => {
  void deviceStore.fetchDevices();
  void fetchPlots();
});

watch(() => deviceForm.deviceUid, () => {
  deviceForm.telemetryTopic = buildTelemetryTopic(deviceForm.deviceUid);
});

function openAddModal(): void {
  formErrorKey.value = null;
  deviceForm.deviceUid = "";
  deviceForm.displayName = "";
  deviceForm.plotId = plots.value[0]?.id ?? "";
  deviceForm.sensorProfile = "Soil NPK + pH";
  deviceForm.status = "offline";
  deviceForm.telemetryTopic = buildTelemetryTopic("");
  deviceStore.clearError();
  isAddModalOpen.value = true;
}

function closeAddModal(): void {
  isAddModalOpen.value = false;
}

async function submitDevice(): Promise<void> {
  formErrorKey.value = validateDeviceForm();
  if (formErrorKey.value) {
    return;
  }

  const payload = {
    deviceUid: deviceForm.deviceUid,
    displayName: deviceForm.displayName,
    metadata: {
      batteryPercent: 100,
      sensorProfile: deviceForm.sensorProfile
    },
    plotId: deviceForm.plotId || null,
    status: deviceForm.status,
    telemetryTopic: deviceForm.telemetryTopic
  };
  const created = await deviceStore.createDevice({
    ...payload
  });

  if (created) {
    await fetchPlots();
    feedback.value = {
      key: "devices.feedback.deviceSaved",
      params: { deviceUid: created.deviceUid },
      tone: "success"
    };
    closeAddModal();
  }
}

async function removeDevice(deviceId: string): Promise<void> {
  const device = devices.value.find((item) => item.id === deviceId);
  if (!device) {
    return;
  }

  if (!window.confirm(t("devices.confirm.deleteDevice", { deviceUid: device.deviceUid }))) {
    return;
  }

  const deleted = await deviceStore.deleteDevice(deviceId);
  if (deleted) {
    if (selectedDeviceId.value === deviceId) {
      selectedDeviceId.value = null;
    }
    feedback.value = {
      key: "devices.feedback.deviceDeleted",
      params: { deviceUid: device.deviceUid },
      tone: "success"
    };
  }
}

function openDetail(deviceId: string): void {
  selectedDeviceId.value = deviceId;
}

function closeDetail(): void {
  selectedDeviceId.value = null;
}

async function copyDeviceId(device: ApiDevice): Promise<void> {
  await copyText(device.deviceUid, "devices.feedback.idCopied", "devices.feedback.copyFailed", { deviceUid: device.deviceUid });
}

async function copyTopic(device: ApiDevice): Promise<void> {
  await copyText(device.telemetryTopic, "devices.feedback.topicCopied", "devices.feedback.copyFailed", { topic: device.telemetryTopic });
}

async function copyText(text: string, successKey: string, errorKey: string, params: Record<string, string | number> = {}): Promise<void> {
  try {
    if (!navigator.clipboard) {
      throw new Error("Clipboard unavailable");
    }

    await navigator.clipboard.writeText(text);
    feedback.value = { key: successKey, params, tone: "success" };
  } catch {
    feedback.value = { key: errorKey, tone: "error" };
  }
}

async function fetchPlots(): Promise<void> {
  try {
    plots.value = await apiGet<PlotOption[]>("/api/v1/plots");
  } catch {
    plots.value = [];
  }
}

function buildTelemetryTopic(deviceUid: string): string {
  const normalizedDeviceUid = deviceUid.trim() || "SensorNode04";
  return `pamilo/v1/tenants/${tenantId.value}/devices/${normalizedDeviceUid}/telemetry`;
}

function assignedPlotLabel(device: ApiDevice): string {
  return device.plotName || device.plotId || t("devices.unassignedPlot");
}

function sensorProfileRaw(metadata: Record<string, unknown>): string {
  return typeof metadata.sensorProfile === "string" && metadata.sensorProfile.trim() ? metadata.sensorProfile : "Custom Payload";
}

function sensorProfileLabel(metadata: Record<string, unknown>): string {
  const rawProfile = sensorProfileRaw(metadata);
  const systemProfile = systemSensorProfiles.find((profile) => profile.value === rawProfile);
  return systemProfile ? t(`devices.sensorProfiles.${systemProfile.key}`) : rawProfile;
}

function batteryPercent(metadata: Record<string, unknown>): number | null {
  if (typeof metadata.batteryPercent !== "number" || Number.isNaN(metadata.batteryPercent)) {
    return null;
  }

  return Math.min(100, Math.max(0, metadata.batteryPercent));
}

function batteryProgressWidth(metadata: Record<string, unknown>): number {
  return batteryPercent(metadata) ?? 0;
}

function batteryLabel(metadata: Record<string, unknown>): string {
  const percent = batteryPercent(metadata);
  if (percent === null) {
    return t("devices.batteryUnavailable");
  }

  return t("devices.batteryPercent", {
    value: formatNumber(percent, { maximumFractionDigits: 0 })
  });
}

function statusIcon(status: DeviceStatus) {
  if (status === "online") {
    return Wifi;
  }

  if (status === "maintenance") {
    return Settings2;
  }

  return WifiOff;
}

function statusLabel(status: DeviceStatus): string {
  return t(`devices.status.${status}`);
}

function statusBadgeClass(status: DeviceStatus): string {
  if (status === "online") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "maintenance") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function formatLastSeen(value: string | null): string {
  if (!value) {
    return t("devices.neverSeen");
  }

  return formatDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function validateDeviceForm(): string | null {
  if (!deviceForm.deviceUid.trim()) {
    return "devices.validation.deviceUidRequired";
  }

  if (!deviceForm.displayName.trim()) {
    return "devices.validation.displayNameRequired";
  }

  if (!deviceForm.telemetryTopic.trim()) {
    return "devices.validation.topicRequired";
  }

  if (!deviceForm.telemetryTopic.includes(deviceForm.deviceUid.trim())) {
    return "devices.validation.topicDeviceMismatch";
  }

  return null;
}

const systemSensorProfiles = [
  { key: "soilNpkPh", value: "Soil NPK + pH" },
  { key: "weatherStation", value: "Weather Station" },
  { key: "waterLevel", value: "Water Level" },
  { key: "customPayload", value: "Custom Payload" }
] as const;
</script>
