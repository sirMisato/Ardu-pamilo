import {
  makeIdempotencyKey,
  parseDeviceTopic,
  parseSensorPayload,
  type SensorPayload
} from "@pamilo/shared";

export type IngestResult =
  | {
      ok: true;
      tenantId: string;
      deviceId: string;
      nodeId: string;
      idempotencyKey: string;
      payload: SensorPayload;
    }
  | {
      ok: false;
      reason: "invalid_topic" | "unsupported_topic_kind" | "invalid_json" | "invalid_payload" | "topic_payload_mismatch";
      errors: string[];
    };

export function handleIncomingMessage(topic: string, rawPayload: Buffer | string): IngestResult {
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
      errors: [`Topic kind ${topicParts.kind} is not handled by telemetry ingestor.`]
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

  const validation = parseSensorPayload(parsed);

  if (!validation.ok) {
    return {
      ok: false,
      reason: "invalid_payload",
      errors: validation.errors
    };
  }

  if (validation.value.device_id !== topicParts.deviceId) {
    return {
      ok: false,
      reason: "topic_payload_mismatch",
      errors: ["Payload device_id does not match MQTT topic device_id."]
    };
  }

  return {
    ok: true,
    tenantId: topicParts.tenantId,
    deviceId: topicParts.deviceId,
    nodeId: validation.value.node_id,
    idempotencyKey: makeIdempotencyKey(validation.value),
    payload: validation.value
  };
}
