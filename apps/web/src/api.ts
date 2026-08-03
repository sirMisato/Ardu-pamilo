import type { PolygonGeometry } from "@pamilo/shared";

export interface ApiEnvelope<T> {
  data: T | null;
  meta: {
    request_id: string;
    generated_at: string;
  };
  error: {
    code: string;
    message: string;
    fields?: Array<{
      path: string;
      message: string;
    }>;
  } | null;
}

export interface MePayload {
  user: {
    id: string;
    email: string;
  };
  active_tenant: {
    id: string;
    name: string;
    role: string;
  };
  available_tenants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  csrf_token: string;
}

export interface PlotPayload {
  id: string;
  farm_id: string;
  name: string;
  geometry: PolygonGeometry;
  area_m2: number;
  area_ha: number;
  centroid: {
    lat: number;
    lng: number;
  };
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  adm4_code: string | null;
  mapping_status: string;
}

export interface FarmPayload {
  id: string;
  name: string;
  timezone: string;
}

export interface DevicePayload {
  id: string;
  plot_id: string;
  serial_no: string;
  label: string | null;
  client_id: string;
  mqtt_username: string;
  credential_ref: string;
  credential_fingerprint: string;
  status: string;
  provisioned_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  topics: {
    publish: string[];
    subscribe: string[];
  };
}

export interface DeviceProvisioningPayload extends DevicePayload {
  credential: {
    password: string;
    fingerprint: string;
    shown_once: true;
  };
  mosquitto_acl: string[];
}

export async function login(input: {
  email: string;
  password: string;
  tenantId: string;
}): Promise<ApiEnvelope<MePayload>> {
  return request<MePayload>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      tenant_id: input.tenantId
    })
  });
}

export async function logout(csrfToken: string): Promise<ApiEnvelope<{ logged_out: boolean }>> {
  return request<{ logged_out: boolean }>("/api/v1/auth/logout", {
    method: "POST",
    headers: {
      "x-csrf-token": csrfToken
    },
    body: JSON.stringify({})
  });
}

export async function getMe(): Promise<ApiEnvelope<MePayload>> {
  return request<MePayload>("/api/v1/me");
}

export async function getFarms(): Promise<ApiEnvelope<FarmPayload[]>> {
  return request<FarmPayload[]>("/api/v1/farms");
}

export async function createFarm(input: {
  name: string;
  timezone: string;
  csrfToken: string;
}): Promise<ApiEnvelope<FarmPayload>> {
  return request<FarmPayload>("/api/v1/farms", {
    method: "POST",
    headers: {
      "x-csrf-token": input.csrfToken
    },
    body: JSON.stringify({
      name: input.name,
      timezone: input.timezone
    })
  });
}

export async function getFarmPlots(farmId: string): Promise<ApiEnvelope<PlotPayload[]>> {
  return request<PlotPayload[]>(`/api/v1/farms/${encodeURIComponent(farmId)}/plots`);
}

export async function getPlot(plotId: string): Promise<ApiEnvelope<PlotPayload>> {
  return request<PlotPayload>(`/api/v1/plots/${encodeURIComponent(plotId)}`);
}

export async function createPlot(input: {
  farmId: string;
  name: string;
  adm4Code: string;
  geometry: PolygonGeometry;
  csrfToken: string;
}): Promise<ApiEnvelope<PlotPayload>> {
  return request<PlotPayload>(`/api/v1/farms/${encodeURIComponent(input.farmId)}/plots`, {
    method: "POST",
    headers: {
      "x-csrf-token": input.csrfToken
    },
    body: JSON.stringify({
      name: input.name,
      adm4_code: input.adm4Code,
      geometry: input.geometry
    })
  });
}

export async function getPlotDevices(plotId: string): Promise<ApiEnvelope<DevicePayload[]>> {
  return request<DevicePayload[]>(`/api/v1/plots/${encodeURIComponent(plotId)}/devices`);
}

export async function provisionDevice(input: {
  plotId: string;
  serialNo: string;
  label: string;
  csrfToken: string;
}): Promise<ApiEnvelope<DeviceProvisioningPayload>> {
  return request<DeviceProvisioningPayload>(`/api/v1/plots/${encodeURIComponent(input.plotId)}/devices`, {
    method: "POST",
    headers: {
      "x-csrf-token": input.csrfToken
    },
    body: JSON.stringify({
      serial_no: input.serialNo,
      label: input.label
    })
  });
}

export async function revokeDevice(input: {
  deviceId: string;
  csrfToken: string;
}): Promise<ApiEnvelope<DevicePayload>> {
  return request<DevicePayload>(`/api/v1/devices/${encodeURIComponent(input.deviceId)}/revoke`, {
    method: "POST",
    headers: {
      "x-csrf-token": input.csrfToken
    },
    body: JSON.stringify({})
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers
    }
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok && !payload.error) {
    return {
      data: null,
      meta: {
        request_id: "unknown",
        generated_at: new Date().toISOString()
      },
      error: {
        code: "REQUEST_FAILED",
        message: "Request failed."
      }
    };
  }

  return payload;
}
