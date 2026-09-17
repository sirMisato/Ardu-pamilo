import crypto from "node:crypto";
import webPush, { type PushSubscription } from "web-push";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../db/client.js";
import type { Database, JsonValue } from "../db/schema.js";
import { env } from "../config/env.js";
import type { LocaleCode } from "../i18n/locale.js";

type NotificationPreferenceKey = "deviceOffline" | "thresholdBreaches" | "weatherWarnings" | "webAlerts";

interface WebPushPayload {
  body: string;
  data?: Record<string, string>;
  tag?: string;
  title: string;
}

interface TenantNotificationOptions {
  logger?: FastifyBaseLogger;
  preference: NotificationPreferenceKey;
}

interface ThresholdContext {
  deviceUid: string;
  metricKey: string;
  plotName: string | null;
  tenantId: string;
  unit?: string;
  value: number;
}

const thresholdNotificationThrottleMs = 15 * 60 * 1000;
const thresholdNotificationSentAt = new Map<string, number>();

const thresholdColumns: Record<string, { max: keyof ThresholdRow; min: keyof ThresholdRow; unit: string }> = {
  moisture: { max: "moisture_max", min: "moisture_min", unit: "%" },
  nitrogen: { max: "nitrogen_max", min: "nitrogen_min", unit: "mg/kg" },
  ph: { max: "ph_max", min: "ph_min", unit: "pH" },
  phosphorus: { max: "phosphorus_max", min: "phosphorus_min", unit: "mg/kg" },
  potassium: { max: "potassium_max", min: "potassium_min", unit: "mg/kg" }
};

interface ThresholdRow {
  crop_id: string | null;
  device_uid: string;
  moisture_max: number | string | null;
  moisture_min: number | string | null;
  nitrogen_max: number | string | null;
  nitrogen_min: number | string | null;
  ph_max: number | string | null;
  ph_min: number | string | null;
  phosphorus_max: number | string | null;
  phosphorus_min: number | string | null;
  plot_name: string | null;
  potassium_max: number | string | null;
  potassium_min: number | string | null;
}

export function isWebPushConfigured(): boolean {
  return Boolean(env.webPush.publicKey && env.webPush.privateKey);
}

export function getWebPushPublicKey(): string | null {
  configureWebPush();
  return env.webPush.publicKey ?? null;
}

export async function saveWebPushSubscription(input: {
  auth: string;
  endpoint: string;
  locale: LocaleCode;
  p256dh: string;
  tenantId: string;
  userAgent?: string | null;
  userId: string;
}): Promise<void> {
  const endpointHash = hashEndpoint(input.endpoint);
  const existing = await db
    .selectFrom("web_push_subscriptions")
    .select(["id"])
    .where("endpoint_hash", "=", endpointHash)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("web_push_subscriptions")
      .set({
        auth_key: input.auth,
        endpoint: input.endpoint,
        last_seen_at: new Date(),
        locale: input.locale,
        p256dh_key: input.p256dh,
        tenant_id: input.tenantId,
        updated_at: new Date(),
        user_agent: input.userAgent?.slice(0, 512) ?? null,
        user_id: input.userId
      })
      .where("id", "=", existing.id)
      .execute();
    return;
  }

  await db
    .insertInto("web_push_subscriptions")
    .values({
      auth_key: input.auth,
      created_at: new Date(),
      endpoint: input.endpoint,
      endpoint_hash: endpointHash,
      id: crypto.randomUUID(),
      last_seen_at: new Date(),
      locale: input.locale,
      p256dh_key: input.p256dh,
      tenant_id: input.tenantId,
      updated_at: new Date(),
      user_agent: input.userAgent?.slice(0, 512) ?? null,
      user_id: input.userId
    })
    .execute();
}

export async function deleteWebPushSubscription(endpoint: string, tenantId: string, userId: string): Promise<void> {
  await db
    .deleteFrom("web_push_subscriptions")
    .where("endpoint_hash", "=", hashEndpoint(endpoint))
    .where("tenant_id", "=", tenantId)
    .where("user_id", "=", userId)
    .execute();
}

export async function sendTestWebPush(input: {
  locale: LocaleCode;
  logger?: FastifyBaseLogger;
  tenantId: string;
  userId: string;
}): Promise<number> {
  const message = input.locale === "en"
    ? {
        body: "Web alerts are active. PAMILO can notify this device even when the app is closed.",
        title: "PAMILO notifications are ready"
      }
    : {
        body: "Alert Web aktif. PAMILO dapat memberi notifikasi ke perangkat ini walau aplikasi ditutup.",
        title: "Notifikasi PAMILO siap"
      };

  return sendPushToTenant(input.tenantId, {
    body: message.body,
    data: {
      url: "/settings"
    },
    tag: "pamilo-test",
    title: message.title
  }, {
    logger: input.logger,
    preference: "webAlerts"
  }, input.userId);
}

export async function notifyTelemetryThresholdBreaches(input: {
  db: DatabaseClient;
  deviceId: string;
  deviceUid: string;
  logger?: FastifyBaseLogger;
  payload: Record<string, JsonValue>;
  tenantId: string;
}): Promise<void> {
  const thresholdRow = await input.db
    .selectFrom("devices")
    .leftJoin("plots", "plots.id", "devices.plot_id")
    .leftJoin("master_crops", "master_crops.id", "plots.crop_id")
    .select([
      "devices.device_uid",
      "plots.crop_id",
      "plots.name as plot_name",
      "master_crops.moisture_max",
      "master_crops.moisture_min",
      "master_crops.nitrogen_max",
      "master_crops.nitrogen_min",
      "master_crops.ph_max",
      "master_crops.ph_min",
      "master_crops.phosphorus_max",
      "master_crops.phosphorus_min",
      "master_crops.potassium_max",
      "master_crops.potassium_min"
    ])
    .where("devices.id", "=", input.deviceId)
    .where("devices.tenant_id", "=", input.tenantId)
    .executeTakeFirst() as ThresholdRow | undefined;

  if (!thresholdRow?.crop_id) {
    return;
  }

  for (const [metricKey, columns] of Object.entries(thresholdColumns)) {
    const value = readNumericMetric(input.payload, metricKey);
    if (value === null) {
      continue;
    }

    const min = normalizeNumber(thresholdRow[columns.min]);
    const max = normalizeNumber(thresholdRow[columns.max]);
    const isBelow = min !== null && value < min;
    const isAbove = max !== null && value > max;

    if (!isBelow && !isAbove) {
      continue;
    }

    const throttleKey = `${input.tenantId}:${input.deviceUid}:${metricKey}:${isBelow ? "low" : "high"}`;
    const lastSentAt = thresholdNotificationSentAt.get(throttleKey) ?? 0;
    if (Date.now() - lastSentAt < thresholdNotificationThrottleMs) {
      continue;
    }

    thresholdNotificationSentAt.set(throttleKey, Date.now());
    await sendThresholdNotification({
      deviceUid: input.deviceUid,
      metricKey,
      plotName: thresholdRow.plot_name,
      tenantId: input.tenantId,
      unit: columns.unit,
      value
    }, input.logger);
  }
}

async function sendThresholdNotification(context: ThresholdContext, logger?: FastifyBaseLogger): Promise<void> {
  const metricLabel = metricLabels[context.metricKey] ?? context.metricKey;
  const formattedValue = `${formatNumber(context.value)}${context.unit && context.unit !== "pH" ? ` ${context.unit}` : ""}`;
  const location = context.plotName ?? context.deviceUid;

  await sendPushToTenant(context.tenantId, {
    body: `${metricLabel.id} ${formattedValue} di ${location}. Buka PAMILO untuk melihat detail sensor.`,
    data: {
      url: "/dashboard"
    },
    tag: `threshold-${context.deviceUid}-${context.metricKey}`,
    title: "Ambang sensor terlampaui"
  }, {
    logger,
    preference: "thresholdBreaches"
  });
}

async function sendPushToTenant(
  tenantId: string,
  payload: WebPushPayload,
  options: TenantNotificationOptions,
  userId?: string
): Promise<number> {
  configureWebPush();

  if (!isWebPushConfigured()) {
    options.logger?.warn("Skipping web push because VAPID keys are not configured.");
    return 0;
  }

  if (!(await isNotificationPreferenceEnabled(tenantId, options.preference))) {
    return 0;
  }

  let query = db
    .selectFrom("web_push_subscriptions")
    .select(["auth_key", "endpoint", "id", "p256dh_key"])
    .where("tenant_id", "=", tenantId);

  if (userId) {
    query = query.where("user_id", "=", userId);
  }

  const subscriptions = await query.execute();
  let sent = 0;

  await Promise.all(subscriptions.map(async (subscription) => {
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.auth_key,
        p256dh: subscription.p256dh_key
      }
    };

    try {
      await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : null;

      if (statusCode === 404 || statusCode === 410) {
        await db.deleteFrom("web_push_subscriptions").where("id", "=", subscription.id).execute();
        return;
      }

      options.logger?.warn({ error }, "Failed to send web push notification.");
    }
  }));

  return sent;
}

async function isNotificationPreferenceEnabled(tenantId: string, key: NotificationPreferenceKey): Promise<boolean> {
  const row = await db
    .selectFrom("tenant_settings")
    .select(["notification_preferences_json"])
    .where("tenant_id", "=", tenantId)
    .executeTakeFirst();

  const preferences = parseJsonObject(row?.notification_preferences_json);
  return preferences.webAlerts !== false && preferences[key] !== false;
}

function configureWebPush(): void {
  if (!env.webPush.publicKey || !env.webPush.privateKey) {
    return;
  }

  webPush.setVapidDetails(env.webPush.contact, env.webPush.publicKey, env.webPush.privateKey);
}

function hashEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

function readNumericMetric(payload: Record<string, JsonValue>, metricKey: string): number | null {
  const metrics = isRecord(payload.metrics) ? payload.metrics as Record<string, JsonValue> : payload;
  const value = readNestedValue(metrics, metricKey);

  if (isRecord(value) && "value" in value) {
    return normalizeNumber(value.value);
  }

  return normalizeNumber(value);
}

function readNestedValue(payload: Record<string, JsonValue>, keyPath: string): JsonValue | undefined {
  return keyPath.split(".").reduce<JsonValue | undefined>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, payload);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseJsonObject(value: JsonValue | string | undefined): Record<string, unknown> {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2
  }).format(value);
}

const metricLabels: Record<string, { id: string }> = {
  moisture: { id: "Kelembapan tanah" },
  nitrogen: { id: "Nitrogen" },
  ph: { id: "pH tanah" },
  phosphorus: { id: "Fosfor" },
  potassium: { id: "Kalium" }
};

type DatabaseClient = Pick<import("kysely").Kysely<Database>, "selectFrom">;
