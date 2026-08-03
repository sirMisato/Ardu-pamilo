import { describe, expect, it } from "vitest";
import {
  createTelemetryStorageRecord,
  makeIdempotencyKey,
  normalizeSensorPayload,
  parseSensorPayload,
  parseTelemetryStorageRecord,
  serializeTelemetryStorageRecord,
  telemetryIdempotencyRedisKey,
  telemetryLatestRedisKey
} from "./telemetry.js";

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

  it("normalizes compact sensor metrics into canonical readings", () => {
    const parsed = parseSensorPayload({
      v: 1,
      device_id: "01JDEVICE",
      node_id: "soil-01",
      ts: "2026-08-02T05:00:00Z",
      seq: 84513,
      m: {
        st: 27.4,
        sm: null,
        ec: 1.24
      },
      q: {
        calibration_profile: "soil-v1",
        flags: ["soil_moisture_timeout"]
      }
    });

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("Expected valid payload");
    }

    expect(normalizeSensorPayload(parsed.value)).toEqual([
      {
        deviceId: "01JDEVICE",
        nodeId: "soil-01",
        metric: "soil_temperature",
        sensorKey: "st",
        ts: "2026-08-02T05:00:00Z",
        seq: 84513,
        value: 27.4,
        unit: "deg_c",
        calibrationProfile: "soil-v1",
        qualityFlags: ["soil_moisture_timeout"]
      },
      {
        deviceId: "01JDEVICE",
        nodeId: "soil-01",
        metric: "soil_moisture",
        sensorKey: "sm",
        ts: "2026-08-02T05:00:00Z",
        seq: 84513,
        value: null,
        unit: "percent_relative",
        calibrationProfile: "soil-v1",
        qualityFlags: ["soil_moisture_timeout"]
      },
      {
        deviceId: "01JDEVICE",
        nodeId: "soil-01",
        metric: "electrical_conductivity",
        sensorKey: "ec",
        ts: "2026-08-02T05:00:00Z",
        seq: 84513,
        value: 1.24,
        unit: "ms_cm",
        calibrationProfile: "soil-v1",
        qualityFlags: ["soil_moisture_timeout"]
      }
    ]);
  });

  it("round-trips storage records for Redis latest and durable history writers", () => {
    const parsed = parseSensorPayload({
      v: 1,
      device_id: "device-a",
      node_id: "soil-01",
      ts: "2026-08-02T05:00:00Z",
      seq: 42,
      m: {
        st: 27.4
      },
      q: {
        calibration_profile: "soil-v1",
        flags: []
      }
    });

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("Expected valid payload");
    }

    const [reading] = normalizeSensorPayload(parsed.value);

    if (!reading) {
      throw new Error("Expected normalized reading");
    }

    const record = createTelemetryStorageRecord({
      tenantId: "tenant-a",
      plotId: "plot-a",
      reading
    });
    const roundTrip = parseTelemetryStorageRecord(serializeTelemetryStorageRecord(record));

    expect(roundTrip).toEqual({
      ok: true,
      value: record
    });
  });

  it("namespaces telemetry Redis keys by tenant and plot", () => {
    expect(telemetryLatestRedisKey("tenant-a", "plot-a")).toBe("pamilo:telemetry:latest:tenant-a:plot-a");
    expect(telemetryIdempotencyRedisKey("tenant-a", "device-a:soil-01:42")).toBe(
      "pamilo:telemetry:idempotency:tenant-a:device-a%3Asoil-01%3A42"
    );
  });
});
