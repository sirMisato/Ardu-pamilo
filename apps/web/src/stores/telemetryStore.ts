import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { resolveApiUrl } from "../config/environment";
import { t } from "../i18n";
import { apiGet, getAccessToken } from "../services/apiClient";
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
  metricKeys?: string[];
  payload: unknown;
  receivedAt: string;
  topic: string;
}

interface TelemetryStreamItem {
  deviceUid: string;
  metricKeys: string[];
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
const telemetryOnlineWindowMs = 15 * 60 * 1000;
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
  const streamController = shallowRef<AbortController | null>(null);
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
  let isStreamDisconnectRequested = false;
  let streamReconnectTimer: number | undefined;

  async function connect(topic = buildDefaultSubscriptionTopic(authStore.tenant?.id ?? defaultTenantId)): Promise<void> {
    subscriptionTopic.value = topic;
    void refreshHistory();

    if (streamController.value) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      connectionState.value = "history";
      errorMessage.value = t("telemetry.errors.sessionRequired");
      return;
    }

    isStreamDisconnectRequested = false;
    openTelemetryStream(token);
  }

  function disconnect(): void {
    isStreamDisconnectRequested = true;

    if (streamReconnectTimer) {
      window.clearTimeout(streamReconnectTimer);
      streamReconnectTimer = undefined;
    }

    streamController.value?.abort();
    streamController.value = null;
    connectionState.value = "idle";
  }

  function openTelemetryStream(token: string): void {
    const controller = new AbortController();
    streamController.value = controller;
    connectionState.value = "connecting";
    errorMessage.value = null;

    void readTelemetryStream(controller, token);
  }

  async function readTelemetryStream(controller: AbortController, token: string): Promise<void> {
    try {
      const response = await fetch(resolveApiUrl("/api/v1/telemetry/stream"), {
        credentials: "include",
        headers: {
          "Accept": "text/event-stream",
          "Authorization": `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("pamilo:auth-expired"));
        throw new Error(t("telemetry.errors.sessionExpired"));
      }

      if (!response.ok || !response.body) {
        throw new Error(t("telemetry.errors.streamOpenFailed", { status: response.status }));
      }

      connectionState.value = "connected";
      errorMessage.value = null;
      await consumeTelemetryStream(response.body, controller);
    } catch (error) {
      if (controller.signal.aborted && isStreamDisconnectRequested) {
        return;
      }

      connectionState.value = "offline";
      errorMessage.value = error instanceof Error ? error.message : t("telemetry.errors.streamDisconnected");
      scheduleStreamReconnect();
    } finally {
      if (streamController.value === controller) {
        streamController.value = null;
      }
    }
  }

  async function consumeTelemetryStream(body: ReadableStream<Uint8Array>, controller: AbortController): Promise<void> {
    const decoder = new TextDecoder();
    const reader = body.getReader();
    let buffer = "";

    try {
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = processSseBuffer(buffer);
      }

      buffer += decoder.decode();
      processSseBuffer(`${buffer}\n\n`);
      throw new Error(t("telemetry.errors.streamClosed"));
    } finally {
      reader.releaseLock();
    }
  }

  function processSseBuffer(buffer: string): string {
    const chunks = buffer.split(/\r?\n\r?\n/);
    const remainder = chunks.pop() ?? "";

    for (const chunk of chunks) {
      processSseChunk(chunk);
    }

    return remainder;
  }

  function processSseChunk(chunk: string): void {
    const lines = chunk.split(/\r?\n/);
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }

    if (eventName !== "telemetry" || dataLines.length === 0) {
      return;
    }

    try {
      const item = JSON.parse(dataLines.join("\n")) as TelemetryStreamItem;
      ingestTelemetryPayload(item.topic, item.payload, {
        deviceId: item.deviceUid,
        observedAt: item.receivedAt,
        online: true
      });
      connectionState.value = "connected";
      errorMessage.value = null;
    } catch {
      connectionState.value = "error";
      errorMessage.value = t("telemetry.errors.invalidStreamPayload");
    }
  }

  function scheduleStreamReconnect(): void {
    if (isStreamDisconnectRequested || streamReconnectTimer) {
      return;
    }

    connectionState.value = "reconnecting";
    streamReconnectTimer = window.setTimeout(() => {
      streamReconnectTimer = undefined;
      const token = getAccessToken();

      if (!token) {
        connectionState.value = "history";
        errorMessage.value = t("telemetry.errors.sessionRequired");
        return;
      }

      openTelemetryStream(token);
    }, 5_000);
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
          online: connectionState.value === "connected" || isTelemetryRecent(item.receivedAt)
        });
      }

      if (!streamController.value && connectionState.value !== "connected") {
        connectionState.value = "history";
      }

      errorMessage.value = null;
    } catch (error) {
      if (!streamController.value && connectionState.value !== "connected") {
        connectionState.value = "error";
        errorMessage.value = error instanceof Error ? error.message : t("telemetry.errors.historyFailed");
      }
    } finally {
      isHistoryLoading.value = false;
    }
  }

  function ingestTelemetryPayload(topicName: string, payload: unknown, options: TelemetryIngestOptions = {}): void {
    if (!isRecord(payload)) {
      errorMessage.value = t("telemetry.errors.payloadMustBeObject");
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

    if (previous && isIncomingTelemetryOlder(previous.lastSeenAt, observedAt)) {
      return;
    }

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
    connectionState,
    deviceById,
    deviceCount,
    devices,
    disconnect,
    errorMessage,
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

function isTelemetryRecent(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= telemetryOnlineWindowMs;
}

function isIncomingTelemetryOlder(previousTimestamp: string, nextTimestamp: string): boolean {
  const previousTime = Date.parse(previousTimestamp);
  const nextTime = Date.parse(nextTimestamp);
  return Number.isFinite(previousTime) && Number.isFinite(nextTime) && nextTime < previousTime;
}

function buildDefaultSubscriptionTopic(tenantId: string): string {
  return `pamilo/v1/tenants/${tenantId}/devices/+/telemetry`;
}
