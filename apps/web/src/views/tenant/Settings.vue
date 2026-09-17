<template>
  <div class="grid gap-5 text-slate-700 xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="h-fit rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition-all"
        :class="activeTab === item.id ? 'bg-emerald-100 font-semibold text-emerald-700' : 'font-medium text-slate-500 hover:bg-white/50 hover:text-slate-700'"
        type="button"
        @click="selectTab(item.id)"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </button>
    </aside>

    <section class="space-y-5">
      <div v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 shadow-sm backdrop-blur-md">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700 shadow-sm backdrop-blur-md">
        {{ successMessage }}
      </div>

      <form v-if="activeTab === 'profile'" class="rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6 lg:p-8" @submit.prevent="submitProfile">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-normal text-slate-800">{{ t("settings.tabs.profile") }}</h2>
            <p class="mt-1 mb-6 text-sm text-slate-500">{{ t("settings.profile.description") }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <UserRound class="h-6 w-6" />
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="space-y-2">
            <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("settings.profile.tenantName") }}</span>
            <input
              v-model.trim="profileDraft.name"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("settings.profile.email") }}</span>
            <input
              v-model.trim="profileDraft.email"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              required
              type="email"
            />
          </label>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("settings.profile.save") }}
          </button>
        </div>
      </form>

      <section v-else-if="activeTab === 'display'" class="rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6 lg:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-normal text-slate-800">{{ t("settings.tabs.display") }}</h2>
            <p class="mt-1 mb-6 text-sm text-slate-500">{{ t("settings.display.description") }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Palette class="h-6 w-6" />
          </div>
        </div>

        <div class="mt-6 grid gap-5">
          <div>
            <p class="mb-1.5 text-sm font-semibold text-slate-700">{{ t("settings.display.theme") }}</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                v-for="theme in themeOptions"
                :key="theme.value"
                class="min-h-11 rounded-xl px-4 text-sm font-semibold transition-all"
                :class="displayDraft.theme === theme.value ? 'bg-emerald-300 text-emerald-950 shadow-sm' : 'border border-slate-200 bg-white/50 text-slate-500 hover:bg-white/70 hover:text-slate-700'"
                type="button"
                @click="displayDraft.theme = theme.value"
              >
                {{ theme.label }}
              </button>
            </div>
          </div>

          <div class="grid gap-2">
            <p class="text-sm font-semibold text-slate-700">{{ t("settings.display.language") }}</p>
            <p class="text-xs text-slate-500">{{ t("settings.display.languageDetail") }}</p>
            <div class="mt-1 max-w-xs">
              <LanguageSelect />
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label v-for="item in displayToggles" :key="item.key" class="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/50 p-4 transition-all hover:bg-white/70">
              <span>
                <span class="block text-sm font-semibold text-slate-700">{{ item.label }}</span>
                <span class="mt-1 block text-xs text-slate-500">{{ item.detail }}</span>
              </span>
              <input
                class="h-5 w-5 accent-emerald-300"
                :checked="displayDraft[item.key]"
                type="checkbox"
                @change="setDisplayToggle(item.key, ($event.target as HTMLInputElement).checked)"
              />
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="button" @click="submitDisplay">
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("settings.display.save") }}
          </button>
        </div>
      </section>

      <section v-else-if="activeTab === 'notifications'" class="rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6 lg:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-normal text-slate-800">{{ t("settings.tabs.notifications") }}</h2>
            <p class="mt-1 mb-6 text-sm text-slate-500">{{ t("settings.notifications.description") }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Bell class="h-6 w-6" />
          </div>
        </div>

        <div class="mt-6 grid gap-3 md:grid-cols-2">
          <label v-for="item in notificationItems" :key="item.key" class="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/50 p-4 transition-all hover:bg-white/70">
            <span class="flex items-start gap-3">
              <component :is="item.icon" class="mt-0.5 h-5 w-5 text-emerald-700" />
              <span>
                <span class="block text-sm font-semibold text-slate-700">{{ item.label }}</span>
                <span class="mt-1 block text-xs text-slate-500">{{ item.detail }}</span>
              </span>
            </span>
            <input
              class="h-5 w-5 shrink-0 accent-emerald-300"
              :checked="notificationDraft[item.key]"
              type="checkbox"
              @change="setNotificationToggle(item.key, ($event.target as HTMLInputElement).checked)"
            />
          </label>
        </div>

        <div class="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-slate-700">{{ t("settings.notifications.pushTitle") }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ pushStatusLabel }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60"
                type="button"
                :disabled="isPushBusy || pushSupportState === 'denied' || pushSupportState === 'not_supported' || pushSupportState === 'unsupported_context'"
                @click="enablePushNotifications"
              >
                <Bell class="h-4 w-4" />
                {{ t("settings.notifications.enablePush") }}
              </button>
              <button
                class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-white disabled:opacity-60"
                type="button"
                :disabled="isPushBusy || pushSupportState !== 'granted'"
                @click="settingsStore.testWebPush"
              >
                {{ t("settings.notifications.testPush") }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="button" @click="submitNotifications">
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("settings.notifications.save") }}
          </button>
        </div>
      </section>

      <form v-else-if="activeTab === 'security'" class="rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6 lg:p-8" @submit.prevent="submitPassword">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-normal text-slate-800">{{ t("settings.tabs.security") }}</h2>
            <p class="mt-1 mb-6 text-sm text-slate-500">{{ t("settings.security.description") }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck class="h-6 w-6" />
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <label class="space-y-2">
            <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("settings.security.currentPassword") }}</span>
            <input v-model="passwordForm.currentPassword" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" required type="password" autocomplete="current-password" />
          </label>
          <label class="space-y-2">
            <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("settings.security.newPassword") }}</span>
            <input v-model="passwordForm.newPassword" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" minlength="8" required type="password" autocomplete="new-password" />
          </label>
          <label class="space-y-2">
            <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("settings.security.confirmPassword") }}</span>
            <input v-model="passwordForm.confirmPassword" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" minlength="8" required type="password" autocomplete="new-password" />
          </label>
        </div>

        <div v-if="passwordMismatch" class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
          {{ t("settings.security.passwordMismatch") }}
        </div>

        <div class="mt-6 flex justify-end">
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving || passwordMismatch" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? t("common.saving") : t("settings.security.changePassword") }}
          </button>
        </div>
      </form>

      <section v-else class="rounded-[2rem] border border-rose-200/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6 lg:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-normal text-slate-800">{{ t("settings.tabs.reset") }}</h2>
            <p class="mt-1 mb-6 text-sm text-slate-500">{{ t("settings.reset.description") }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <AlertTriangle class="h-6 w-6" />
          </div>
        </div>

        <div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
          {{ t("settings.reset.warning") }}
        </div>

        <button class="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-100 px-6 py-2.5 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-200" type="button" @click="isResetModalOpen = true">
          <RotateCcw class="h-4 w-4" />
          {{ t("settings.reset.button") }}
        </button>
      </section>
    </section>

    <div v-if="isResetModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl backdrop-blur-xl md:p-6" @submit.prevent="submitReset">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold tracking-normal text-slate-800">{{ t("settings.reset.confirmTitle") }}</h2>
            <p class="mt-2 text-sm text-slate-500">{{ t("settings.reset.confirmInstruction", { phrase: resetPhrase }) }}</p>
          </div>
          <button class="icon-button" type="button" :aria-label="t('settings.reset.closeModal')" @click="closeResetModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <input
          v-model.trim="resetConfirmation"
          class="mt-5 min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
          :placeholder="resetPhrase"
          type="text"
        />

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100" type="button" @click="closeResetModal">
            {{ t("common.cancel") }}
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-6 py-2.5 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-200 disabled:opacity-60" :disabled="isSaving || resetConfirmation !== resetPhrase" type="submit">
            <AlertTriangle class="h-4 w-4" />
            {{ isSaving ? t("settings.reset.resetting") : t("settings.reset.confirmButton") }}
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
import LanguageSelect from "../../components/i18n/LanguageSelect.vue";
import { useI18n } from "../../i18n";
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
const { displayPreferences, errorMessage, isLoading, isPushBusy, isSaving, notificationPreferences, profile, pushSupportState, successMessage } = storeToRefs(settingsStore);
const { locale, t } = useI18n();
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

const tabs = computed(() => [
  { id: "profile" as const, label: t("settings.tabs.profile"), icon: UserRound },
  { id: "display" as const, label: t("settings.tabs.display"), icon: Palette },
  { id: "notifications" as const, label: t("settings.tabs.notifications"), icon: Bell },
  { id: "security" as const, label: t("settings.tabs.security"), icon: ShieldCheck },
  { id: "reset" as const, label: t("settings.tabs.reset"), icon: RotateCcw }
]);

const themeOptions = computed<Array<{ label: string; value: DisplayTheme }>>(() => [
  { label: t("settings.display.themes.dark"), value: "dark" },
  { label: t("settings.display.themes.light"), value: "light" },
  { label: t("settings.display.themes.system"), value: "system" }
]);

const displayToggles = computed<Array<{ detail: string; key: DisplayToggleKey; label: string }>>(() => [
  { detail: t("settings.display.compactModeDetail"), key: "compactMode", label: t("settings.display.compactMode") },
  { detail: t("settings.display.reduceMotionDetail"), key: "reduceMotion", label: t("settings.display.reduceMotion") }
]);

const notificationItems = computed<Array<{ detail: string; icon: unknown; key: NotificationKey; label: string }>>(() => [
  { detail: t("settings.notifications.thresholdBreachesDetail"), icon: Gauge, key: "thresholdBreaches", label: t("settings.notifications.thresholdBreaches") },
  { detail: t("settings.notifications.emailAlertsDetail"), icon: Mail, key: "emailAlerts", label: t("settings.notifications.emailAlerts") },
  { detail: t("settings.notifications.smsAlertsDetail"), icon: Smartphone, key: "smsAlerts", label: t("settings.notifications.smsAlerts") },
  { detail: t("settings.notifications.webAlertsDetail"), icon: Monitor, key: "webAlerts", label: t("settings.notifications.webAlerts") },
  { detail: t("settings.notifications.deviceOfflineDetail"), icon: WifiOff, key: "deviceOffline", label: t("settings.notifications.deviceOffline") },
  { detail: t("settings.notifications.weatherWarningsDetail"), icon: CloudSun, key: "weatherWarnings", label: t("settings.notifications.weatherWarnings") }
]);

const passwordMismatch = computed(() => Boolean(passwordForm.newPassword || passwordForm.confirmPassword) && passwordForm.newPassword !== passwordForm.confirmPassword);
const pushStatusLabel = computed(() => {
  if (pushSupportState.value === "granted") return t("settings.notifications.pushGranted");
  if (pushSupportState.value === "denied") return t("settings.notifications.pushDenied");
  if (pushSupportState.value === "not_supported") return t("settings.notifications.pushUnsupported");
  if (pushSupportState.value === "unsupported_context") return t("settings.notifications.pushRequiresHttps");
  return t("settings.notifications.pushPrompt");
});

onMounted(async () => {
  await settingsStore.fetchSettings();
  await settingsStore.refreshPushState();
  syncDrafts();
});

watch(profile, () => {
  if (activeTab.value !== "profile") {
    syncProfileDraft();
  }
}, { deep: true });

watch(displayPreferences, () => {
  if (activeTab.value !== "display") {
    syncDisplayDraft();
  }
}, { deep: true });

watch(notificationPreferences, () => {
  if (activeTab.value !== "notifications") {
    syncNotificationDraft();
  }
}, { deep: true });

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
    language: locale.value,
    reduceMotion: displayDraft.reduceMotion,
    theme: displayDraft.theme
  });
}

async function submitNotifications(): Promise<void> {
  const saved = await settingsStore.updateNotificationPreferences({
    ...notificationDraft
  });

  if (!saved) {
    return;
  }

  if (notificationDraft.webAlerts) {
    await settingsStore.enableWebPush();
  } else {
    await settingsStore.disableWebPush();
  }
}

async function enablePushNotifications(): Promise<void> {
  notificationDraft.webAlerts = true;
  await settingsStore.updateNotificationPreferences({
    ...notificationDraft,
    webAlerts: true
  });
  await settingsStore.enableWebPush();
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
  syncProfileDraft();
  syncDisplayDraft();
  syncNotificationDraft();
}

function syncProfileDraft(): void {
  profileDraft.email = profile.value.email;
  profileDraft.name = profile.value.name;
}

function syncDisplayDraft(): void {
  displayDraft.compactMode = displayPreferences.value.compactMode;
  displayDraft.language = displayPreferences.value.language;
  displayDraft.reduceMotion = displayPreferences.value.reduceMotion;
  displayDraft.theme = displayPreferences.value.theme;
}

function syncNotificationDraft(): void {
  notificationDraft.deviceOffline = notificationPreferences.value.deviceOffline;
  notificationDraft.emailAlerts = notificationPreferences.value.emailAlerts;
  notificationDraft.smsAlerts = notificationPreferences.value.smsAlerts;
  notificationDraft.thresholdBreaches = notificationPreferences.value.thresholdBreaches;
  notificationDraft.weatherWarnings = notificationPreferences.value.weatherWarnings;
  notificationDraft.webAlerts = notificationPreferences.value.webAlerts;
}
</script>
