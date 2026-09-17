import { apiGet, apiPost, apiRequest } from "./apiClient";

export type PushSupportState = "denied" | "granted" | "not_supported" | "unsupported_context" | "prompt";

interface PushPublicKeyResponse {
  configured: boolean;
  publicKey: string | null;
}

interface PushSubscriptionJson {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
}

export async function getPushSupportState(): Promise<PushSupportState> {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "not_supported";
  }

  if (!window.isSecureContext) {
    return "unsupported_context";
  }

  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

export async function isPushConfigured(): Promise<boolean> {
  const response = await apiGet<PushPublicKeyResponse>("/api/v1/settings/push/public-key");
  return response.configured && Boolean(response.publicKey);
}

export async function subscribeToWebPush(): Promise<void> {
  const state = await getPushSupportState();
  if (state === "not_supported" || state === "unsupported_context") {
    throw new Error(state);
  }

  const permission = state === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(permission);
  }

  const keyResponse = await apiGet<PushPublicKeyResponse>("/api/v1/settings/push/public-key");
  if (!keyResponse.configured || !keyResponse.publicKey) {
    throw new Error("not_configured");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(keyResponse.publicKey),
    userVisibleOnly: true
  });
  const json = subscription.toJSON() as PushSubscriptionJson;

  if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
    throw new Error("invalid_subscription");
  }

  await apiPost("/api/v1/settings/push/subscriptions", {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      auth: json.keys.auth,
      p256dh: json.keys.p256dh
    }
  });
}

export async function unsubscribeFromWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await apiRequest<void>("/api/v1/settings/push/subscriptions", {
    body: {
      endpoint: subscription.endpoint
    },
    method: "DELETE"
  });
  await subscription.unsubscribe();
}

export async function sendTestWebPush(): Promise<number> {
  const response = await apiPost<{ ok: boolean; sent: number }>("/api/v1/settings/push/test", {});
  return response.sent;
}

function urlBase64ToUint8Array(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}
