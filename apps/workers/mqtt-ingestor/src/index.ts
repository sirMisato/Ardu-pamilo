import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import { handleIncomingMessage } from "./ingestor.js";
import { createTelemetryStorageFromEnv, type TelemetryStorage } from "./storage.js";

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

if (process.env.MQTT_INGESTOR_MODE === "daemon") {
  await runDaemon();
} else {
  runSelfCheck();
}

function runSelfCheck(): void {
  const result = handleIncomingMessage(sampleTopic, samplePayload);

  if (!result.ok) {
    console.error("MQTT ingestor self-check failed", result);
    process.exitCode = 1;
    return;
  }

  console.info("MQTT ingestor foundation self-check passed", {
    tenantId: result.tenantId,
    deviceId: result.deviceId,
    nodeId: result.nodeId,
    idempotencyKey: result.idempotencyKey
  });
}

async function runDaemon(): Promise<void> {
  const mqttUrl = process.env.MQTT_URL?.trim();

  if (!mqttUrl) {
    throw new Error("MQTT_URL is required when MQTT_INGESTOR_MODE=daemon.");
  }

  const storage = createTelemetryStorageFromEnv();
  const client = mqtt.connect(mqttUrl, createMqttOptions());
  const subscriptionTopic = "pamilo/v1/tenants/+/devices/+/telemetry";

  client.on("connect", () => {
    client.subscribe(subscriptionTopic, {
      qos: 1
    }, (error) => {
      if (error) {
        console.error("MQTT ingestor subscription failed", {
          error: error.message
        });
        process.exitCode = 1;
        void shutdown(client, storage);
        return;
      }

      console.info("MQTT ingestor subscribed", {
        topic: subscriptionTopic
      });
    });
  });

  client.on("message", (topic, payload) => {
    void ingestMessage(topic, payload, storage);
  });

  client.on("error", (error) => {
    console.error("MQTT ingestor client error", {
      error: error.message
    });
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      console.info("MQTT ingestor shutdown requested", {
        signal
      });
      void shutdown(client, storage);
    });
  }
}

async function ingestMessage(topic: string, payload: Buffer, storage: TelemetryStorage): Promise<void> {
  const result = handleIncomingMessage(topic, payload);

  if (!result.ok) {
    console.warn("MQTT ingestor rejected message", {
      topic,
      reason: result.reason,
      errors: result.errors
    });
    return;
  }

  try {
    const stored = await storage.store(result);

    if (!stored.stored) {
      console.warn("MQTT ingestor skipped message", {
        tenantId: result.tenantId,
        deviceId: result.deviceId,
        nodeId: result.nodeId,
        idempotencyKey: result.idempotencyKey,
        reason: stored.reason
      });
      return;
    }

    console.info("MQTT ingestor stored telemetry", {
      tenantId: result.tenantId,
      deviceId: result.deviceId,
      nodeId: result.nodeId,
      plotId: stored.plotId,
      idempotencyKey: result.idempotencyKey,
      readings: stored.readings,
      historyPoints: stored.historyPoints,
      streamId: stored.streamId
    });
  } catch (error) {
    console.error("MQTT ingestor storage failed", {
      tenantId: result.tenantId,
      deviceId: result.deviceId,
      nodeId: result.nodeId,
      idempotencyKey: result.idempotencyKey,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function createMqttOptions(): IClientOptions {
  const options: IClientOptions = {
    clean: false,
    clientId: process.env.MQTT_CLIENT_ID?.trim() || "pamilo-mqtt-ingestor",
    reconnectPeriod: 5_000
  };

  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
  }

  if (process.env.MQTT_PASSWORD) {
    options.password = process.env.MQTT_PASSWORD;
  }

  return options;
}

async function shutdown(client: MqttClient, storage: TelemetryStorage): Promise<void> {
  await new Promise<void>((resolve) => {
    client.end(false, {}, () => resolve());
  });
  await storage.close();
}
