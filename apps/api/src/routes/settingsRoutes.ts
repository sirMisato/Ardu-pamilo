import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { JsonValue, Tenant, TenantSettings, TenantSettingsUpdate } from "../db/schema.js";
import type { LocaleCode } from "../i18n/locale.js";
import { apiMessage, fieldLabels } from "../i18n/messages.js";
import { requireTenantContext, verifyTenant, verifyTenantAdmin } from "../middleware/verifyTenant.js";
import {
  deleteWebPushSubscription,
  getWebPushPublicKey,
  isWebPushConfigured,
  saveWebPushSubscription,
  sendTestWebPush
} from "../services/webPushService.js";

const displayPreferencesSchema = z.object({
  compactMode: z.boolean().optional(),
  language: z.enum(["id", "en"]).optional(),
  reduceMotion: z.boolean().optional(),
  theme: z.enum(["dark", "light", "system"]).optional()
});

const notificationPreferencesSchema = z.object({
  deviceOffline: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  thresholdBreaches: z.boolean().optional(),
  weatherWarnings: z.boolean().optional(),
  webAlerts: z.boolean().optional()
});
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    auth: z.string().min(1).max(512),
    p256dh: z.string().min(1).max(512)
  })
});
const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048)
});

const profileSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(160)
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(255),
  newPassword: z.string().min(8).max(255)
});

const resetSchema = z.object({
  confirmation: z.literal("RESET PAMILO")
});

interface DisplayPreferences {
  compactMode: boolean;
  language?: "id" | "en";
  reduceMotion: boolean;
  theme: "dark" | "light" | "system";
}

interface NotificationPreferences {
  deviceOffline: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  thresholdBreaches: boolean;
  weatherWarnings: boolean;
  webAlerts: boolean;
}

const defaultDisplayPreferences: DisplayPreferences = {
  compactMode: false,
  language: undefined,
  reduceMotion: false,
  theme: "dark"
};

const defaultNotificationPreferences: NotificationPreferences = {
  deviceOffline: true,
  emailAlerts: true,
  smsAlerts: false,
  thresholdBreaches: true,
  weatherWarnings: true,
  webAlerts: true
};

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.get("/settings", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const settings = await ensureTenantSettings(tenant.tenantId);
    const tenantRow = await selectTenant(tenant.tenantId);

    if (!tenantRow) {
      return reply.code(404).send({
        error: "Tenant not found",
        message: settingsMessage(request.locale, "tenantContextNotFound")
      });
    }

    return toSettingsDto(tenantRow, settings);
  });

  app.get("/settings/push/public-key", async () => ({
    configured: isWebPushConfigured(),
    publicKey: getWebPushPublicKey()
  }));

  app.post<{ Body: z.input<typeof pushSubscriptionSchema> }>("/settings/push/subscriptions", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = pushSubscriptionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid push subscription",
        message: settingsMessage(request.locale, "invalidPushSubscription")
      });
    }

    if (!isWebPushConfigured()) {
      return reply.code(503).send({
        error: "Web push not configured",
        message: settingsMessage(request.locale, "webPushNotConfigured")
      });
    }

    await saveWebPushSubscription({
      auth: parsed.data.keys.auth,
      endpoint: parsed.data.endpoint,
      locale: request.locale,
      p256dh: parsed.data.keys.p256dh,
      tenantId: tenant.tenantId,
      userAgent: request.headers["user-agent"],
      userId: tenant.userId
    });

    return {
      ok: true
    };
  });

  app.delete<{ Body: z.input<typeof pushUnsubscribeSchema> }>("/settings/push/subscriptions", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = pushUnsubscribeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid push subscription",
        message: settingsMessage(request.locale, "invalidPushSubscription")
      });
    }

    await deleteWebPushSubscription(parsed.data.endpoint, tenant.tenantId, tenant.userId);

    return {
      ok: true
    };
  });

  app.post("/settings/push/test", async (request) => {
    const tenant = requireTenantContext(request);
    const sent = await sendTestWebPush({
      locale: request.locale,
      logger: request.log,
      tenantId: tenant.tenantId,
      userId: tenant.userId
    });

    return {
      ok: true,
      sent
    };
  });

  app.put<{ Body: z.input<typeof profileSchema> }>("/settings/profile", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = profileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid profile payload",
        fieldLabels: fieldLabels(request.locale, settingsFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidProfilePayload")
      });
    }

    try {
      const result = await db
        .updateTable("tenants")
        .set({
          account_name: parsed.data.name,
          owner_email: parsed.data.email
        })
        .where("id", "=", tenant.tenantId)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        return reply.code(404).send({
          error: "Tenant not found",
          message: settingsMessage(request.locale, "tenantProfileNotFound")
        });
      }
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return reply.code(409).send({
          error: "Email already exists",
          message: settingsMessage(request.locale, "emailExists")
        });
      }

      throw error;
    }

    const settings = await ensureTenantSettings(tenant.tenantId);
    const tenantRow = await selectTenant(tenant.tenantId);

    return tenantRow ? toSettingsDto(tenantRow, settings) : reply.code(404).send({
      error: "Tenant not found"
    });
  });

  app.put<{ Body: z.input<typeof passwordSchema> }>("/settings/password", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = passwordSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid password payload",
        fieldLabels: fieldLabels(request.locale, settingsFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidPasswordPayload")
      });
    }

    const tenantRow = await selectTenant(tenant.tenantId);

    if (!tenantRow || !(await bcrypt.compare(parsed.data.currentPassword, tenantRow.password_hash))) {
      return reply.code(401).send({
        error: "Invalid current password",
        message: settingsMessage(request.locale, "invalidCurrentPassword")
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db
      .updateTable("tenants")
      .set({
        password_hash: passwordHash
      })
      .where("id", "=", tenant.tenantId)
      .execute();

    return {
      ok: true
    };
  });

  app.put<{ Body: z.input<typeof displayPreferencesSchema> }>("/settings/display", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = displayPreferencesSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid display preferences",
        fieldLabels: fieldLabels(request.locale, settingsFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidDisplayPreferences")
      });
    }

    const settings = await ensureTenantSettings(tenant.tenantId);
    const current = normalizeDisplayPreferences(settings.display_preferences_json);
    const updated = {
      ...current,
      ...parsed.data
    };

    await updateTenantSettings(tenant.tenantId, {
      displayPreferences: updated
    });

    return {
      displayPreferences: updated
    };
  });

  app.put<{ Body: z.input<typeof notificationPreferencesSchema> }>("/settings/notifications", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = notificationPreferencesSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid notification preferences",
        fieldLabels: fieldLabels(request.locale, settingsFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidNotificationPreferences")
      });
    }

    const settings = await ensureTenantSettings(tenant.tenantId);
    const current = normalizeNotificationPreferences(settings.notification_preferences_json);
    const updated = {
      ...current,
      ...parsed.data
    };

    await updateTenantSettings(tenant.tenantId, {
      notificationPreferences: updated
    });

    return {
      notificationPreferences: updated
    };
  });

  app.post<{ Body: z.input<typeof resetSchema> }>("/settings/reset-system", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = resetSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid reset confirmation",
        message: settingsMessage(request.locale, "invalidResetConfirmation")
      });
    }

    const result = await db.transaction().execute(async (trx) => {
      const telemetryResult = await trx
        .deleteFrom("telemetry_data")
        .where("tenant_id", "=", tenant.tenantId)
        .executeTakeFirst();

      const devicesResult = await trx
        .deleteFrom("devices")
        .where("tenant_id", "=", tenant.tenantId)
        .executeTakeFirst();

      return {
        deletedDevices: Number(devicesResult.numDeletedRows),
        deletedTelemetryRows: Number(telemetryResult.numDeletedRows)
      };
    });

    return {
      ok: true,
      ...result
    };
  });
};

async function ensureTenantSettings(tenantId: string): Promise<TenantSettings> {
  const existing = await db
    .selectFrom("tenant_settings")
    .selectAll()
    .where("tenant_id", "=", tenantId)
    .executeTakeFirst();

  if (existing) {
    return existing;
  }

  await db
    .insertInto("tenant_settings")
    .values({
      display_preferences_json: JSON.stringify(defaultDisplayPreferences),
      notification_preferences_json: JSON.stringify(defaultNotificationPreferences),
      tenant_id: tenantId
    })
    .execute();

  const created = await db
    .selectFrom("tenant_settings")
    .selectAll()
    .where("tenant_id", "=", tenantId)
    .executeTakeFirst();

  if (!created) {
    throw new Error("Failed to create tenant settings.");
  }

  return created;
}

async function updateTenantSettings(
  tenantId: string,
  values: {
    displayPreferences?: DisplayPreferences;
    notificationPreferences?: NotificationPreferences;
  }
): Promise<void> {
  const updateValues: TenantSettingsUpdate = {};

  if (values.displayPreferences) {
    updateValues.display_preferences_json = JSON.stringify(values.displayPreferences);
  }

  if (values.notificationPreferences) {
    updateValues.notification_preferences_json = JSON.stringify(values.notificationPreferences);
  }

  if (Object.keys(updateValues).length === 0) {
    return;
  }

  await db
    .updateTable("tenant_settings")
    .set(updateValues)
    .where("tenant_id", "=", tenantId)
    .execute();
}

async function selectTenant(tenantId: string): Promise<Tenant | undefined> {
  return db
    .selectFrom("tenants")
    .selectAll()
    .where("id", "=", tenantId)
    .executeTakeFirst();
}

function toSettingsDto(tenant: Tenant, settings: TenantSettings) {
  return {
    displayPreferences: normalizeDisplayPreferences(settings.display_preferences_json),
    notificationPreferences: normalizeNotificationPreferences(settings.notification_preferences_json),
    profile: {
      email: tenant.owner_email,
      name: tenant.account_name
    }
  };
}

function normalizeDisplayPreferences(value: JsonValue | string): DisplayPreferences {
  const parsed = parseJsonObject(value);

  return {
    compactMode: typeof parsed.compactMode === "boolean" ? parsed.compactMode : defaultDisplayPreferences.compactMode,
    language: isLanguagePreference(parsed.language) ? parsed.language : defaultDisplayPreferences.language,
    reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : defaultDisplayPreferences.reduceMotion,
    theme: isDisplayTheme(parsed.theme) ? parsed.theme : defaultDisplayPreferences.theme
  };
}

function normalizeNotificationPreferences(value: JsonValue | string): NotificationPreferences {
  const parsed = parseJsonObject(value);

  return {
    deviceOffline: typeof parsed.deviceOffline === "boolean" ? parsed.deviceOffline : defaultNotificationPreferences.deviceOffline,
    emailAlerts: typeof parsed.emailAlerts === "boolean" ? parsed.emailAlerts : defaultNotificationPreferences.emailAlerts,
    smsAlerts: typeof parsed.smsAlerts === "boolean" ? parsed.smsAlerts : defaultNotificationPreferences.smsAlerts,
    thresholdBreaches: typeof parsed.thresholdBreaches === "boolean" ? parsed.thresholdBreaches : defaultNotificationPreferences.thresholdBreaches,
    weatherWarnings: typeof parsed.weatherWarnings === "boolean" ? parsed.weatherWarnings : defaultNotificationPreferences.weatherWarnings,
    webAlerts: typeof parsed.webAlerts === "boolean" ? parsed.webAlerts : defaultNotificationPreferences.webAlerts
  };
}

function parseJsonObject(value: JsonValue | string): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
}

function isDisplayTheme(value: unknown): value is DisplayPreferences["theme"] {
  return value === "dark" || value === "light" || value === "system";
}

function isLanguagePreference(value: unknown): value is NonNullable<DisplayPreferences["language"]> {
  return value === "id" || value === "en";
}

function isDuplicateEntryError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const settingsFieldLabels = {
  compactMode: { en: "Compact Mode", id: "Mode Ringkas" },
  confirmation: { en: "Confirmation", id: "Konfirmasi" },
  currentPassword: { en: "Current Password", id: "Password Saat Ini" },
  deviceOffline: { en: "Device Offline", id: "Perangkat Offline" },
  email: { en: "Email", id: "Email" },
  emailAlerts: { en: "Email Alerts", id: "Alert Email" },
  language: { en: "Language", id: "Bahasa" },
  name: { en: "Tenant Name", id: "Nama Tenant" },
  newPassword: { en: "New Password", id: "Password Baru" },
  reduceMotion: { en: "Reduce Motion", id: "Kurangi Gerak" },
  smsAlerts: { en: "SMS Alerts", id: "Alert SMS" },
  theme: { en: "Theme", id: "Tema" },
  thresholdBreaches: { en: "Threshold Breaches", id: "Ambang Terlampaui" },
  weatherWarnings: { en: "Weather Warnings", id: "Peringatan Cuaca" },
  webAlerts: { en: "Web Alerts", id: "Alert Web" }
};

function settingsMessage(
  locale: LocaleCode,
  key: "emailExists" | "invalidCurrentPassword" | "invalidPushSubscription" | "invalidResetConfirmation" | "tenantContextNotFound" | "tenantProfileNotFound" | "webPushNotConfigured"
): string {
  const messages: Record<LocaleCode, Record<typeof key, string>> = {
    en: {
      emailExists: "This email is already used by another tenant.",
      invalidCurrentPassword: "The current password is incorrect.",
      invalidPushSubscription: "The browser notification subscription is invalid.",
      invalidResetConfirmation: "Type RESET PAMILO to confirm the system reset.",
      tenantContextNotFound: "The tenant context was not found in the database.",
      tenantProfileNotFound: "Tenant profile was not found.",
      webPushNotConfigured: "Web push is not configured on the server yet."
    },
    id: {
      emailExists: "Email sudah digunakan tenant lain.",
      invalidCurrentPassword: "Kata sandi saat ini tidak sesuai.",
      invalidPushSubscription: "Subscription notifikasi browser tidak valid.",
      invalidResetConfirmation: "Ketik RESET PAMILO untuk mengonfirmasi reset sistem.",
      tenantContextNotFound: "Tenant context tidak ditemukan di database.",
      tenantProfileNotFound: "Tenant profile tidak ditemukan.",
      webPushNotConfigured: "Web push belum dikonfigurasi di server."
    }
  };

  return messages[locale][key];
}
