import {
  inferTelemetryValueType,
  isTelemetryMetricKey,
  metricDefinitions,
  parseDeviceTopic,
  type TelemetryValueType
} from "@pamilo/shared";
import type { TelemetryInputReading, TelemetryValue } from "./telemetry-repository.js";

export type DynamicTelemetryParseResult =
  | {
      ok: true;
      tenantId: string;
      deviceId: string;
      nodeId: string;
      ts: string;
      seq: number;
      idempotencyKey: string;
      readings: TelemetryInputReading[];
    }
  | {
      ok: false;
      reason: "invalid_topic" | "unsupported_topic_kind" | "invalid_json" | "invalid_payload" | "topic_payload_mismatch";
      errors: string[];
    };

const maximumMetricsPerPayload = 64;
const maximumLabelLength = 80;
const maximumUnitLength = 32;
const maximumStringValueLength = 256;

export function parseDynamicTelemetryMessage(
  topic: string,
  rawPayload: Buffer | string,
  receivedAt: Date = new Date()
): DynamicTelemetryParseResult {
  const topicParts = parseDeviceTopic(topic);

  if (!topicParts) {
    return {
      ok: false,
      reason: "invalid_topic",
      errors: ["MQTT topic does not match pamilo v1 device topic contract."]
    };
  }

  if (topicParts.kind !== "telemetry") {
    return {
      ok: false,
      reason: "unsupported_topic_kind",
      errors: [`Topic kind ${topicParts.kind} is not handled by telemetry listener.`]
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawPayload.toString());
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      errors: ["Payload is not valid JSON."]
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: "invalid_payload",
      errors: ["Payload must be a JSON object."]
    };
  }

  const errors: string[] = [];
  const payloadDeviceId = typeof parsed.device_id === "string" && parsed.device_id.trim()
    ? parsed.device_id.trim()
    : topicParts.deviceId;

  if (payloadDeviceId !== topicParts.deviceId) {
    return {
      ok: false,
      reason: "topic_payload_mismatch",
      errors: ["Payload device_id does not match MQTT topic device_id."]
    };
  }

  const nodeId = typeof parsed.node_id === "string" && parsed.node_id.trim()
    ? parsed.node_id.trim()
    : "default";
  const ts = parseTimestamp(parsed.ts, receivedAt, errors);
  const seq = parseSequence(parsed.seq, errors);
  const quality = parseQuality(parsed.q);
  const metricItems = collectMetricItems(parsed, errors);

  if (metricItems.length === 0) {
    errors.push("At least one metric is required in /metrics or /m.");
  }

  if (metricItems.length > maximumMetricsPerPayload) {
    errors.push(`Payload can include at most ${maximumMetricsPerPayload} metrics.`);
  }

  const readings = metricItems.flatMap((item) => {
    const reading = parseMetricItem({
      item,
      deviceId: topicParts.deviceId,
      nodeId,
      ts,
      seq,
      calibrationProfile: quality.calibrationProfile,
      qualityFlags: quality.flags,
      errors
    });

    return reading ? [reading] : [];
  });

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_payload",
      errors
    };
  }

  return {
    ok: true,
    tenantId: topicParts.tenantId,
    deviceId: topicParts.deviceId,
    nodeId,
    ts,
    seq,
    idempotencyKey: `${topicParts.deviceId}:${nodeId}:${seq}:${ts}`,
    readings
  };
}

interface RawMetricItem {
  key: string;
  sensorKey: string;
  rawValue: unknown;
  defaultMetric: string;
  defaultUnit: string;
}

function collectMetricItems(payload: Record<string, unknown>, errors: string[]): RawMetricItem[] {
  const items: RawMetricItem[] = [];

  if ("m" in payload) {
    if (!isRecord(payload.m)) {
      errors.push("/m must be an object when present.");
    } else {
      for (const [key, rawValue] of Object.entries(payload.m)) {
        const definition = metricDefinitions.find((candidate) => candidate.sensorKey === key);
        items.push({
          key,
          sensorKey: key,
          rawValue,
          defaultMetric: definition?.code ?? key,
          defaultUnit: definition?.unit ?? ""
        });
      }
    }
  }

  if ("metrics" in payload) {
    if (!isRecord(payload.metrics)) {
      errors.push("/metrics must be an object when present.");
    } else {
      for (const [key, rawValue] of Object.entries(payload.metrics)) {
        items.push({
          key,
          sensorKey: key,
          rawValue,
          defaultMetric: key,
          defaultUnit: ""
        });
      }
    }
  }

  return items;
}

function parseMetricItem(input: {
  item: RawMetricItem;
  deviceId: string;
  nodeId: string;
  ts: string;
  seq: number;
  calibrationProfile: string;
  qualityFlags: string[];
  errors: string[];
}): TelemetryInputReading | null {
  const metric = input.item.defaultMetric;

  if (!isTelemetryMetricKey(metric)) {
    input.errors.push(`Metric key ${input.item.key} must use lowercase letters, numbers, or underscores.`);
    return null;
  }

  const parsed = parseMetricValue(input.item.rawValue, input.errors, input.item.key);
  if (!parsed.ok) {
    return null;
  }

  return {
    deviceId: input.deviceId,
    nodeId: input.nodeId,
    metric,
    sensorKey: input.item.sensorKey,
    label: parsed.label,
    ts: input.ts,
    seq: input.seq,
    value: parsed.value,
    valueType: parsed.valueType,
    unit: parsed.unit ?? input.item.defaultUnit,
    calibrationProfile: input.calibrationProfile,
    qualityFlags: [...input.qualityFlags]
  };
}

function parseMetricValue(rawValue: unknown, errors: string[], key: string): {
  ok: true;
  value: TelemetryValue;
  valueType: TelemetryValueType;
  unit: string | null;
  label: string | null;
} | { ok: false } {
  if (isRecord(rawValue) && "value" in rawValue) {
    const unit = parseOptionalString(rawValue.unit, maximumUnitLength);
    const label = parseOptionalString(rawValue.label, maximumLabelLength);
    const value = parseTelemetryValue(rawValue.value, errors, key);

    if (!value.ok) {
      return {
        ok: false
      };
    }

    const declaredType = parseDeclaredValueType(rawValue.type);

    if (declaredType && declaredType !== value.valueType) {
      errors.push(`Metric ${key} declares type ${declaredType} but carries ${value.valueType}.`);
      return {
        ok: false
      };
    }

    return {
      ok: true,
      value: value.value,
      valueType: value.valueType,
      unit,
      label
    };
  }

  const value = parseTelemetryValue(rawValue, errors, key);
  if (!value.ok) {
    return {
      ok: false
    };
  }

  return {
    ok: true,
    value: value.value,
    valueType: value.valueType,
    unit: null,
    label: null
  };
}

function parseTelemetryValue(rawValue: unknown, errors: string[], key: string): {
  ok: true;
  value: TelemetryValue;
  valueType: TelemetryValueType;
} | { ok: false } {
  if (rawValue === null || typeof rawValue === "boolean") {
    return {
      ok: true,
      value: rawValue,
      valueType: inferTelemetryValueType(rawValue)
    };
  }

  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue)) {
      errors.push(`Metric ${key} must be a finite number.`);
      return {
        ok: false
      };
    }

    return {
      ok: true,
      value: rawValue,
      valueType: "number"
    };
  }

  if (typeof rawValue === "string") {
    const value = rawValue.trim();
    if (value.length === 0 || value.length > maximumStringValueLength) {
      errors.push(`Metric ${key} string values must be 1-${maximumStringValueLength} characters.`);
      return {
        ok: false
      };
    }

    return {
      ok: true,
      value,
      valueType: "string"
    };
  }

  errors.push(`Metric ${key} must be a number, string, boolean, null, or object with value.`);
  return {
    ok: false
  };
}

function parseTimestamp(value: unknown, receivedAt: Date, errors: string[]): string {
  if (value === undefined || value === null || value === "") {
    return receivedAt.toISOString();
  }

  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push("/ts must be a valid date-time string when present.");
    return receivedAt.toISOString();
  }

  return new Date(value).toISOString();
}

function parseSequence(value: unknown, errors: string[]): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    errors.push("/seq must be a non-negative integer when present.");
    return 0;
  }

  return value;
}

function parseQuality(value: unknown): {
  calibrationProfile: string;
  flags: string[];
} {
  if (!isRecord(value)) {
    return {
      calibrationProfile: "dynamic-v1",
      flags: []
    };
  }

  const calibrationProfile = parseOptionalString(value.calibration_profile, 80) ?? "dynamic-v1";
  const flags = Array.isArray(value.flags)
    ? value.flags
      .filter((flag): flag is string => typeof flag === "string" && flag.trim().length > 0)
      .map((flag) => flag.trim().slice(0, 64))
      .slice(0, 32)
    : [];

  return {
    calibrationProfile,
    flags
  };
}

function parseOptionalString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function parseDeclaredValueType(value: unknown): TelemetryValueType | null {
  return value === "number" || value === "string" || value === "boolean" || value === "null" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
