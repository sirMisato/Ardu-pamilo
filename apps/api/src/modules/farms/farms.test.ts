import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { InMemoryAuditLog } from "../audit/audit-log.js";

const demoPassword = "local-demo-password";

describe("farm routes", () => {
  it("lists only farms for the active tenant", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/farms",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          id: "farm-a",
          name: "Farm Tenant A"
        }
      ],
      error: null
    });
  });

  it("creates a tenant-owned farm when csrf and role are valid", async () => {
    const auditLog = new InMemoryAuditLog();
    const app = buildApp({ auditLog });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        name: "Kebun Kalibrasi",
        timezone: "Asia/Makassar"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        id: expect.stringMatching(/^farm-/),
        name: "Kebun Kalibrasi",
        timezone: "Asia/Makassar"
      },
      error: null
    });
    expect(auditLog.all().map((event) => event.action)).toContain("farm.created");
  });

  it("rejects farm creation without csrf", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms",
      headers: {
        cookie: getCookieHeader(loginResponse)
      },
      payload: {
        name: "Kebun Tanpa CSRF"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: "CSRF_FAILED"
      }
    });
  });

  it("rejects farm creation for read-only tenant roles", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "operator-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        name: "Kebun Operator"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: "FORBIDDEN"
      }
    });
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

function getCsrfToken(response: LightMyRequestResponse): string {
  return response.json().data.csrf_token as string;
}
