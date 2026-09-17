import type { LocaleCode } from "./locale.js";

type Params = Record<string, string | number | null | undefined>;

type ApiMessageKey =
  | "adminAuthNotConfigured"
  | "adminForbidden"
  | "adminInvalidCredentials"
  | "adminTokenRequired"
  | "cropEmptyUpdate"
  | "cropNotFound"
  | "deviceAlreadyExists"
  | "deviceDefaultPlotFailed"
  | "deviceNotFound"
  | "devicePlotNotFound"
  | "emptyTenantUpdate"
  | "invalidAdminLoginPayload"
  | "invalidCropPayload"
  | "invalidCropUpdate"
  | "invalidDevicePayload"
  | "invalidDisplayPreferences"
  | "invalidLoginPayload"
  | "invalidNotificationPreferences"
  | "invalidPasswordPayload"
  | "invalidPlotPayload"
  | "invalidPlotUpdate"
  | "invalidProfilePayload"
  | "invalidRouteParams"
  | "invalidTelemetryIngestPayload"
  | "invalidTelemetryQuery"
  | "invalidTelemetryTopic"
  | "invalidTenantPayload"
  | "invalidTenantUpdate"
  | "invalidTenantUserPayload"
  | "invalidTenantUserUpdate"
  | "licenseExpired"
  | "licenseRevoked"
  | "licenseSuspended"
  | "loginInvalidCredentials"
  | "plotCropNotFound"
  | "plotEmptyUpdate"
  | "plotHasDevices"
  | "plotNotFound"
  | "readOnlyTenant"
  | "telemetryTopicForbidden"
  | "telemetryTopicMismatch"
  | "tenantAlreadyExists"
  | "tenantContextMissing"
  | "tenantNotFound"
  | "tenantOwnerEmailExists"
  | "tenantTokenRequired"
  | "tenantUserInactive";

const messages: Record<ApiMessageKey, Record<LocaleCode, string>> = {
  adminAuthNotConfigured: {
    en: "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD_HASH in the API environment.",
    id: "Atur SUPER_ADMIN_EMAIL dan SUPER_ADMIN_PASSWORD_HASH di environment API."
  },
  adminForbidden: {
    en: "Super admin privileges are required.",
    id: "Hak akses super admin diperlukan."
  },
  adminInvalidCredentials: {
    en: "The admin email or password is incorrect.",
    id: "Email atau kata sandi admin tidak sesuai."
  },
  adminTokenRequired: {
    en: "A valid super admin bearer token is required.",
    id: "Bearer token super admin yang valid diperlukan."
  },
  cropEmptyUpdate: {
    en: "Send at least one crop field.",
    id: "Minimal satu field tanaman harus dikirim."
  },
  cropNotFound: {
    en: "The crop type is not available for this tenant.",
    id: "Jenis tanaman tidak tersedia untuk tenant ini."
  },
  deviceAlreadyExists: {
    en: "Device UID or telemetry topic is already registered for this tenant.",
    id: "Device UID atau telemetry topic sudah terdaftar untuk tenant ini."
  },
  deviceDefaultPlotFailed: {
    en: "Unable to prepare a default field for this tenant.",
    id: "Field utama untuk tenant ini belum bisa disiapkan."
  },
  deviceNotFound: {
    en: "The device is not available for this tenant.",
    id: "Perangkat tidak tersedia untuk tenant ini."
  },
  devicePlotNotFound: {
    en: "The target plot is not available for this tenant.",
    id: "Plot tujuan tidak tersedia untuk tenant ini."
  },
  emptyTenantUpdate: {
    en: "Send at least one tenant field.",
    id: "Minimal satu field tenant harus dikirim."
  },
  invalidAdminLoginPayload: {
    en: "Admin login data is invalid.",
    id: "Data login admin tidak valid."
  },
  invalidCropPayload: {
    en: "Crop data is invalid.",
    id: "Data tanaman tidak valid."
  },
  invalidCropUpdate: {
    en: "Crop update data is invalid.",
    id: "Data pembaruan tanaman tidak valid."
  },
  invalidDevicePayload: {
    en: "Device data is invalid.",
    id: "Data perangkat tidak valid."
  },
  invalidDisplayPreferences: {
    en: "Display preference data is invalid.",
    id: "Data preferensi tampilan tidak valid."
  },
  invalidLoginPayload: {
    en: "Login data is invalid.",
    id: "Data login tidak valid."
  },
  invalidNotificationPreferences: {
    en: "Notification preference data is invalid.",
    id: "Data preferensi notifikasi tidak valid."
  },
  invalidPasswordPayload: {
    en: "Password data is invalid.",
    id: "Data kata sandi tidak valid."
  },
  invalidPlotPayload: {
    en: "Zone or area data is invalid.",
    id: "Data zona atau area tidak valid."
  },
  invalidPlotUpdate: {
    en: "Zone or area update data is invalid.",
    id: "Data pembaruan zona atau area tidak valid."
  },
  invalidProfilePayload: {
    en: "Profile data is invalid.",
    id: "Data profil tidak valid."
  },
  invalidRouteParams: {
    en: "Route parameters are invalid.",
    id: "Parameter route tidak valid."
  },
  invalidTelemetryIngestPayload: {
    en: "Telemetry ingest payload is invalid.",
    id: "Payload ingest telemetry tidak valid."
  },
  invalidTelemetryQuery: {
    en: "Telemetry filter is invalid.",
    id: "Filter telemetry tidak valid."
  },
  invalidTelemetryTopic: {
    en: "Topic must use the format pamilo/v1/tenants/{tenant_id}/devices/{device_uid}/telemetry.",
    id: "Topic harus memakai format pamilo/v1/tenants/{tenant_id}/devices/{device_uid}/telemetry."
  },
  invalidTenantPayload: {
    en: "Tenant license data is invalid.",
    id: "Data lisensi tenant tidak valid."
  },
  invalidTenantUpdate: {
    en: "Tenant license update data is invalid.",
    id: "Data pembaruan lisensi tenant tidak valid."
  },
  invalidTenantUserPayload: {
    en: "Tenant user data is invalid.",
    id: "Data user tenant tidak valid."
  },
  invalidTenantUserUpdate: {
    en: "Tenant user update data is invalid.",
    id: "Data pembaruan user tenant tidak valid."
  },
  licenseExpired: {
    en: "The tenant license has expired.",
    id: "Lisensi tenant sudah kedaluwarsa."
  },
  licenseRevoked: {
    en: "The tenant license has been revoked.",
    id: "Lisensi tenant sudah dicabut."
  },
  licenseSuspended: {
    en: "The tenant license is suspended.",
    id: "Lisensi tenant sedang ditangguhkan."
  },
  loginInvalidCredentials: {
    en: "The email, username, or password is incorrect.",
    id: "Email/username atau kata sandi tidak sesuai."
  },
  plotCropNotFound: {
    en: "The selected crop is not available for this tenant.",
    id: "Tanaman yang dipilih tidak tersedia untuk tenant ini."
  },
  plotEmptyUpdate: {
    en: "Send at least one zone or area field.",
    id: "Minimal satu field zona atau area harus dikirim."
  },
  plotHasDevices: {
    en: "Remove or move devices from this zone before deleting the area.",
    id: "Hapus atau pindahkan perangkat pada zona ini sebelum menghapus area."
  },
  plotNotFound: {
    en: "The zone or area is not available for this tenant.",
    id: "Zona atau area tidak tersedia untuk tenant ini."
  },
  readOnlyTenant: {
    en: "Read-only users can only view Dashboard, Weather Station, Charts, and Reports.",
    id: "User read-only hanya dapat melihat Dashboard, Weather Station, Grafik, dan Report."
  },
  telemetryTopicForbidden: {
    en: "The tenant in the telemetry topic does not match the signed-in tenant.",
    id: "Tenant pada topic telemetry tidak sesuai dengan tenant login."
  },
  telemetryTopicMismatch: {
    en: "Tenant ID and Device UID in the telemetry topic must match the active tenant and device.",
    id: "Tenant ID dan Device UID pada telemetry topic harus sama dengan tenant aktif dan Device UID perangkat."
  },
  tenantAlreadyExists: {
    en: "Owner email or tenant ID is already registered.",
    id: "Owner email atau tenant ID sudah terdaftar."
  },
  tenantContextMissing: {
    en: "JWT must include tenant_id for tenant-scoped operations.",
    id: "JWT harus memuat tenant_id untuk operasi tenant."
  },
  tenantNotFound: {
    en: "Tenant license was not found.",
    id: "Lisensi tenant tidak ditemukan."
  },
  tenantOwnerEmailExists: {
    en: "Owner email is already used by another tenant.",
    id: "Owner email sudah digunakan tenant lain."
  },
  tenantTokenRequired: {
    en: "A valid bearer token is required.",
    id: "Bearer token yang valid diperlukan."
  },
  tenantUserInactive: {
    en: "This tenant user is inactive.",
    id: "User tenant sedang tidak aktif."
  }
};

export function apiMessage(locale: LocaleCode, key: ApiMessageKey, params: Params = {}): string {
  return interpolate(messages[key]?.[locale] ?? messages[key]?.id ?? "", params);
}

export function fieldLabels(locale: LocaleCode, labels: Record<string, { en: string; id: string }>): Record<string, string> {
  return Object.fromEntries(Object.entries(labels).map(([field, label]) => [field, label[locale]]));
}

function interpolate(value: string, params: Params): string {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const replacement = params[name];
    return replacement === null || replacement === undefined ? match : String(replacement);
  });
}
