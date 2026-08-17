import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { appEnvironment } from "../config/environment";
import { apiGet } from "../services/apiClient";
import { useAuthStore } from "./authStore";

export type TelemetryValue = boolean | number | string | null;
export type MqttConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "history" | "error";

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
  latitude: number | null;
  longitude: number | null;
  nodeId: string;
  topic: string;
  online: boolean;
  lastSeenAt: string;
  metrics: Record<string, DynamicMetric>;
  rawPayload: unknown;
}

interface TelemetryHistoryItem {
  deviceUid: string;
  payload: unknown;
  receivedAt: string;
  topic: string;
}

interface TelemetryIngestOptions {
  deviceId?: string;
  observedAt?: string;
  online?: boolean;
}

const defaultTenantId = "demo-tenant";
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
  const authStore = useAuthStore();
  const client = shallowRef<MqttClient | null>(null);
  const connectionState = ref<MqttConnectionState>("idle");
  const errorMessage = ref<string | null>(null);
  const isHistoryLoading = ref(false);
  const subscriptionTopic = ref(buildDefaultSubscriptionTopic(defaultTenantId));
  const devices = ref<Record<string, DeviceTelemetry>>({});

  const isConnected = computed(() => connectionState.value === "connected");
  const latestMetrics = computed(() => Object.values(devices.value)
    .flatMap((device) => Object.values(device.metrics))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));

  const onlineDeviceCount = computed(() => Object.values(devices.value).filter((device) => device.online).length);
  const deviceCount = computed(() => Object.keys(devices.value).length);

  function connect(topic = buildDefaultSubscriptionTopic(authStore.tenant?.id ?? defaultTenantId)): void {
    subscriptionTopic.value = topic;
    void refreshHistory();

    if (client.value) {
      return;
    }

    if (!appEnvironment.mqttWebSocketUrl) {
      connectionState.value = "history";
      errorMessage.value = null;
      return;
    }

    if (!appEnvironment.mqttUsername || !appEnvironment.mqttPassword) {
      connectionState.value = "history";
      errorMessage.value = null;
      return;
    }

    connectionState.value = "connecting";
    errorMessage.value = null;

    const options: IClientOptions = {
      clean: true,
      clientId: `pamilo-web-${crypto.randomUUID()}`,
      connectTimeout: 10_000,
      keepalive: 30,
      password: appEnvironment.mqttPassword,
      protocolVersion: 5,
      reconnectPeriod: 5_000,
      username: appEnvironment.mqttUsername
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
      errorMessage.value = isMqttAuthError(error)
        ? "MQTT membutuhkan username/password. Gunakan broker credential di device atau backend telemetry stream."
        : error.message;

      if (isMqttAuthError(error)) {
        mqttClient.options.reconnectPeriod = 0;
        mqttClient.end(true);
        client.value = null;
      }
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

  async function refreshHistory(): Promise<void> {
    if (isHistoryLoading.value) {
      return;
    }

    isHistoryLoading.value = true;

    try {
      const items = await apiGet<TelemetryHistoryItem[]>("/api/v1/telemetry/latest");

      for (const item of [...items].reverse()) {
        ingestTelemetryPayload(item.topic, item.payload, {
          deviceId: item.deviceUid,
          observedAt: item.receivedAt,
          online: connectionState.value === "connected"
        });
      }

      if (!client.value && connectionState.value !== "connected") {
        connectionState.value = "history";
      }

      errorMessage.value = null;
    } catch (error) {
      if (!client.value && connectionState.value !== "connected") {
        connectionState.value = "error";
        errorMessage.value = error instanceof Error ? error.message : "Gagal mengambil telemetry history.";
      }
    } finally {
      isHistoryLoading.value = false;
    }
  }

  function ingestMqttMessage(topicName: string, rawMessage: string): void {
    try {
      const payload = JSON.parse(rawMessage) as unknown;
      ingestTelemetryPayload(topicName, payload);
    } catch {
      errorMessage.value = "Received MQTT payload is not valid JSON.";
    }
  }

  function ingestTelemetryPayload(topicName: string, payload: unknown, options: TelemetryIngestOptions = {}): void {
    if (!isRecord(payload)) {
      errorMessage.value = "Received MQTT payload must be a JSON object.";
      return;
    }

    const now = new Date().toISOString();
    const topicDeviceId = extractDeviceIdFromTopic(topicName);
    const deviceId = readString(payload.device_id)
      ?? readString(payload.deviceId)
      ?? options.deviceId
      ?? topicDeviceId
      ?? "unknown-device";
    const nodeId = readString(payload.node_id)
      ?? readString(payload.nodeId)
      ?? deviceId;
    const observedAt = options.observedAt
      ?? readString(payload.timestamp)
      ?? readString(payload.ts)
      ?? readString(payload.time)
      ?? now;
    const metricSource = isRecord(payload.metrics) ? payload.metrics : payload;
    const units = isRecord(payload.units) ? payload.units : {};
    const location = readPayloadLocation(payload);
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
        latitude: location?.latitude ?? previous?.latitude ?? null,
        longitude: location?.longitude ?? previous?.longitude ?? null,
        nodeId,
        topic: topicName,
        online: options.online ?? true,
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
    isHistoryLoading,
    isConnected,
    latestMetrics,
    latestMetricsForDevice,
    onlineDeviceCount,
    refreshHistory,
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

function readNumber(value: unknown): number | null {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
}

function readPayloadLocation(payload: Record<string, unknown>): { latitude: number; longitude: number } | null {
  const nestedLocation = isRecord(payload.location) ? payload.location : {};
  const latitude = readNumber(payload.latitude)
    ?? readNumber(payload.lat)
    ?? readNumber(nestedLocation.latitude)
    ?? readNumber(nestedLocation.lat);
  const longitude = readNumber(payload.longitude)
    ?? readNumber(payload.lng)
    ?? readNumber(payload.lon)
    ?? readNumber(nestedLocation.longitude)
    ?? readNumber(nestedLocation.lng)
    ?? readNumber(nestedLocation.lon);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}

function buildDefaultSubscriptionTopic(tenantId: string): string {
  return `pamilo/v1/tenants/${tenantId}/devices/+/telemetry`;
}

function isMqttAuthError(error: Error): boolean {
  return /bad username|not authorized|not authorised|not authorized|authentication/i.test(error.message);
}
