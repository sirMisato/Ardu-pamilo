<template>
  <div class="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="panel-surface h-fit p-3">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition"
        :class="activeTab === item.id ? 'bg-field-mint/10 text-field-mint ring-1 ring-field-mint/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'"
        type="button"
        @click="selectTab(item.id)"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </button>
    </aside>

    <section class="space-y-5">
      <div v-if="errorMessage" class="rounded-lg border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="rounded-lg border border-field-mint/25 bg-field-mint/10 p-4 text-sm text-field-mint">
        {{ successMessage }}
      </div>

      <form v-if="activeTab === 'profile'" class="panel-surface p-5" @submit.prevent="submitProfile">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Profil</h2>
            <p class="mt-1 text-sm text-slate-400">Identitas tenant yang tampil di dashboard.</p>
          </div>
          <UserRound class="h-7 w-7 text-field-mint" />
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Nama Tenant</span>
            <input
              v-model.trim="profileDraft.name"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Email</span>
            <input
              v-model.trim="profileDraft.email"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              required
              type="email"
            />
          </label>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan Profil" }}
          </button>
        </div>
      </form>

      <section v-else-if="activeTab === 'display'" class="panel-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Tampilan</h2>
            <p class="mt-1 text-sm text-slate-400">Preferensi visual tenant.</p>
          </div>
          <Palette class="h-7 w-7 text-field-mint" />
        </div>

        <div class="mt-6 grid gap-5">
          <div>
            <p class="text-sm font-medium text-slate-300">Theme</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                v-for="theme in themeOptions"
                :key="theme.value"
                class="min-h-11 rounded-lg px-4 text-sm font-semibold transition"
                :class="displayDraft.theme === theme.value ? 'bg-field-green text-[#102016]' : 'border border-white/10 bg-white/5 text-slate-300 hover:border-field-mint/35 hover:text-field-mint'"
                type="button"
                @click="displayDraft.theme = theme.value"
              >
                {{ theme.label }}
              </button>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label v-for="item in displayToggles" :key="item.key" class="flex min-h-20 items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <span>
                <span class="block text-sm font-semibold text-white">{{ item.label }}</span>
                <span class="mt-1 block text-xs text-slate-400">{{ item.detail }}</span>
              </span>
              <input
                class="h-5 w-5 accent-[#a7e8af]"
                :checked="displayDraft[item.key]"
                type="checkbox"
                @change="setDisplayToggle(item.key, ($event.target as HTMLInputElement).checked)"
              />
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving" type="button" @click="submitDisplay">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan Tampilan" }}
          </button>
        </div>
      </section>

      <section v-else-if="activeTab === 'notifications'" class="panel-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Notifikasi</h2>
            <p class="mt-1 text-sm text-slate-400">Alert operasional sensor dan cuaca.</p>
          </div>
          <Bell class="h-7 w-7 text-field-mint" />
        </div>

        <div class="mt-6 grid gap-3 md:grid-cols-2">
          <label v-for="item in notificationItems" :key="item.key" class="flex min-h-24 items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <span class="flex items-start gap-3">
              <component :is="item.icon" class="mt-0.5 h-5 w-5 text-field-mint" />
              <span>
                <span class="block text-sm font-semibold text-white">{{ item.label }}</span>
                <span class="mt-1 block text-xs text-slate-400">{{ item.detail }}</span>
              </span>
            </span>
            <input
              class="h-5 w-5 shrink-0 accent-[#a7e8af]"
              :checked="notificationDraft[item.key]"
              type="checkbox"
              @change="setNotificationToggle(item.key, ($event.target as HTMLInputElement).checked)"
            />
          </label>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving" type="button" @click="submitNotifications">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Simpan Notifikasi" }}
          </button>
        </div>
      </section>

      <form v-else-if="activeTab === 'security'" class="panel-surface p-5" @submit.prevent="submitPassword">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Keamanan</h2>
            <p class="mt-1 text-sm text-slate-400">Perbarui kata sandi tenant.</p>
          </div>
          <ShieldCheck class="h-7 w-7 text-field-mint" />
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Password Saat Ini</span>
            <input v-model="passwordForm.currentPassword" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" required type="password" autocomplete="current-password" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Password Baru</span>
            <input v-model="passwordForm.newPassword" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" minlength="8" required type="password" autocomplete="new-password" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Ulangi Password</span>
            <input v-model="passwordForm.confirmPassword" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" minlength="8" required type="password" autocomplete="new-password" />
          </label>
        </div>

        <div v-if="passwordMismatch" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          Password baru dan konfirmasi belum sama.
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving || passwordMismatch" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : "Ganti Password" }}
          </button>
        </div>
      </form>

      <section v-else class="rounded-lg border border-rose-300/25 bg-rose-300/10 p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-rose-100">Reset Semua Sistem</h2>
            <p class="mt-1 text-sm text-rose-100/75">Menghapus perangkat dan telemetry data tenant aktif.</p>
          </div>
          <AlertTriangle class="h-7 w-7 text-rose-200" />
        </div>

        <div class="mt-6 rounded-lg border border-rose-300/25 bg-[#160b13] p-4 text-sm text-rose-100">
          Reset hanya berlaku untuk tenant ini. Data tenant lain tidak disentuh oleh endpoint backend.
        </div>

        <button class="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-300 px-5 text-sm font-semibold text-rose-950 hover:bg-rose-200" type="button" @click="isResetModalOpen = true">
          <RotateCcw class="h-4 w-4" />
          Reset Tenant Data
        </button>
      </section>
    </section>

    <div v-if="isResetModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-lg border border-rose-300/30 bg-[#10131f] p-5 shadow-field" @submit.prevent="submitReset">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-rose-100">Konfirmasi Reset</h2>
            <p class="mt-2 text-sm text-slate-300">Ketik <span class="font-semibold text-rose-100">{{ resetPhrase }}</span> untuk melanjutkan.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeResetModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <input
          v-model.trim="resetConfirmation"
          class="mt-5 min-h-11 w-full rounded-lg border border-rose-300/25 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/25"
          placeholder="RESET PAMILO"
          type="text"
        />

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeResetModal">
            Batal
          </button>
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-300 px-5 text-sm font-semibold text-rose-950 hover:bg-rose-200 disabled:opacity-60" :disabled="isSaving || resetConfirmation !== resetPhrase" type="submit">
            <AlertTriangle class="h-4 w-4" />
            {{ isSaving ? "Mereset" : "Konfirmasi Reset" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  Bell,
  CloudSun,
  Gauge,
  Mail,
  Monitor,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
  WifiOff,
  X
} from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  useSettingsStore,
  type DisplayPreferences,
  type DisplayTheme,
  type NotificationPreferences
} from "../../stores/settingsStore";

type SettingsTab = "profile" | "display" | "notifications" | "security" | "reset";
type DisplayToggleKey = "compactMode" | "reduceMotion";
type NotificationKey = keyof NotificationPreferences;

const settingsStore = useSettingsStore();
const { displayPreferences, errorMessage, isLoading, isSaving, notificationPreferences, profile, successMessage } = storeToRefs(settingsStore);
const activeTab = ref<SettingsTab>("profile");
const isResetModalOpen = ref(false);
const resetPhrase = "RESET PAMILO";
const resetConfirmation = ref("");

const profileDraft = reactive({
  email: "",
  name: ""
});
const displayDraft = reactive<DisplayPreferences>({
  compactMode: false,
  reduceMotion: false,
  theme: "dark"
});
const notificationDraft = reactive<NotificationPreferences>({
  deviceOffline: true,
  emailAlerts: true,
  smsAlerts: false,
  thresholdBreaches: true,
  weatherWarnings: true,
  webAlerts: true
});
const passwordForm = reactive({
  confirmPassword: "",
  currentPassword: "",
  newPassword: ""
});

const tabs = [
  { id: "profile" as const, label: "Profil", icon: UserRound },
  { id: "display" as const, label: "Tampilan", icon: Palette },
  { id: "notifications" as const, label: "Notifikasi", icon: Bell },
  { id: "security" as const, label: "Keamanan", icon: ShieldCheck },
  { id: "reset" as const, label: "Reset Semua Sistem", icon: RotateCcw }
];

const themeOptions: Array<{ label: string; value: DisplayTheme }> = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "System", value: "system" }
];

const displayToggles: Array<{ detail: string; key: DisplayToggleKey; label: string }> = [
  { detail: "Rapatkan jarak antar panel dashboard.", key: "compactMode", label: "Compact Mode" },
  { detail: "Kurangi animasi transisi UI.", key: "reduceMotion", label: "Reduce Motion" }
];

const notificationItems: Array<{ detail: string; icon: unknown; key: NotificationKey; label: string }> = [
  { detail: "Saat nilai sensor melewati batas crop.", icon: Gauge, key: "thresholdBreaches", label: "Threshold Breach" },
  { detail: "Kirim ringkasan dan alert ke email owner.", icon: Mail, key: "emailAlerts", label: "Email Alerts" },
  { detail: "Aktifkan kanal SMS untuk alert kritis.", icon: Smartphone, key: "smsAlerts", label: "SMS Alerts" },
  { detail: "Tampilkan alert realtime di browser.", icon: Monitor, key: "webAlerts", label: "Web Alerts" },
  { detail: "Saat perangkat tidak mengirim data.", icon: WifiOff, key: "deviceOffline", label: "Device Offline" },
  { detail: "Peringatan cuaca dari BMKG.", icon: CloudSun, key: "weatherWarnings", label: "Weather Warnings" }
];

const passwordMismatch = computed(() => Boolean(passwordForm.newPassword || passwordForm.confirmPassword) && passwordForm.newPassword !== passwordForm.confirmPassword);

onMounted(async () => {
  await settingsStore.fetchSettings();
  syncDrafts();
});

watch([profile, displayPreferences, notificationPreferences], () => {
  syncDrafts();
}, {
  deep: true
});

function selectTab(tab: SettingsTab): void {
  activeTab.value = tab;
  settingsStore.clearMessages();
}

async function submitProfile(): Promise<void> {
  await settingsStore.updateProfile({
    email: profileDraft.email,
    name: profileDraft.name
  });
}

async function submitDisplay(): Promise<void> {
  await settingsStore.updateDisplayPreferences({
    compactMode: displayDraft.compactMode,
    reduceMotion: displayDraft.reduceMotion,
    theme: displayDraft.theme
  });
}

async function submitNotifications(): Promise<void> {
  await settingsStore.updateNotificationPreferences({
    ...notificationDraft
  });
}

async function submitPassword(): Promise<void> {
  if (passwordMismatch.value) {
    return;
  }

  const changed = await settingsStore.changePassword({
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword
  });

  if (changed) {
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
  }
}

async function submitReset(): Promise<void> {
  const result = await settingsStore.resetSystem(resetConfirmation.value);

  if (result) {
    closeResetModal();
  }
}

function closeResetModal(): void {
  isResetModalOpen.value = false;
  resetConfirmation.value = "";
}

function setDisplayToggle(key: DisplayToggleKey, value: boolean): void {
  displayDraft[key] = value;
}

function setNotificationToggle(key: NotificationKey, value: boolean): void {
  notificationDraft[key] = value;
}

function syncDrafts(): void {
  profileDraft.email = profile.value.email;
  profileDraft.name = profile.value.name;
  displayDraft.compactMode = displayPreferences.value.compactMode;
  displayDraft.reduceMotion = displayPreferences.value.reduceMotion;
  displayDraft.theme = displayPreferences.value.theme;
  notificationDraft.deviceOffline = notificationPreferences.value.deviceOffline;
  notificationDraft.emailAlerts = notificationPreferences.value.emailAlerts;
  notificationDraft.smsAlerts = notificationPreferences.value.smsAlerts;
  notificationDraft.thresholdBreaches = notificationPreferences.value.thresholdBreaches;
  notificationDraft.weatherWarnings = notificationPreferences.value.weatherWarnings;
  notificationDraft.webAlerts = notificationPreferences.value.webAlerts;
}
</script>
