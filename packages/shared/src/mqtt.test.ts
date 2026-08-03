import { describe, expect, it } from "vitest";
import { buildDeviceTopic, parseDeviceTopic } from "./mqtt.js";

describe("MQTT topic helpers", () => {
  it("builds and parses device topics", () => {
    const topic = buildDeviceTopic({
      tenantId: "tenant-a",
      deviceId: "device-a",
      kind: "telemetry"
    });

    expect(topic).toBe("pamilo/v1/tenants/tenant-a/devices/device-a/telemetry");
    expect(parseDeviceTopic(topic)).toEqual({
      tenantId: "tenant-a",
      deviceId: "device-a",
      kind: "telemetry"
    });
  });

  it("rejects unsupported topic versions", () => {
    expect(parseDeviceTopic("pamilo/v2/tenants/tenant-a/devices/device-a/telemetry")).toBeNull();
  });
});
