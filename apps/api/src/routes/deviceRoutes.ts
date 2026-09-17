import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { DeviceStatus, JsonValue } from "../db/schema.js";
import { apiMessage, fieldLabels } from "../i18n/messages.js";
import { requireTenantContext, verifyTenant, verifyTenantAdmin } from "../middleware/verifyTenant.js";

const deviceStatusSchema = z.enum(["online", "offline", "maintenance"]);

const createDeviceSchema = z.object({
  deviceUid: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(160),
  metadata: z.record(z.string(), z.unknown()).optional(),
  mqttUsername: z.string().trim().max(160).optional().nullable(),
  plotId: z.string().trim().min(1).max(36).optional().nullable(),
  status: deviceStatusSchema.optional().default("offline"),
  telemetryTopic: z.string().trim().min(1).max(255)
});

const routeParamsSchema = z.object({
  deviceId: z.string().trim().min(1)
});

const telemetryTopicPattern = /^pamilo\/v1\/tenants\/([^/]+)\/devices\/([^/]+)\/telemetry$/;

type CreateDeviceBody = z.infer<typeof createDeviceSchema>;

interface DeviceRow {
  created_at: Date | string;
  device_uid: string;
  display_name: string;
  id: string;
  last_seen_at: Date | string | null;
  metadata_json: JsonValue | string | null;
  mqtt_username: string | null;
  plot_id: string;
  plot_name: string | null;
  status: DeviceStatus;
  telemetry_topic: string;
  updated_at: Date | string;
}

export const deviceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.get("/devices", async (request) => {
    const tenant = requireTenantContext(request);
    const rows = await db
      .selectFrom("devices")
      .leftJoin("plots", "plots.id", "devices.plot_id")
      .select([
        "devices.created_at",
        "devices.device_uid",
        "devices.display_name",
        "devices.id",
        "devices.last_seen_at",
        "devices.metadata_json",
        "devices.mqtt_username",
        "devices.plot_id",
        "devices.status",
        "devices.telemetry_topic",
        "devices.updated_at",
        "plots.name as plot_name"
      ])
      .where("devices.tenant_id", "=", tenant.tenantId)
      .orderBy("devices.created_at", "desc")
      .execute();

    return rows.map(toDeviceDto);
  });

  app.post<{ Body: CreateDeviceBody }>("/devices", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = createDeviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid device payload",
        fieldLabels: fieldLabels(request.locale, deviceFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidDevicePayload")
      });
    }

    const body = parsed.data;
    const plot = await resolveDevicePlot(tenant.tenantId, body.plotId);

    if (!plot) {
      return reply.code(body.plotId ? 404 : 500).send({
        error: "Plot not found",
        message: apiMessage(request.locale, body.plotId ? "devicePlotNotFound" : "deviceDefaultPlotFailed")
      });
    }

    const topicParts = parseTelemetryTopic(body.telemetryTopic);
    if (!topicParts) {
      return reply.code(400).send({
        error: "Invalid telemetry topic",
        message: apiMessage(request.locale, "invalidTelemetryTopic")
      });
    }

    if (topicParts.tenantId !== tenant.tenantId || topicParts.deviceUid !== body.deviceUid) {
      return reply.code(400).send({
        error: "Telemetry topic mismatch",
        message: apiMessage(request.locale, "telemetryTopicMismatch")
      });
    }

    const existingDevice = await db
      .selectFrom("devices")
      .select(["id"])
      .where("tenant_id", "=", tenant.tenantId)
      .where((expressionBuilder) => expressionBuilder.or([
        expressionBuilder("device_uid", "=", body.deviceUid),
        expressionBuilder("telemetry_topic", "=", body.telemetryTopic)
      ]))
      .executeTakeFirst();

    if (existingDevice) {
      return reply.code(409).send({
        error: "Device already exists",
        message: apiMessage(request.locale, "deviceAlreadyExists")
      });
    }

    const deviceId = randomUUID();

    await db
      .insertInto("devices")
      .values({
        device_uid: body.deviceUid,
        display_name: body.displayName,
        id: deviceId,
        metadata_json: JSON.stringify(body.metadata ?? {}),
        mqtt_username: body.mqttUsername ?? null,
        plot_id: plot.id,
        status: body.status,
        telemetry_topic: body.telemetryTopic,
        tenant_id: tenant.tenantId
      })
      .execute();

    const row = await selectDeviceForTenant(deviceId, tenant.tenantId);

    return reply.code(201).send(row ? toDeviceDto(row) : {
      id: deviceId
    });
  });

  app.delete<{ Params: { deviceId: string } }>("/devices/:deviceId", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = routeParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid route params",
        fieldLabels: fieldLabels(request.locale, deviceFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidRouteParams")
      });
    }

    const result = await db
      .deleteFrom("devices")
      .where("id", "=", parsed.data.deviceId)
      .where("tenant_id", "=", tenant.tenantId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      return reply.code(404).send({
        error: "Device not found",
        message: apiMessage(request.locale, "deviceNotFound")
      });
    }

    return reply.code(204).send();
  });
};

async function selectDeviceForTenant(deviceId: string, tenantId: string): Promise<DeviceRow | undefined> {
  return db
    .selectFrom("devices")
    .leftJoin("plots", "plots.id", "devices.plot_id")
    .select([
      "devices.created_at",
      "devices.device_uid",
      "devices.display_name",
      "devices.id",
      "devices.last_seen_at",
      "devices.metadata_json",
      "devices.mqtt_username",
      "devices.plot_id",
      "devices.status",
      "devices.telemetry_topic",
      "devices.updated_at",
      "plots.name as plot_name"
    ])
    .where("devices.id", "=", deviceId)
    .where("devices.tenant_id", "=", tenantId)
    .executeTakeFirst();
}

async function resolveDevicePlot(tenantId: string, plotId: string | null | undefined): Promise<{ id: string; name: string } | undefined> {
  if (plotId) {
    return db
      .selectFrom("plots")
      .select(["id", "name"])
      .where("id", "=", plotId)
      .where("tenant_id", "=", tenantId)
      .executeTakeFirst();
  }

  const existingPlot = await db
    .selectFrom("plots")
    .select(["id", "name"])
    .where("tenant_id", "=", tenantId)
    .orderBy("created_at", "asc")
    .executeTakeFirst();

  if (existingPlot) {
    return existingPlot;
  }

  const defaultPlotId = randomUUID();
  await db
    .insertInto("plots")
    .values({
      area_hectares: null,
      bmkg_adm4_code: null,
      crop_id: null,
      id: defaultPlotId,
      name: "Field Utama",
      polygon_geojson: JSON.stringify({
        coordinates: [],
        type: "Polygon"
      }),
      tenant_id: tenantId
    })
    .execute();

  return {
    id: defaultPlotId,
    name: "Field Utama"
  };
}

function toDeviceDto(row: DeviceRow) {
  return {
    createdAt: serializeDate(row.created_at),
    deviceUid: row.device_uid,
    displayName: row.display_name,
    id: row.id,
    lastSeenAt: row.last_seen_at ? serializeDate(row.last_seen_at) : null,
    metadata: parseJsonObject(row.metadata_json),
    mqttUsername: row.mqtt_username,
    plotId: row.plot_id,
    plotName: row.plot_name,
    status: row.status,
    telemetryTopic: row.telemetry_topic,
    updatedAt: serializeDate(row.updated_at)
  };
}

function parseTelemetryTopic(topic: string): { deviceUid: string; tenantId: string } | null {
  const match = telemetryTopicPattern.exec(topic);
  if (!match) {
    return null;
  }

  const [, tenantId, deviceUid] = match;

  return {
    deviceUid,
    tenantId
  };
}

function parseJsonObject(value: JsonValue | string | null): Record<string, JsonValue> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed as Record<string, JsonValue> : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

const deviceFieldLabels = {
  deviceId: { en: "Device ID", id: "ID Perangkat" },
  deviceUid: { en: "Device UID", id: "Device UID" },
  displayName: { en: "Display Name", id: "Nama Tampilan" },
  metadata: { en: "Metadata", id: "Metadata" },
  mqttUsername: { en: "MQTT Username", id: "Username MQTT" },
  plotId: { en: "Plot ID", id: "ID Plot" },
  status: { en: "Status", id: "Status" },
  telemetryTopic: { en: "Telemetry Topic", id: "Topic Telemetry" }
};
