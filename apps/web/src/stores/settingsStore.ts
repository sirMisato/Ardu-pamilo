import { ref } from "vue";
import { defineStore } from "pinia";
import { t, type LocaleCode } from "../i18n";
import { ApiClientError, apiGet, apiPost, apiPut } from "../services/apiClient";
import {
  getPushSupportState,
  isPushConfigured,
  sendTestWebPush,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  type PushSupportState
} from "../services/webPush";
import { useAuthStore } from "./authStore";

export type DisplayTheme = "dark" | "light" | "system";

export interface TenantProfileSettings {
  email: string;
  name: string;
}

export interface DisplayPreferences {
  compactMode: boolean;
  language?: LocaleCode;
  reduceMotion: boolean;
  theme: DisplayTheme;
}

export interface NotificationPreferences {
  deviceOffline: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  thresholdBreaches: boolean;
  weatherWarnings: boolean;
  webAlerts: boolean;
}

export interface TenantSettingsResponse {
  displayPreferences: DisplayPreferences;
  notificationPreferences: NotificationPreferences;
  profile: TenantProfileSettings;
}

export interface ResetSystemResult {
  deletedDevices: number;
  deletedTelemetryRows: number;
  ok: boolean;
}

export const useSettingsStore = defineStore("settings", () => {
  const profile = ref<TenantProfileSettings>({
    email: "",
    name: ""
  });
  const displayPreferences = ref<DisplayPreferences>({
    compactMode: false,
    language: undefined,
    reduceMotion: false,
    theme: "dark"
  });
  const notificationPreferences = ref<NotificationPreferences>({
    deviceOffline: true,
    emailAlerts: true,
    smsAlerts: false,
    thresholdBreaches: true,
    weatherWarnings: true,
    webAlerts: true
  });
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isPushBusy = ref(false);
  const pushSupportState = ref<PushSupportState>("prompt");
  const resetResult = ref<ResetSystemResult | null>(null);

  async function fetchSettings(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await apiGet<TenantSettingsResponse>("/api/v1/settings");
      applySettingsResponse(response);
      useAuthStore().applyLocaleFromCurrentAuth(response.displayPreferences.language);
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.errors.loadFailed"));
    } finally {
      isLoading.value = false;
    }
  }

  async function updateProfile(input: TenantProfileSettings): Promise<boolean> {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await apiPut<TenantSettingsResponse>("/api/v1/settings/profile", input);
      applySettingsResponse(response);
      useAuthStore().applyTenantProfile(response.profile);
      successMessage.value = t("settings.profile.saved");
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.errors.profileUpdateFailed"));
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateDisplayPreferences(input: Partial<DisplayPreferences>): Promise<boolean> {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await apiPut<{ displayPreferences: DisplayPreferences }>("/api/v1/settings/display", input);
      displayPreferences.value = response.displayPreferences;
      successMessage.value = t("settings.display.saved");
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.errors.displayUpdateFailed"));
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateLanguagePreference(language: LocaleCode): Promise<boolean> {
    try {
      const response = await apiPut<{ displayPreferences: DisplayPreferences }>("/api/v1/settings/display", {
        language
      });
      displayPreferences.value = response.displayPreferences;
      return true;
    } catch {
      return false;
    }
  }

  async function updateNotificationPreferences(input: Partial<NotificationPreferences>): Promise<boolean> {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await apiPut<{ notificationPreferences: NotificationPreferences }>("/api/v1/settings/notifications", input);
      notificationPreferences.value = response.notificationPreferences;
      successMessage.value = t("settings.notifications.saved");
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.errors.notificationsUpdateFailed"));
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function refreshPushState(): Promise<void> {
    pushSupportState.value = await getPushSupportState();
  }

  async function enableWebPush(): Promise<boolean> {
    isPushBusy.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      if (!(await isPushConfigured())) {
        errorMessage.value = t("settings.notifications.pushNotConfigured");
        return false;
      }

      await subscribeToWebPush();
      await refreshPushState();
      successMessage.value = t("settings.notifications.pushEnabled");
      return true;
    } catch (error) {
      await refreshPushState();
      errorMessage.value = normalizePushError(error);
      return false;
    } finally {
      isPushBusy.value = false;
    }
  }

  async function disableWebPush(): Promise<boolean> {
    isPushBusy.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      await unsubscribeFromWebPush();
      await refreshPushState();
      successMessage.value = t("settings.notifications.pushDisabled");
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.notifications.pushDisableFailed"));
      return false;
    } finally {
      isPushBusy.value = false;
    }
  }

  async function testWebPush(): Promise<boolean> {
    isPushBusy.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const sent = await sendTestWebPush();
      successMessage.value = sent > 0 ? t("settings.notifications.pushTestSent") : t("settings.notifications.pushNoDevice");
      return sent > 0;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.notifications.pushTestFailed"));
      return false;
    } finally {
      isPushBusy.value = false;
    }
  }

  async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<boolean> {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      await apiPut<{ ok: boolean }>("/api/v1/settings/password", input);
      successMessage.value = t("settings.security.saved");
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.errors.passwordUpdateFailed"));
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function resetSystem(confirmation: string): Promise<ResetSystemResult | null> {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;
    resetResult.value = null;

    try {
      const response = await apiPost<ResetSystemResult>("/api/v1/settings/reset-system", {
        confirmation
      });
      resetResult.value = response;
      successMessage.value = t("settings.reset.completed", {
        devices: response.deletedDevices,
        rows: response.deletedTelemetryRows
      });
      return response;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, t("settings.errors.resetFailed"));
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  function clearMessages(): void {
    errorMessage.value = null;
    successMessage.value = null;
  }

  function applySettingsResponse(response: TenantSettingsResponse): void {
    profile.value = response.profile;
    displayPreferences.value = response.displayPreferences;
    notificationPreferences.value = response.notificationPreferences;
  }

  return {
    changePassword,
    clearMessages,
    disableWebPush,
    displayPreferences,
    enableWebPush,
    errorMessage,
    fetchSettings,
    isLoading,
    isPushBusy,
    isSaving,
    notificationPreferences,
    profile,
    pushSupportState,
    refreshPushState,
    resetResult,
    resetSystem,
    successMessage,
    testWebPush,
    updateDisplayPreferences,
    updateLanguagePreference,
    updateNotificationPreferences,
    updateProfile
  };
});

function normalizeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? t("settings.errors.sessionExpired") : error.message;
  }

  if (error instanceof TypeError) {
    return t("settings.errors.apiUnavailable");
  }

  return fallback;
}

function normalizePushError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "denied") {
      return t("settings.notifications.pushDenied");
    }

    if (error.message === "not_supported") {
      return t("settings.notifications.pushUnsupported");
    }

    if (error.message === "unsupported_context") {
      return t("settings.notifications.pushRequiresHttps");
    }

    if (error.message === "not_configured") {
      return t("settings.notifications.pushNotConfigured");
    }
  }

  return normalizeApiError(error, t("settings.notifications.pushEnableFailed"));
}
