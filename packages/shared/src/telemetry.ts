import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const metricCodes = [
  "soil_temperature",
  "soil_moisture",
  "nitrogen",
  "phosphorus",
  "potassium",
  "electrical_conductivity",
  "volumetric_water_content"
] as const;

export type MetricCode = (typeof metricCodes)[number];

export type SensorMetricKey = "st" | "sm" | "n" | "p" | "k" | "ec" | "vwc";
export type TelemetryValueType = "number" | "string" | "boolean" | "null";

export interface MetricDefinition {
  code: MetricCode;
  sensorKey: SensorMetricKey;
  unit: string;
}

export const metricDefinitions: readonly MetricDefinition[] = [
  {
    code: "soil_temperature",
    sensorKey: "st",
    unit: "deg_c"
  },
  {
    code: "soil_moisture",
    sensorKey: "sm",
    unit: "percent_relative"
  },
  {
    code: "nitrogen",
    sensorKey: "n",
    unit: "mg_kg"
  },
  {
    code: "phosphorus",
    sensorKey: "p",
    unit: "mg_kg"
  },
  {
    code: "potassium",
    sensorKey: "k",
    unit: "mg_kg"
  },
  {
    code: "electrical_conductivity",
    sensorKey: "ec",
    unit: "ms_cm"
  },
  {
    code: "volumetric_water_content",
    sensorKey: "vwc",
    unit: "percent_v_v"
  }
];

export interface NormalizedSensorReading {
  deviceId: string;
  nodeId: string;
  metric: MetricCode;
  sensorKey: SensorMetricKey;
  ts: string;
  seq: number;
  value: number | null;
  unit: string;
  calibrationProfile: string;
  qualityFlags: string[];
}

export interface TelemetryStorageRecord {
  tenantId: string;
  plotId: string;
  deviceId: string;
  nodeId: string;
  metric: string;
  sensorKey: string;
  ts: string;
  seq: number;
  value: number | null;
  unit: string;
  calibrationProfile: string;
  qualityFlags: string[];
}

export const telemetryMetricKeyPattern = /^[a-z][a-z0-9_]{0,63}$/;

export const sensorPayloadSchema = Type.Object(
  {
    v: Type.Literal(1),
    device_id: Type.String({ minLength: 1 }),
    node_id: Type.String({ minLength: 1 }),
    ts: Type.String({ minLength: 1 }),
    seq: Type.Integer({ minimum: 0 }),
    rssi: Type.Optional(Type.Number()),
    battery_v: Type.Optional(Type.Number({ minimum: 0 })),
    m: Type.Object(
      {
        st: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        sm: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        n: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        p: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        k: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        ec: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        vwc: Type.Optional(Type.Union([Type.Number(), Type.Null()]))
      },
      { additionalProperties: false }
    ),
    q: Type.Object(
      {
        calibration_profile: Type.String({ minLength: 1 }),
        flags: Type.Array(Type.String())
      },
      { additionalProperties: false }
    )
  },
  { additionalProperties: false }
);

export type SensorPayload = Static<typeof sensorPayloadSchema>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export function parseSensorPayload(input: unknown): ValidationResult<SensorPayload> {
  if (!Value.Check(sensorPayloadSchema, input)) {
    return {
      ok: false,
      errors: [...Value.Errors(sensorPayloadSchema, input)].map((error) => {
        const path = error.path || "/";
        return `${path} ${error.message}`;
      })
    };
  }

  const value = input as SensorPayload;

  if (Number.isNaN(Date.parse(value.ts))) {
    return {
      ok: false,
      errors: ["/ts must be a valid UTC date-time string"]
    };
  }

  return {
    ok: true,
    value
  };
}

export function isTelemetryMetricKey(value: string): boolean {
  return telemetryMetricKeyPattern.test(value);
}

export function inferTelemetryValueType(value: number | string | boolean | null): TelemetryValueType {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  return "string";
}

export function makeIdempotencyKey(payload: Pick<SensorPayload, "device_id" | "node_id" | "seq">): string {
  return `${payload.device_id}:${payload.node_id}:${payload.seq}`;
}

export function normalizeSensorPayload(payload: SensorPayload): NormalizedSensorReading[] {
  return metricDefinitions.flatMap((definition) => {
    const value = payload.m[definition.sensorKey];

    if (value === undefined) {
      return [];
    }

    return [
      {
        deviceId: payload.device_id,
        nodeId: payload.node_id,
        metric: definition.code,
        sensorKey: definition.sensorKey,
        ts: payload.ts,
        seq: payload.seq,
        value,
        unit: definition.unit,
        calibrationProfile: payload.q.calibration_profile,
        qualityFlags: [...payload.q.flags]
      }
    ];
  });
}

export function createTelemetryStorageRecord(input: {
  tenantId: string;
  plotId: string;
  reading: NormalizedSensorReading;
}): TelemetryStorageRecord {
  return {
    tenantId: input.tenantId,
    plotId: input.plotId,
    ...input.reading,
    qualityFlags: [...input.reading.qualityFlags]
  };
}

export function serializeTelemetryStorageRecord(record: TelemetryStorageRecord): string {
  return JSON.stringify(record);
}

export function parseTelemetryStorageRecord(input: string): ValidationResult<TelemetryStorageRecord> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      ok: false,
      errors: ["Telemetry storage record is not valid JSON."]
    };
  }

  if (!isTelemetryStorageRecord(parsed)) {
    return {
      ok: false,
      errors: ["Telemetry storage record does not match the expected shape."]
    };
  }

  return {
    ok: true,
    value: {
      ...parsed,
      qualityFlags: [...parsed.qualityFlags]
    }
  };
}

export function telemetryLatestRedisKey(tenantId: string, plotId: string): string {
  return `pamilo:telemetry:latest:${encodeRedisKeyPart(tenantId)}:${encodeRedisKeyPart(plotId)}`;
}

export function telemetryIdempotencyRedisKey(tenantId: string, idempotencyKey: string): string {
  return `pamilo:telemetry:idempotency:${encodeRedisKeyPart(tenantId)}:${encodeRedisKeyPart(idempotencyKey)}`;
}

function isTelemetryStorageRecord(value: unknown): value is TelemetryStorageRecord {
  if (!isRecord(value)) {
    return false;
  }

  const seq = value.seq;
  const readingValue = value.value;

  return typeof value.tenantId === "string"
    && value.tenantId.length > 0
    && typeof value.plotId === "string"
    && value.plotId.length > 0
    && typeof value.deviceId === "string"
    && value.deviceId.length > 0
    && typeof value.nodeId === "string"
    && value.nodeId.length > 0
    && typeof value.metric === "string"
    && isTelemetryMetricKey(value.metric)
    && typeof value.sensorKey === "string"
    && value.sensorKey.length > 0
    && typeof value.ts === "string"
    && !Number.isNaN(Date.parse(value.ts))
    && typeof seq === "number"
    && Number.isInteger(seq)
    && seq >= 0
    && (typeof readingValue === "number" || readingValue === null)
    && typeof value.unit === "string"
    && value.unit.length > 0
    && typeof value.calibrationProfile === "string"
    && value.calibrationProfile.length > 0
    && Array.isArray(value.qualityFlags)
    && value.qualityFlags.every((flag) => typeof flag === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeRedisKeyPart(value: string): string {
  return encodeURIComponent(value);
}
