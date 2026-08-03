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
  name: string;
  area_m2: number;
  area_ha: number;
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

export async function getPlot(plotId: string): Promise<ApiEnvelope<PlotPayload>> {
  return request<PlotPayload>(`/api/v1/plots/${encodeURIComponent(plotId)}`);
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
