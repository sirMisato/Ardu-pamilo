import { describe, expect, it } from "vitest";
import { handleIncomingMessage } from "./ingestor.js";

const validTopic = "pamilo/v1/tenants/tenant-a/devices/device-a/telemetry";
const validPayload = {
  v: 1,
  device_id: "device-a",
  node_id: "soil-01",
  ts: "2026-08-02T05:00:00Z",
  seq: 1,
  m: {
    st: 27.4
  },
  q: {
    calibration_profile: "soil-v1",
    flags: []
  }
};

describe("MQTT ingestor handler", () => {
  it("accepts valid telemetry for the matching topic", () => {
    const result = handleIncomingMessage(validTopic, JSON.stringify(validPayload));

    expect(result).toMatchObject({
      ok: true,
      tenantId: "tenant-a",
      deviceId: "device-a",
      nodeId: "soil-01",
      idempotencyKey: "device-a:soil-01:1"
    });
  });

  it("rejects device mismatch between topic and payload", () => {
    const result = handleIncomingMessage(
      validTopic,
      JSON.stringify({
        ...validPayload,
        device_id: "device-b"
      })
    );

    expect(result).toMatchObject({
      ok: false,
      reason: "topic_payload_mismatch"
    });
  });

  it("rejects non-json payloads", () => {
    const result = handleIncomingMessage(validTopic, "{");

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid_json"
    });
  });
});
