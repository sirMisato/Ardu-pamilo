import { ref } from "vue";
import { defineStore } from "pinia";
import type { LocaleCode } from "../i18n";
import { ApiClientError, apiGet, apiPost, apiPut } from "../services/apiClient";
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
  const resetResult = ref<ResetSystemResult | null>(null);

  async function fetchSettings(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await apiGet<TenantSettingsResponse>("/api/v1/settings");
      applySettingsResponse(response);
      useAuthStore().applyLocaleFromCurrentAuth(response.displayPreferences.language);
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengambil pengaturan tenant.");
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
      successMessage.value = "Profil tenant berhasil diperbarui.";
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal memperbarui profil.");
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
      successMessage.value = "Preferensi tampilan berhasil disimpan.";
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal memperbarui preferensi tampilan.");
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
      successMessage.value = "Preferensi notifikasi berhasil disimpan.";
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal memperbarui preferensi notifikasi.");
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<boolean> {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      await apiPut<{ ok: boolean }>("/api/v1/settings/password", input);
      successMessage.value = "Kata sandi berhasil diperbarui.";
      return true;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal mengganti kata sandi.");
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
      successMessage.value = `Reset selesai: ${response.deletedDevices} perangkat dan ${response.deletedTelemetryRows} telemetry rows dihapus.`;
      return response;
    } catch (error) {
      errorMessage.value = normalizeApiError(error, "Gagal melakukan reset sistem.");
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
    displayPreferences,
    errorMessage,
    fetchSettings,
    isLoading,
    isSaving,
    notificationPreferences,
    profile,
    resetResult,
    resetSystem,
    successMessage,
    updateDisplayPreferences,
    updateLanguagePreference,
    updateNotificationPreferences,
    updateProfile
  };
});

function normalizeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.status === 401 ? "Sesi login berakhir. Silakan login ulang." : error.message;
  }

  if (error instanceof TypeError) {
    return "API backend belum dapat dihubungi. Pastikan Fastify lokal sedang berjalan.";
  }

  return fallback;
}
