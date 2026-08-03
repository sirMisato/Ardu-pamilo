import { createClient } from "redis";
import {
  createTelemetryStorageRecord,
  parseTelemetryStorageRecord,
  serializeTelemetryStorageRecord,
  telemetryLatestRedisKey,
  type MetricCode,
  type NormalizedSensorReading,
  type TelemetryStorageRecord,
  type TenantContext
} from "@pamilo/shared";
import type { TelemetryHistoryQuery, TelemetryReadingRecord, TelemetryRepository } from "./telemetry-repository.js";

type RedisClient = ReturnType<typeof createClient>;

export interface RedisVictoriaTelemetryRepositoryOptions {
  redisUrl: string;
  victoriaMetricsUrl: string;
  fallback?: TelemetryRepository | null;
  fetchImpl?: typeof fetch;
}

export class RedisVictoriaTelemetryRepository implements TelemetryRepository {
  readonly #redisUrl: string;
  readonly #victoriaMetricsUrl: string;
  readonly #fallback: TelemetryRepository | null;
  readonly #fetch: typeof fetch;
  #redisClient: RedisClient | null = null;

  constructor(options: RedisVictoriaTelemetryRepositoryOptions) {
    this.#redisUrl = options.redisUrl;
    this.#victoriaMetricsUrl = options.victoriaMetricsUrl.replace(/\/+$/, "");
    this.#fallback = options.fallback ?? null;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async listLatestForPlot(context: TenantContext, plotId: string): Promise<TelemetryReadingRecord[]> {
    try {
      const redis = await this.#getRedis();
      const values = await redis.hVals(telemetryLatestRedisKey(context.tenantId, plotId));
      const records = values
        .map(parseTelemetryStorageRecord)
        .flatMap((result) => result.ok ? [toReadingRecord(result.value)] : [])
        .filter((record) => record.tenantId === context.tenantId && record.plotId === plotId)
        .sort((left, right) => left.metric.localeCompare(right.metric));

      if (records.length > 0 || !this.#fallback) {
        return records;
      }
    } catch (error) {
      if (!this.#fallback) {
        throw error;
      }
    }

    return this.#fallback.listLatestForPlot(context, plotId);
  }

  async queryHistoryForPlot(context: TenantContext, query: TelemetryHistoryQuery): Promise<TelemetryReadingRecord[]> {
    try {
      const records = await this.#queryVictoriaMetrics(context, query);

      if (records.length > 0 || !this.#fallback) {
        return records;
      }
    } catch (error) {
      if (!this.#fallback) {
        throw error;
      }
    }

    return this.#fallback.queryHistoryForPlot(context, query);
  }

  async recordForPlot(
    context: TenantContext,
    plotId: string,
    readings: NormalizedSensorReading[]
  ): Promise<TelemetryReadingRecord[]> {
    const records = readings.map((reading) =>
      createTelemetryStorageRecord({
        tenantId: context.tenantId,
        plotId,
        reading
      })
    );

    if (records.length === 0) {
      return [];
    }

    const redis = await this.#getRedis();
    await redis.hSet(telemetryLatestRedisKey(context.tenantId, plotId), Object.fromEntries(records.map((record) => [
      record.metric,
      serializeTelemetryStorageRecord(record)
    ])));

    await this.#writeVictoriaMetrics(records);

    return records.map(toReadingRecord);
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

  async #queryVictoriaMetrics(context: TenantContext, query: TelemetryHistoryQuery): Promise<TelemetryReadingRecord[]> {
    const url = new URL(`${this.#victoriaMetricsUrl}/api/v1/query_range`);
    url.searchParams.set("query", formatVictoriaQuery(context.tenantId, query.plotId, query.metric));
    url.searchParams.set("start", query.from);
    url.searchParams.set("end", query.to);
    url.searchParams.set("step", resolutionToStep(query.resolution));

    const response = await this.#fetch(url);
    if (!response.ok) {
      throw new Error(`VictoriaMetrics query failed with HTTP ${response.status}.`);
    }

    const body = await response.json() as unknown;
    return parseVictoriaMatrix(body, context, query);
  }

  async #writeVictoriaMetrics(records: readonly TelemetryStorageRecord[]): Promise<void> {
    const body = buildVictoriaMetricsImportBody(records);

    if (!body) {
      return;
    }

    const response = await this.#fetch(`${this.#victoriaMetricsUrl}/api/v1/import/prometheus`, {
      method: "POST",
      headers: {
        "content-type": "text/plain; charset=utf-8"
      },
      body
    });

    if (!response.ok) {
      throw new Error(`VictoriaMetrics import failed with HTTP ${response.status}.`);
    }
  }
}

export function buildVictoriaMetricsImportBody(records: readonly TelemetryStorageRecord[]): string {
  return records
    .filter((record) => record.value !== null)
    .map((record) => {
      const labels = formatPrometheusLabels({
        tenant_id: record.tenantId,
        plot_id: record.plotId,
        device_id: record.deviceId,
        node_id: record.nodeId,
        metric: record.metric,
        sensor_key: record.sensorKey,
        unit: record.unit
      });

      return `pamilo_telemetry_value{${labels}} ${record.value} ${Date.parse(record.ts)}`;
    })
    .join("\n")
    .concat(records.some((record) => record.value !== null) ? "\n" : "");
}

function parseVictoriaMatrix(
  body: unknown,
  context: TenantContext,
  query: TelemetryHistoryQuery
): TelemetryReadingRecord[] {
  if (!isRecord(body) || body.status !== "success" || !isRecord(body.data) || !Array.isArray(body.data.result)) {
    return [];
  }

  return body.data.result.flatMap((series) => parseVictoriaSeries(series, context, query)).sort(compareReadingTime);
}

function parseVictoriaSeries(
  series: unknown,
  context: TenantContext,
  query: TelemetryHistoryQuery
): TelemetryReadingRecord[] {
  if (!isRecord(series) || !isRecord(series.metric) || !Array.isArray(series.values)) {
    return [];
  }

  const metric = series.metric;
  const deviceId = typeof metric.device_id === "string" ? metric.device_id : "unknown-device";
  const nodeId = typeof metric.node_id === "string" ? metric.node_id : "unknown-node";
  const unit = typeof metric.unit === "string" ? metric.unit : "";

  return series.values.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      return [];
    }

    const timestamp = Number(point[0]);
    const value = Number(point[1]);

    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
      return [];
    }

    return [
      {
        id: `vm:${context.tenantId}:${query.plotId}:${query.metric}:${timestamp}`,
        tenantId: context.tenantId,
        plotId: query.plotId,
        deviceId,
        nodeId,
        metric: query.metric,
        ts: new Date(timestamp * 1000).toISOString(),
        seq: 0,
        value,
        unit,
        calibrationProfile: "victoriametrics",
        qualityFlags: []
      }
    ];
  });
}

function toReadingRecord(record: TelemetryStorageRecord): TelemetryReadingRecord {
  return {
    id: `telemetry:${record.tenantId}:${record.plotId}:${record.deviceId}:${record.nodeId}:${record.metric}:${record.ts}`,
    tenantId: record.tenantId,
    plotId: record.plotId,
    deviceId: record.deviceId,
    nodeId: record.nodeId,
    metric: record.metric,
    ts: record.ts,
    seq: record.seq,
    value: record.value,
    unit: record.unit,
    calibrationProfile: record.calibrationProfile,
    qualityFlags: [...record.qualityFlags]
  };
}

function formatVictoriaQuery(tenantId: string, plotId: string, metric: MetricCode): string {
  return `pamilo_telemetry_value{tenant_id="${escapePrometheusLabelValue(tenantId)}",plot_id="${escapePrometheusLabelValue(
    plotId
  )}",metric="${escapePrometheusLabelValue(metric)}"}`;
}

function formatPrometheusLabels(labels: Record<string, string>): string {
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${escapePrometheusLabelValue(value)}"`)
    .join(",");
}

function escapePrometheusLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
}

function resolutionToStep(resolution: string): string {
  switch (resolution) {
    case "5m":
      return "5m";
    case "15m":
      return "15m";
    case "1h":
      return "1h";
    default:
      return "1s";
  }
}

function compareReadingTime(left: TelemetryReadingRecord, right: TelemetryReadingRecord): number {
  const timeDifference = Date.parse(left.ts) - Date.parse(right.ts);
  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.seq - right.seq;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
