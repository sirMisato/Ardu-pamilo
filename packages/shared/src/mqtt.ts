export const mqttTopicVersion = "v1";

export type DeviceTopicKind = "telemetry" | "status" | "events" | "commands" | "acks";

export interface DeviceTopicParts {
  tenantId: string;
  deviceId: string;
  kind: DeviceTopicKind;
}

export interface DeviceMqttAccess {
  tenantId: string;
  deviceId: string;
  clientId: string;
  username: string;
  publishTopics: readonly string[];
  subscribeTopics: readonly string[];
  mosquittoAcl: readonly string[];
}

const topicPattern = /^pamilo\/v1\/tenants\/([^/]+)\/devices\/([^/]+)\/(telemetry|status|events|commands|acks)$/;
const mqttIdentifierPattern = /^[A-Za-z0-9._:-]+$/;

export function buildDeviceTopic(parts: DeviceTopicParts): string {
  assertMqttIdentifier(parts.tenantId, "tenantId");
  assertMqttIdentifier(parts.deviceId, "deviceId");

  return `pamilo/${mqttTopicVersion}/tenants/${parts.tenantId}/devices/${parts.deviceId}/${parts.kind}`;
}

export function buildDeviceMqttAccess(parts: {
  tenantId: string;
  deviceId: string;
  clientId?: string;
  username?: string;
}): DeviceMqttAccess {
  assertMqttIdentifier(parts.tenantId, "tenantId");
  assertMqttIdentifier(parts.deviceId, "deviceId");

  const clientId = parts.clientId ?? `pamilo-${parts.tenantId}-${parts.deviceId}`;
  const username = parts.username ?? `pamilo.${parts.tenantId}.${parts.deviceId}`;

  assertMqttIdentifier(clientId, "clientId");
  assertMqttIdentifier(username, "username");

  const writeKinds: DeviceTopicKind[] = ["telemetry", "status", "events", "acks"];
  const readKinds: DeviceTopicKind[] = ["commands"];
  const publishTopics = writeKinds.map((kind) => buildDeviceTopic({ ...parts, kind }));
  const subscribeTopics = readKinds.map((kind) => buildDeviceTopic({ ...parts, kind }));

  return {
    tenantId: parts.tenantId,
    deviceId: parts.deviceId,
    clientId,
    username,
    publishTopics,
    subscribeTopics,
    mosquittoAcl: [
      `user ${username}`,
      ...publishTopics.map((topic) => `topic write ${topic}`),
      ...subscribeTopics.map((topic) => `topic read ${topic}`)
    ]
  };
}

export function parseDeviceTopic(topic: string): DeviceTopicParts | null {
  const match = topic.match(topicPattern);
  if (!match) {
    return null;
  }

  const [, tenantId, deviceId, kind] = match;

  if (!tenantId || !deviceId || !kind) {
    return null;
  }

  return {
    tenantId,
    deviceId,
    kind: kind as DeviceTopicKind
  };
}

function assertMqttIdentifier(value: string, field: string): void {
  if (!mqttIdentifierPattern.test(value)) {
    throw new Error(`${field} contains characters that are unsafe for MQTT topic or ACL generation.`);
  }
}
