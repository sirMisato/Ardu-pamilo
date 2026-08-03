import { describe, expect, it } from "vitest";
import { buildDeviceMqttAccess, buildDeviceTopic, parseDeviceTopic } from "./mqtt.js";

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

  it("builds least-privilege mosquitto ACL entries for one device", () => {
    const access = buildDeviceMqttAccess({
      tenantId: "tenant-a",
      deviceId: "device-a"
    });

    expect(access.clientId).toBe("pamilo-tenant-a-device-a");
    expect(access.username).toBe("pamilo.tenant-a.device-a");
    expect(access.publishTopics).toEqual([
      "pamilo/v1/tenants/tenant-a/devices/device-a/telemetry",
      "pamilo/v1/tenants/tenant-a/devices/device-a/status",
      "pamilo/v1/tenants/tenant-a/devices/device-a/events",
      "pamilo/v1/tenants/tenant-a/devices/device-a/acks"
    ]);
    expect(access.subscribeTopics).toEqual([
      "pamilo/v1/tenants/tenant-a/devices/device-a/commands"
    ]);
    expect(access.mosquittoAcl).toEqual([
      "user pamilo.tenant-a.device-a",
      "topic write pamilo/v1/tenants/tenant-a/devices/device-a/telemetry",
      "topic write pamilo/v1/tenants/tenant-a/devices/device-a/status",
      "topic write pamilo/v1/tenants/tenant-a/devices/device-a/events",
      "topic write pamilo/v1/tenants/tenant-a/devices/device-a/acks",
      "topic read pamilo/v1/tenants/tenant-a/devices/device-a/commands"
    ]);
  });

  it("rejects unsafe identifiers before generating topics or ACLs", () => {
    expect(() =>
      buildDeviceMqttAccess({
        tenantId: "tenant/a",
        deviceId: "device-a"
      })
    ).toThrow("tenantId contains characters");
  });
});
