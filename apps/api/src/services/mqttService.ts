import type { FastifyBaseLogger } from "fastify";
import { type Kysely } from "kysely";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import type { Database, JsonValue } from "../db/schema.js";

const telemetryTopicPattern = /^pamilo\/v1\/tenants\/([^/]+)\/devices\/([^/]+)\/telemetry$/;
const duplicateTelemetryWindowMs = 3_000;

export interface MqttTelemetryServiceOptions {
  brokerUrl: string;
  clientId: string;
  db: Kysely<Database>;
  logger: FastifyBaseLogger;
  password?: string;
  telemetryTopic?: string;
  username?: string;
}

export interface MqttTelemetryService {
  client: MqttClient;
  stop: () => Promise<void>;
}

export function startMqttTelemetryService(options: MqttTelemetryServiceOptions): MqttTelemetryService {
  const subscriptionTopic = options.telemetryTopic ?? "pamilo/v1/tenants/+/devices/+/telemetry";
  const clientOptions: IClientOptions = {
    clean: true,
    clientId: options.clientId,
    connectTimeout: 10_000,
    password: options.password,
    reconnectPeriod: 5_000,
    username: options.username
  };

  const client = mqtt.connect(options.brokerUrl, clientOptions);

  client.on("connect", () => {
    options.logger.info({ subscriptionTopic }, "MQTT connected, subscribing to telemetry wildcard.");
    client.subscribe(subscriptionTopic, { qos: 1 }, (error) => {
      if (error) {
        options.logger.error({ error }, "Failed to subscribe to telemetry topic.");
        return;
      }

      options.logger.info({ subscriptionTopic }, "MQTT telemetry subscription is active.");
    });
  });

  client.on("message", (topic, payload) => {
    void ingestTelemetryMessage({
      db: options.db,
      logger: options.logger,
      payload,
      topic
    });
  });

  client.on("error", (error) => {
    options.logger.error({ error }, "MQTT client error.");
  });

  client.on("reconnect", () => {
    options.logger.warn("MQTT reconnecting.");
  });

  return {
    client,
    stop: () => new Promise<void>((resolve) => {
      client.end(false, {}, () => resolve());
    })
  };
}

export async function ingestTelemetryMessage(input: {
  db: Kysely<Database>;
  logger: FastifyBaseLogger;
  payload: Buffer;
  topic: string;
}): Promise<boolean> {
  const topicParts = parseTelemetryTopic(input.topic);
  if (!topicParts) {
    input.logger.warn({ topic: input.topic }, "Ignoring MQTT message from unsupported topic.");
    return false;
  }

  const parsedPayload = parseJsonPayload(input.payload);
  if (!parsedPayload) {
    input.logger.warn({ topic: input.topic }, "Ignoring telemetry payload that is not a JSON object.");
    return false;
  }

  const device = await input.db
    .selectFrom("devices")
    .select(["id", "tenant_id"])
    .where("tenant_id", "=", topicParts.tenantId)
    .where("device_uid", "=", topicParts.deviceUid)
    .executeTakeFirst();

  if (!device) {
    input.logger.warn(
      {
        deviceUid: topicParts.deviceUid,
        tenantId: topicParts.tenantId,
        topic: input.topic
      },
      "Ignoring telemetry for an unregistered device."
    );
    return false;
  }

  const receivedAt = new Date();
  const metricKeys = collectMetricKeys(parsedPayload);
  const payloadJson = JSON.stringify(parsedPayload);

  if (await isDuplicateTelemetry({
    db: input.db,
    deviceId: device.id,
    payload: parsedPayload,
    receivedAt,
    tenantId: topicParts.tenantId,
    topic: input.topic
  })) {
    input.logger.info(
      {
        deviceUid: topicParts.deviceUid,
        tenantId: topicParts.tenantId
      },
      "Skipping duplicate telemetry payload."
    );
    return false;
  }

  await input.db
    .insertInto("telemetry_data")
    .values({
      device_id: device.id,
      metric_keys_json: JSON.stringify(metricKeys),
      payload_json: payloadJson,
      received_at: receivedAt,
      tenant_id: topicParts.tenantId,
      topic: input.topic
    })
    .execute();

  await input.db
    .updateTable("devices")
    .set({
      last_seen_at: receivedAt,
      status: "online"
    })
    .where("id", "=", device.id)
    .where("tenant_id", "=", topicParts.tenantId)
    .execute();

  input.logger.info(
    {
      deviceUid: topicParts.deviceUid,
      metricKeys,
      tenantId: topicParts.tenantId
    },
    "Telemetry payload ingested."
  );

  return true;
}

export function parseTelemetryTopic(topic: string): { deviceUid: string; tenantId: string } | null {
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

function parseJsonPayload(payload: Buffer): Record<string, JsonValue> | null {
  try {
    const parsed = JSON.parse(payload.toString("utf8")) as unknown;

    if (!isPlainObject(parsed)) {
      return null;
    }

    return parsed as Record<string, JsonValue>;
  } catch {
    return null;
  }
}

function collectMetricKeys(payload: Record<string, JsonValue>): string[] {
  const reservedKeys = new Set(["device_id", "tenant_id", "timestamp", "time", "ts"]);
  const keys = new Set<string>();

  function visit(value: JsonValue, prefix: string): void {
    if (value === null) {
      return;
    }

    if (Array.isArray(value)) {
      if (prefix && value.every((item) => typeof item === "number" || typeof item === "string" || typeof item === "boolean")) {
        keys.add(prefix);
      }
      return;
    }

    if (typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        const nextPrefix = prefix ? `${prefix}.${childKey}` : childKey;
        visit(childValue, nextPrefix);
      }
      return;
    }

    const topLevelKey = prefix.split(".")[0] ?? prefix;
    if (prefix && !reservedKeys.has(topLevelKey)) {
      keys.add(prefix);
    }
  }

  visit(payload, "");

  return Array.from(keys).sort();
}

async function isDuplicateTelemetry(input: {
  db: Kysely<Database>;
  deviceId: string;
  payload: Record<string, JsonValue>;
  receivedAt: Date;
  tenantId: string;
  topic: string;
}): Promise<boolean> {
  const duplicateWindowStart = new Date(input.receivedAt.getTime() - duplicateTelemetryWindowMs);
  const incomingPayloadKey = stableJsonStringify(input.payload);
  const recentRows = await input.db
    .selectFrom("telemetry_data")
    .select(["payload_json"])
    .where("tenant_id", "=", input.tenantId)
    .where("device_id", "=", input.deviceId)
    .where("topic", "=", input.topic)
    .where("received_at", ">=", duplicateWindowStart)
    .orderBy("received_at", "desc")
    .limit(8)
    .execute();

  return recentRows.some((row) => stableJsonStringify(parseStoredJsonObject(row.payload_json)) === incomingPayloadKey);
}

function parseStoredJsonObject(value: JsonValue | string): Record<string, JsonValue> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isPlainObject(parsed) ? parsed as Record<string, JsonValue> : {};
    } catch {
      return {};
    }
  }

  return isPlainObject(value) ? value : {};
}

function stableJsonStringify(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, childValue]) => `${JSON.stringify(key)}:${stableJsonStringify(childValue)}`)
    .join(",")}}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
