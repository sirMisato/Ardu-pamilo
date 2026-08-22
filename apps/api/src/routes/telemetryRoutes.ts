import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { JsonValue } from "../db/schema.js";
import { requireTenantContext, verifyTenant } from "../middleware/verifyTenant.js";
import { ingestTelemetryMessage, parseTelemetryTopic } from "../services/mqttService.js";
import { subscribeTelemetryEvents, type TelemetryStreamEvent } from "../services/telemetryEventBus.js";

const historyQuerySchema = z.object({
  deviceId: z.string().trim().min(1).optional(),
  end: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(250),
  metricKey: z.string().trim().min(1).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  start: z.string().datetime().optional()
});
const ingestPayloadSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  topic: z.string().trim().min(1).max(255)
});

interface TelemetryHistoryRow {
  device_uid: string;
  metric_keys_json: JsonValue | string;
  payload_json: JsonValue | string;
  received_at: Date | string;
  telemetry_id: string | number | bigint;
  topic: string;
}

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.post<{ Body: z.input<typeof ingestPayloadSchema> }>("/telemetry/ingest", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = ingestPayloadSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid telemetry ingest payload",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const topicParts = parseTelemetryTopic(parsed.data.topic);
    if (!topicParts) {
      return reply.code(400).send({
        error: "Invalid telemetry topic",
        message: "Topic harus memakai format pamilo/v1/tenants/{tenant_id}/devices/{device_uid}/telemetry."
      });
    }

    if (topicParts.tenantId !== tenant.tenantId) {
      return reply.code(403).send({
        error: "Telemetry topic forbidden",
        message: "Tenant pada topic telemetry tidak sesuai dengan tenant login."
      });
    }

    const inserted = await ingestTelemetryMessage({
      db,
      logger: request.log,
      payload: Buffer.from(JSON.stringify(parsed.data.payload), "utf8"),
      topic: parsed.data.topic
    });

    return {
      inserted,
      ok: true
    };
  });

  app.get<{ Querystring: z.input<typeof historyQuerySchema> }>("/telemetry/history", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = historyQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid telemetry query",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const { deviceId, end, limit, metricKey, offset, start } = parsed.data;
    let query = db
      .selectFrom("telemetry_data")
      .innerJoin("devices", "devices.id", "telemetry_data.device_id")
      .select([
        "devices.device_uid",
        "telemetry_data.id as telemetry_id",
        "telemetry_data.metric_keys_json",
        "telemetry_data.payload_json",
        "telemetry_data.received_at",
        "telemetry_data.topic"
      ])
      .where("telemetry_data.tenant_id", "=", tenant.tenantId)
      .where("devices.tenant_id", "=", tenant.tenantId)
      .orderBy("telemetry_data.received_at", "desc")
      .limit(limit)
      .offset(offset);

    if (deviceId) {
      query = query.where((expressionBuilder) => expressionBuilder.or([
        expressionBuilder("devices.device_uid", "=", deviceId),
        expressionBuilder("telemetry_data.device_id", "=", deviceId)
      ]));
    }

    if (start) {
      query = query.where("telemetry_data.received_at", ">=", new Date(start));
    }

    if (end) {
      query = query.where("telemetry_data.received_at", "<=", new Date(end));
    }

    const rows = await query.execute();
    const items = rows
      .map((row) => toTelemetryHistoryItem(row, metricKey))
      .filter((row): row is NonNullable<ReturnType<typeof toTelemetryHistoryItem>> => row !== null)
      .reverse();

    return {
      count: items.length,
      items,
      limit,
      metricKey: metricKey ?? null,
      offset
    };
  });

  app.get("/telemetry/latest", async (request) => {
    const tenant = requireTenantContext(request);
    const rows = await db
      .selectFrom("telemetry_data")
      .innerJoin("devices", "devices.id", "telemetry_data.device_id")
      .select([
        "devices.device_uid",
        "telemetry_data.id as telemetry_id",
        "telemetry_data.metric_keys_json",
        "telemetry_data.payload_json",
        "telemetry_data.received_at",
        "telemetry_data.topic"
      ])
      .where("telemetry_data.tenant_id", "=", tenant.tenantId)
      .where("devices.tenant_id", "=", tenant.tenantId)
      .orderBy("telemetry_data.received_at", "desc")
      .limit(100)
      .execute();

    return rows.map((row) => toTelemetryHistoryItem(row, undefined)).filter(Boolean);
  });

  app.get("/telemetry/stream", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const raw = reply.raw;

    reply.hijack();
    raw.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no"
    });

    sendSseEvent(raw, "ready", {
      connectedAt: new Date().toISOString(),
      tenantId: tenant.tenantId
    });

    const unsubscribe = subscribeTelemetryEvents(tenant.tenantId, (event) => {
      sendSseEvent(raw, "telemetry", toTelemetryStreamItem(event));
    });
    const heartbeat = setInterval(() => {
      raw.write(": keep-alive\n\n");
    }, 25_000);
    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) {
        return;
      }

      isCleanedUp = true;
      clearInterval(heartbeat);
      unsubscribe();
    };

    raw.on("close", cleanup);
    raw.on("error", cleanup);
  });
};

function toTelemetryHistoryItem(row: TelemetryHistoryRow, metricKey: string | undefined) {
  const payload = parseJsonObject(row.payload_json);
  const metricKeys = parseStringArray(row.metric_keys_json);
  const value = metricKey ? readMetricValue(payload, metricKey) : null;

  if (metricKey && value === undefined) {
    return null;
  }

  return {
    deviceUid: row.device_uid,
    id: String(row.telemetry_id),
    metricKey: metricKey ?? null,
    metricKeys,
    payload,
    receivedAt: serializeDate(row.received_at),
    topic: row.topic,
    value: value ?? null
  };
}

function parseJsonObject(value: JsonValue | string): Record<string, JsonValue> {
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

function parseStringArray(value: JsonValue | string): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readMetricValue(payload: Record<string, JsonValue>, metricKey: string): JsonValue | undefined {
  const metrics = isRecord(payload.metrics) ? payload.metrics as Record<string, JsonValue> : payload;
  const directValue = readNestedValue(metrics, metricKey);

  if (isRecord(directValue) && "value" in directValue) {
    return directValue.value as JsonValue;
  }

  return directValue;
}

function readNestedValue(payload: Record<string, JsonValue>, keyPath: string): JsonValue | undefined {
  return keyPath.split(".").reduce<JsonValue | undefined>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`).toISOString();
  }

  return value;
}

function sendSseEvent(raw: NodeJS.WritableStream, event: string, payload: unknown): void {
  raw.write(`event: ${event}\n`);
  raw.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function toTelemetryStreamItem(event: TelemetryStreamEvent) {
  return {
    deviceUid: event.deviceUid,
    metricKeys: event.metricKeys,
    payload: event.payload,
    receivedAt: event.receivedAt,
    topic: event.topic
  };
}
