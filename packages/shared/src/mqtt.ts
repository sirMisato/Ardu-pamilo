export const mqttTopicVersion = "v1";

export type DeviceTopicKind = "telemetry" | "status" | "events" | "commands" | "acks";

export interface DeviceTopicParts {
  tenantId: string;
  deviceId: string;
  kind: DeviceTopicKind;
}

const topicPattern = /^pamilo\/v1\/tenants\/([^/]+)\/devices\/([^/]+)\/(telemetry|status|events|commands|acks)$/;

export function buildDeviceTopic(parts: DeviceTopicParts): string {
  return `pamilo/${mqttTopicVersion}/tenants/${parts.tenantId}/devices/${parts.deviceId}/${parts.kind}`;
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
