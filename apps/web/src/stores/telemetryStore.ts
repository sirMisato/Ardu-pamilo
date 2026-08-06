import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { appEnvironment } from "../config/environment";

export type TelemetryValue = boolean | number | string | null;
export type MqttConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "error";

export interface DynamicMetric {
  key: string;
  label: string;
  value: TelemetryValue;
  valueType: "boolean" | "null" | "number" | "string";
  unit: string;
  displayValue: string;
  updatedAt: string;
  source: string;
}

export interface DeviceTelemetry {
  deviceId: string;
  nodeId: string;
  topic: string;
  online: boolean;
  lastSeenAt: string;
  metrics: Record<string, DynamicMetric>;
  rawPayload: unknown;
}

const defaultSubscriptionTopic = "pamilo/v1/tenants/mock-tenant/devices/+/telemetry";
const reservedPayloadKeys = new Set([
  "device_id",
  "deviceId",
  "node_id",
  "nodeId",
  "tenant_id",
  "tenantId",
  "timestamp",
  "ts",
  "time",
  "metrics",
  "meta",
  "metadata",
  "units",
  "location",
  "lat",
  "lng",
  "latitude",
  "longitude"
]);

export const useTelemetryStore = defineStore("telemetry", () => {
  const client = shallowRef<MqttClient | null>(null);
  const connectionState = ref<MqttConnectionState>("idle");
  const errorMessage = ref<string | null>(null);
  const subscriptionTopic = ref(defaultSubscriptionTopic);
  const devices = ref<Record<string, DeviceTelemetry>>({});

  const isConnected = computed(() => connectionState.value === "connected");
  const latestMetrics = computed(() => Object.values(devices.value)
    .flatMap((device) => Object.values(device.metrics))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));

  const onlineDeviceCount = computed(() => Object.values(devices.value).filter((device) => device.online).length);
  const deviceCount = computed(() => Object.keys(devices.value).length);

  function connect(topic = defaultSubscriptionTopic): void {
    subscriptionTopic.value = topic;
    seedMockTelemetry();

    if (client.value) {
      return;
    }

    if (!appEnvironment.mqttWebSocketUrl) {
      connectionState.value = "error";
      errorMessage.value = "VITE_MQTT_WEBSOCKET_URL is not configured.";
      return;
    }

    connectionState.value = "connecting";
    errorMessage.value = null;

    const options: IClientOptions = {
      clean: true,
      clientId: `pamilo-web-${crypto.randomUUID()}`,
      connectTimeout: 10_000,
      keepalive: 30,
      protocolVersion: 5,
      reconnectPeriod: 5_000
    };

    const mqttClient = mqtt.connect(appEnvironment.mqttWebSocketUrl, options);
    client.value = mqttClient;

    mqttClient.on("connect", () => {
      connectionState.value = "connected";
      errorMessage.value = null;
      mqttClient.subscribe(subscriptionTopic.value, { qos: 0 }, (error) => {
        if (error) {
          connectionState.value = "error";
          errorMessage.value = error.message;
        }
      });
    });

    mqttClient.on("reconnect", () => {
      connectionState.value = "reconnecting";
    });

    mqttClient.on("offline", () => {
      connectionState.value = "offline";
      markDevicesOffline();
    });

    mqttClient.on("close", () => {
      if (connectionState.value !== "error") {
        connectionState.value = "offline";
      }
    });

    mqttClient.on("error", (error) => {
      connectionState.value = "error";
      errorMessage.value = error.message;
    });

    mqttClient.on("message", (topicName, payload) => {
      ingestMqttMessage(topicName, payload.toString("utf8"));
    });
  }

  function disconnect(): void {
    client.value?.end(true);
    client.value = null;
    connectionState.value = "idle";
  }

  function ingestMqttMessage(topicName: string, rawMessage: string): void {
    try {
      const payload = JSON.parse(rawMessage) as unknown;
      ingestTelemetryPayload(topicName, payload);
    } catch {
      errorMessage.value = "Received MQTT payload is not valid JSON.";
    }
  }

  function ingestTelemetryPayload(topicName: string, payload: unknown): void {
    if (!isRecord(payload)) {
      errorMessage.value = "Received MQTT payload must be a JSON object.";
      return;
    }

    const now = new Date().toISOString();
    const topicDeviceId = extractDeviceIdFromTopic(topicName);
    const deviceId = readString(payload.device_id)
      ?? readString(payload.deviceId)
      ?? topicDeviceId
      ?? "unknown-device";
    const nodeId = readString(payload.node_id)
      ?? readString(payload.nodeId)
      ?? deviceId;
    const observedAt = readString(payload.timestamp)
      ?? readString(payload.ts)
      ?? readString(payload.time)
      ?? now;
    const metricSource = isRecord(payload.metrics) ? payload.metrics : payload;
    const units = isRecord(payload.units) ? payload.units : {};
    const previous = devices.value[deviceId];
    const nextMetrics = {
      ...(previous?.metrics ?? {})
    };

    for (const [key, metricCandidate] of Object.entries(metricSource)) {
      if (reservedPayloadKeys.has(key)) {
        continue;
      }

      const parsedMetric = parseMetric(key, metricCandidate, units[key], observedAt, nodeId);
      if (parsedMetric) {
        nextMetrics[key] = parsedMetric;
      }
    }

    devices.value = {
      ...devices.value,
      [deviceId]: {
        deviceId,
        nodeId,
        topic: topicName,
        online: true,
        lastSeenAt: observedAt,
        metrics: nextMetrics,
        rawPayload: payload
      }
    };
  }

  function latestMetricsForDevice(deviceId: string): DynamicMetric[] {
    return Object.values(devices.value[deviceId]?.metrics ?? {})
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function deviceById(deviceId: string): DeviceTelemetry | null {
    return devices.value[deviceId] ?? null;
  }

  function seedMockTelemetry(): void {
    if (devices.value.SensorNode01) {
      return;
    }

    ingestTelemetryPayload("pamilo/v1/tenants/mock-tenant/devices/SensorNode01/telemetry", {
      device_id: "SensorNode01",
      node_id: "SensorNode01",
      timestamp: new Date().toISOString(),
      metrics: {
        ph: {
          value: 6.7,
          unit: "pH"
        },
        nitrogen: {
          value: 18,
          unit: "ppm"
        },
        moisture: {
          value: 42.1,
          unit: "%"
        },
        temperature: {
          value: 29.4,
          unit: "C"
        },
        conductivity: {
          value: 1.2,
          unit: "mS/cm"
        },
        battery: {
          value: 87,
          unit: "%"
        }
      }
    });
  }

  function markDevicesOffline(): void {
    devices.value = Object.fromEntries(Object.entries(devices.value).map(([deviceId, device]) => [
      deviceId,
      {
        ...device,
        online: false
      }
    ]));
  }

  return {
    client,
    connectionState,
    deviceById,
    deviceCount,
    devices,
    disconnect,
    errorMessage,
    ingestMqttMessage,
    ingestTelemetryPayload,
    isConnected,
    latestMetrics,
    latestMetricsForDevice,
    onlineDeviceCount,
    seedMockTelemetry,
    subscriptionTopic,
    connect
  };
});

function parseMetric(
  key: string,
  candidate: unknown,
  unitCandidate: unknown,
  observedAt: string,
  source: string
): DynamicMetric | null {
  const valueCandidate = isRecord(candidate) && "value" in candidate
    ? candidate.value
    : candidate;

  if (!isTelemetryValue(valueCandidate)) {
    return null;
  }

  const unit = isRecord(candidate) && typeof candidate.unit === "string"
    ? candidate.unit
    : typeof unitCandidate === "string"
      ? unitCandidate
      : "";
  const valueType: DynamicMetric["valueType"] = valueCandidate === null
    ? "null"
    : typeof valueCandidate === "number"
      ? "number"
      : typeof valueCandidate === "boolean"
        ? "boolean"
        : "string";
  const displayValue = `${String(valueCandidate)} ${unit}`.trim();

  return {
    key,
    label: formatMetricLabel(key),
    value: valueCandidate,
    valueType,
    unit,
    displayValue,
    updatedAt: observedAt,
    source
  };
}

function extractDeviceIdFromTopic(topicName: string): string | null {
  const match = topicName.match(/^pamilo\/v\d+\/tenants\/[^/]+\/devices\/([^/]+)\/telemetry$/);
  return match?.[1] ?? null;
}

function formatMetricLabel(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTelemetryValue(value: unknown): value is TelemetryValue {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
