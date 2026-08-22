import type { JsonValue } from "../db/schema.js";

export interface TelemetryStreamEvent {
  deviceUid: string;
  metricKeys: string[];
  payload: Record<string, JsonValue>;
  receivedAt: string;
  tenantId: string;
  topic: string;
}

type TelemetryEventListener = (event: TelemetryStreamEvent) => void;

const tenantListeners = new Map<string, Set<TelemetryEventListener>>();

export function emitTelemetryEvent(event: TelemetryStreamEvent): void {
  const listeners = tenantListeners.get(event.tenantId);

  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeTelemetryEvents(tenantId: string, listener: TelemetryEventListener): () => void {
  const listeners = tenantListeners.get(tenantId) ?? new Set<TelemetryEventListener>();
  listeners.add(listener);
  tenantListeners.set(tenantId, listeners);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      tenantListeners.delete(tenantId);
    }
  };
}
