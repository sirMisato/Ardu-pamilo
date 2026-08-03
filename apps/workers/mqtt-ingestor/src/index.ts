import { handleIncomingMessage } from "./ingestor.js";

const sampleTopic = "pamilo/v1/tenants/local-tenant/devices/local-device/telemetry";
const samplePayload = JSON.stringify({
  v: 1,
  device_id: "local-device",
  node_id: "soil-01",
  ts: new Date().toISOString(),
  seq: 1,
  m: {
    st: 27.4
  },
  q: {
    calibration_profile: "local-dev",
    flags: []
  }
});

const result = handleIncomingMessage(sampleTopic, samplePayload);

if (!result.ok) {
  console.error("MQTT ingestor self-check failed", result);
  process.exitCode = 1;
} else {
  console.info("MQTT ingestor foundation self-check passed", {
    tenantId: result.tenantId,
    deviceId: result.deviceId,
    nodeId: result.nodeId,
    idempotencyKey: result.idempotencyKey
  });
}
