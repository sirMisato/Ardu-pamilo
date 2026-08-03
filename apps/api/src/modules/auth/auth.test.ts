import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { InMemoryAuditLog } from "../audit/audit-log.js";

const demoPassword = "local-demo-password";

describe("auth routes", () => {
  it("logs in and returns the active tenant context", async () => {
    const app = buildApp();
    const response = await login(app, "farmer-a@example.test", "tenant-a");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        user: {
          id: "user-farmer-a",
          email: "farmer-a@example.test"
        },
        active_tenant: {
          id: "tenant-a",
          role: "farmer_owner"
        }
      },
      error: null
    });
    expect(getCookieHeader(response)).toContain("pamilo_session=");
  });

  it("rejects invalid credentials without exposing internals", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "farmer-a@example.test",
        password: "wrong-password"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      data: null,
      error: {
        code: "INVALID_CREDENTIALS"
      }
    });
  });

  it("returns profile for an authenticated session", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "operator-a@example.test", "tenant-a");
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        active_tenant: {
          id: "tenant-a",
          role: "farmer_operator"
        }
      }
    });
  });

  it("requires a valid csrf token for logout", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const blocked = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toMatchObject({
      error: {
        code: "CSRF_FAILED"
      }
    });

    const csrfToken = loginResponse.json().data.csrf_token as string;
    const loggedOut = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": csrfToken
      }
    });

    expect(loggedOut.statusCode).toBe(200);

    const afterLogout = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(afterLogout.statusCode).toBe(401);
  });

  it("records auth audit events", async () => {
    const auditLog = new InMemoryAuditLog();
    const app = buildApp({ auditLog });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");
    const csrfToken = loginResponse.json().data.csrf_token as string;

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": csrfToken
      }
    });

    expect(auditLog.all().map((event) => event.action)).toEqual([
      "auth.login_success",
      "auth.logout"
    ]);
  });
});

async function login(app: ReturnType<typeof buildApp>, email: string, tenantId: string): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email,
      password: demoPassword,
      tenant_id: tenantId
    }
  });
}

function getCookieHeader(response: LightMyRequestResponse): string {
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : [header];

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.split(";")[0])
    .join("; ");
}
