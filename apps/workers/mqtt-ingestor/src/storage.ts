import { createClient } from "redis";
import {
  createTelemetryStorageRecord,
  serializeTelemetryStorageRecord,
  telemetryIdempotencyRedisKey,
  telemetryLatestRedisKey,
  type TelemetryStorageRecord
} from "@pamilo/shared";
import type { IngestResult } from "./ingestor.js";

export type AcceptedIngestResult = Extract<IngestResult, { ok: true }>;

export interface DevicePlotResolver {
  resolvePlotId(tenantId: string, deviceId: string): string | null;
}

export type TelemetryStoreResult =
  | {
      stored: true;
      plotId: string;
      streamId: string | null;
      readings: number;
      historyPoints: number;
    }
  | {
      stored: false;
      reason: "duplicate" | "unknown_device_plot";
      plotId?: string;
      readings: number;
    };

export interface TelemetryStorage {
  store(result: AcceptedIngestResult): Promise<TelemetryStoreResult>;
  close(): Promise<void>;
}

export interface RedisVictoriaTelemetryStorageOptions {
  redisUrl: string;
  victoriaMetricsUrl: string;
  devicePlotResolver: DevicePlotResolver;
  idempotencyTtlSeconds?: number;
  ingestStreamKey?: string;
  fetchImpl?: typeof fetch;
}

type RedisClient = ReturnType<typeof createClient>;

const defaultIdempotencyTtlSeconds = 7 * 24 * 60 * 60;
const defaultIngestStreamKey = "pamilo:telemetry:ingest";

export class StaticDevicePlotResolver implements DevicePlotResolver {
  readonly #map: Map<string, string>;
  readonly #defaultPlotId: string | null;

  constructor(map: ReadonlyMap<string, string> = new Map(), defaultPlotId: string | null = null) {
    this.#map = new Map(map);
    this.#defaultPlotId = defaultPlotId;
  }

  resolvePlotId(tenantId: string, deviceId: string): string | null {
    return this.#map.get(`${tenantId}/${deviceId}`) ?? this.#map.get(deviceId) ?? this.#defaultPlotId;
  }
}

export class RedisVictoriaTelemetryStorage implements TelemetryStorage {
  readonly #redisUrl: string;
  readonly #victoriaMetricsUrl: string;
  readonly #devicePlotResolver: DevicePlotResolver;
  readonly #idempotencyTtlSeconds: number;
  readonly #ingestStreamKey: string;
  readonly #fetch: typeof fetch;
  #redisClient: RedisClient | null = null;

  constructor(options: RedisVictoriaTelemetryStorageOptions) {
    this.#redisUrl = options.redisUrl;
    this.#victoriaMetricsUrl = options.victoriaMetricsUrl.replace(/\/+$/, "");
    this.#devicePlotResolver = options.devicePlotResolver;
    this.#idempotencyTtlSeconds = options.idempotencyTtlSeconds ?? defaultIdempotencyTtlSeconds;
    this.#ingestStreamKey = options.ingestStreamKey ?? defaultIngestStreamKey;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async store(result: AcceptedIngestResult): Promise<TelemetryStoreResult> {
    const plotId = this.#devicePlotResolver.resolvePlotId(result.tenantId, result.deviceId);

    if (!plotId) {
      return {
        stored: false,
        reason: "unknown_device_plot",
        readings: result.readings.length
      };
    }

    const redis = await this.#getRedis();
    const idempotencyKey = telemetryIdempotencyRedisKey(result.tenantId, result.idempotencyKey);
    const alreadyStored = await redis.exists(idempotencyKey);

    if (alreadyStored > 0) {
      return {
        stored: false,
        reason: "duplicate",
        plotId,
        readings: result.readings.length
      };
    }

    const records = result.readings.map((reading) =>
      createTelemetryStorageRecord({
        tenantId: result.tenantId,
        plotId,
        reading
      })
    );
    const streamId = await appendTelemetryStream(redis, this.#ingestStreamKey, result.idempotencyKey, records);

    if (records.length > 0) {
      const latestKey = telemetryLatestRedisKey(result.tenantId, plotId);
      await redis.hSet(latestKey, Object.fromEntries(records.map((record) => [
        record.metric,
        serializeTelemetryStorageRecord(record)
      ])));
    }

    const historyBody = buildVictoriaMetricsImportBody(records);
    const historyPoints = records.filter((record) => record.value !== null).length;

    if (historyBody) {
      const response = await this.#fetch(`${this.#victoriaMetricsUrl}/api/v1/import/prometheus`, {
        method: "POST",
        headers: {
          "content-type": "text/plain; charset=utf-8"
        },
        body: historyBody
      });

      if (!response.ok) {
        throw new Error(`VictoriaMetrics import failed with HTTP ${response.status}.`);
      }
    }

    await redis.set(idempotencyKey, "1", {
      EX: this.#idempotencyTtlSeconds
    });

    return {
      stored: true,
      plotId,
      streamId,
      readings: records.length,
      historyPoints
    };
  }

  async close(): Promise<void> {
    if (this.#redisClient?.isOpen) {
      await this.#redisClient.quit();
    }
  }

  async #getRedis(): Promise<RedisClient> {
    if (!this.#redisClient) {
      this.#redisClient = createClient({
        url: this.#redisUrl
      });
    }

    if (!this.#redisClient.isOpen) {
      await this.#redisClient.connect();
    }

    return this.#redisClient;
  }
}

export function createDevicePlotResolverFromEnv(env: NodeJS.ProcessEnv = process.env): DevicePlotResolver {
  const rawMap = env.PAMILO_DEVICE_PLOT_MAP?.trim() ?? "";
  const defaultPlotId = env.PAMILO_DEFAULT_PLOT_ID?.trim() || null;
  const map = new Map<string, string>();

  if (rawMap) {
    const parsed = JSON.parse(rawMap) as unknown;

    if (!isRecord(parsed)) {
      throw new Error("PAMILO_DEVICE_PLOT_MAP must be a JSON object.");
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("PAMILO_DEVICE_PLOT_MAP values must be non-empty plot IDs.");
      }

      map.set(key, value);
    }
  }

  return new StaticDevicePlotResolver(map, defaultPlotId);
}

export function createTelemetryStorageFromEnv(env: NodeJS.ProcessEnv = process.env): TelemetryStorage {
  const redisUrl = env.REDIS_URL?.trim();
  const victoriaMetricsUrl = env.VICTORIA_METRICS_URL?.trim();

  if (!redisUrl) {
    throw new Error("REDIS_URL is required when MQTT_INGESTOR_MODE=daemon.");
  }

  if (!victoriaMetricsUrl) {
    throw new Error("VICTORIA_METRICS_URL is required when MQTT_INGESTOR_MODE=daemon.");
  }

  return new RedisVictoriaTelemetryStorage({
    redisUrl,
    victoriaMetricsUrl,
    devicePlotResolver: createDevicePlotResolverFromEnv(env),
    idempotencyTtlSeconds: parsePositiveInteger(env.PAMILO_MQTT_DEDUP_TTL_SECONDS, defaultIdempotencyTtlSeconds)
  });
}

export function buildVictoriaMetricsImportBody(records: readonly TelemetryStorageRecord[]): string {
  return records
    .filter((record) => record.value !== null)
    .flatMap((record) => {
      const labels = formatPrometheusLabels({
        tenant_id: record.tenantId,
        plot_id: record.plotId,
        device_id: record.deviceId,
        node_id: record.nodeId,
        metric: record.metric,
        sensor_key: record.sensorKey,
        unit: record.unit
      });
      const timestampMs = Date.parse(record.ts);

      return [
        `pamilo_telemetry_value{${labels}} ${record.value} ${timestampMs}`,
        `pamilo_telemetry_seq{${labels}} ${record.seq} ${timestampMs}`
      ];
    })
    .join("\n")
    .concat(records.some((record) => record.value !== null) ? "\n" : "");
}

async function appendTelemetryStream(
  redis: RedisClient,
  streamKey: string,
  idempotencyKey: string,
  records: readonly TelemetryStorageRecord[]
): Promise<string | null> {
  const result = await redis.sendCommand([
    "XADD",
    streamKey,
    "*",
    "idempotency_key",
    idempotencyKey,
    "records",
    JSON.stringify(records)
  ]);

  return typeof result === "string" ? result : null;
}

function formatPrometheusLabels(labels: Record<string, string>): string {
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${escapePrometheusLabelValue(value)}"`)
    .join(",");
}

function escapePrometheusLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("PAMILO_MQTT_DEDUP_TTL_SECONDS must be a positive integer.");
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
