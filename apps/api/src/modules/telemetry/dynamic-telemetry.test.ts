import { describe, expect, it } from "vitest";
import { parseDynamicTelemetryMessage } from "./dynamic-telemetry.js";

const topic = "pamilo/v1/tenants/tenant-a/devices/device-a/telemetry";
const receivedAt = new Date("2026-08-05T04:00:00Z");

describe("dynamic MQTT telemetry parser", () => {
  it("normalizes rich dynamic metric objects", () => {
    const result = parseDynamicTelemetryMessage(
      topic,
      JSON.stringify({
        v: 1,
        device_id: "device-a",
        node_id: "soil-01",
        ts: "2026-08-05T03:55:00Z",
        seq: 17,
        metrics: {
          soil_ph: {
            value: 6.42,
            unit: "ph",
            label: "Soil pH",
            type: "number"
          },
          pump_on: {
            value: true,
            unit: "bool",
            type: "boolean"
          }
        },
        q: {
          calibration_profile: "esp32-field-v1",
          flags: ["ok"]
        }
      }),
      receivedAt
    );

    expect(result).toMatchObject({
      ok: true,
      tenantId: "tenant-a",
      deviceId: "device-a",
      nodeId: "soil-01",
      readings: [
        {
          metric: "soil_ph",
          value: 6.42,
          valueType: "number",
          unit: "ph",
          label: "Soil pH"
        },
        {
          metric: "pump_on",
          value: true,
          valueType: "boolean"
        }
      ]
    });
  });

  it("maps compact canonical m values while allowing dynamic metric keys", () => {
    const result = parseDynamicTelemetryMessage(
      topic,
      JSON.stringify({
        node_id: "soil-01",
        m: {
          st: 27.4,
          soil_ph: 6.5
        }
      }),
      receivedAt
    );

    expect(result).toMatchObject({
      ok: true,
      ts: "2026-08-05T04:00:00.000Z",
      seq: 0,
      readings: [
        {
          metric: "soil_temperature",
          sensorKey: "st",
          value: 27.4,
          unit: "deg_c"
        },
        {
          metric: "soil_ph",
          sensorKey: "soil_ph",
          value: 6.5,
          unit: ""
        }
      ]
    });
  });

  it("rejects mismatched payload device IDs and unsafe metric keys", () => {
    const mismatch = parseDynamicTelemetryMessage(
      topic,
      JSON.stringify({
        device_id: "device-b",
        metrics: {
          soil_ph: 6.5
        }
      }),
      receivedAt
    );

    expect(mismatch).toMatchObject({
      ok: false,
      reason: "topic_payload_mismatch"
    });

    const unsafeMetric = parseDynamicTelemetryMessage(
      topic,
      JSON.stringify({
        metrics: {
          "soil ph": 6.5
        }
      }),
      receivedAt
    );

    expect(unsafeMetric).toMatchObject({
      ok: false,
      reason: "invalid_payload",
      errors: expect.arrayContaining([
        expect.stringContaining("Metric key soil ph")
      ])
    });
  });
});
