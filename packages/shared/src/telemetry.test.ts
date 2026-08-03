import { describe, expect, it } from "vitest";
import { makeIdempotencyKey, parseSensorPayload } from "./telemetry.js";

describe("sensor payload schema", () => {
  it("accepts a valid payload with null channel values", () => {
    const result = parseSensorPayload({
      v: 1,
      device_id: "01JDEVICE",
      node_id: "soil-01",
      ts: "2026-08-02T05:00:00Z",
      seq: 84513,
      rssi: -67,
      battery_v: 12.4,
      m: {
        st: 27.4,
        sm: null,
        n: 36
      },
      q: {
        calibration_profile: "soil-v1",
        flags: ["soil_moisture_timeout"]
      }
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown metric fields", () => {
    const result = parseSensorPayload({
      v: 1,
      device_id: "01JDEVICE",
      node_id: "soil-01",
      ts: "2026-08-02T05:00:00Z",
      seq: 84513,
      m: {
        ph: 6.8
      },
      q: {
        calibration_profile: "soil-v1",
        flags: []
      }
    });

    expect(result.ok).toBe(false);
  });

  it("builds stable idempotency keys", () => {
    expect(makeIdempotencyKey({ device_id: "d1", node_id: "n1", seq: 7 })).toBe("d1:n1:7");
  });
});
