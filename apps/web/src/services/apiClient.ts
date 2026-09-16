import { appEnvironment, resolveApiUrl } from "../config/environment";
import { getCurrentLanguage } from "../i18n";

export const accessTokenStorageKey = "pamilo.accessToken";

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  issues?: unknown;
}

export class ApiClientError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

export interface TenantLoginResponse {
  accessToken: string;
  tenant: {
    accountName?: string;
    id: string;
    licenseExpiresAt?: string | null;
    licenseStatus?: string;
    maxDevices?: number;
    maxPlots?: number;
    ownerEmail?: string;
    role: "tenant_admin" | "tenant_user";
  };
  user: {
    email: string;
    name?: string;
    role: "tenant_admin" | "tenant_user";
  };
}

export interface SuperAdminLoginResponse {
  accessToken: string;
  user: {
    email: string;
    role: "super_admin";
  };
}

type RequestBody = BodyInit | object | null;
type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: RequestBody;
};

export function getAccessToken(): string | null {
  return localStorage.getItem(accessTokenStorageKey);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(accessTokenStorageKey, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(accessTokenStorageKey);
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  let body: BodyInit | null | undefined = options.body as BodyInit | null | undefined;

  headers.set("Accept", "application/json");
  headers.set("Accept-Language", getCurrentLanguage());
  headers.set("X-Pamilo-Locale", getCurrentLanguage());

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body !== undefined && body !== null && !isBodyInit(body)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...options,
    body: body as BodyInit | null | undefined,
    credentials: "include",
    headers
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = await parseResponsePayload(response);
  const errorPayload = isApiErrorPayload(payload) ? payload : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
      window.dispatchEvent(new CustomEvent("pamilo:auth-expired"));
    }

    throw new ApiClientError(
      errorPayload?.message || errorPayload?.error || `API request failed with HTTP ${response.status}`,
      response.status,
      errorPayload
    );
  }

  return payload as TResponse;
}

export function apiGet<TResponse>(path: string, options: RequestInit = {}): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    ...options,
    method: "GET"
  });
}

export function apiPost<TResponse>(path: string, body: RequestBody, options: Omit<RequestInit, "body"> = {}): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    ...options,
    body,
    method: "POST"
  });
}

export function apiPut<TResponse>(path: string, body: RequestBody, options: Omit<RequestInit, "body"> = {}): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    ...options,
    body,
    method: "PUT"
  });
}

export function apiDelete<TResponse>(path: string, options: RequestInit = {}): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    ...options,
    method: "DELETE"
  });
}

export async function loginTenant(credentials: {
  emailOrUsername: string;
  password: string;
  tenantId?: string;
}): Promise<TenantLoginResponse> {
  const response = await apiPost<TenantLoginResponse>("/api/auth/login", credentials);
  setAccessToken(response.accessToken);
  return response;
}

export async function loginSuperAdmin(credentials: {
  email: string;
  password: string;
}): Promise<SuperAdminLoginResponse> {
  const response = await apiPost<SuperAdminLoginResponse>("/api/auth/admin", credentials);
  setAccessToken(response.accessToken);
  return response;
}

export function describeApiTarget(): string {
  try {
    return new URL(appEnvironment.apiBaseUrl).host;
  } catch {
    return "API";
  }
}

async function parseResponsePayload(response: Response): Promise<ApiErrorPayload | unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text ? { message: text } : null;
  }

  return response.json() as Promise<ApiErrorPayload | unknown>;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBodyInit(value: unknown): value is BodyInit {
  return typeof value === "string"
    || value instanceof Blob
    || value instanceof FormData
    || value instanceof URLSearchParams
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value);
}
