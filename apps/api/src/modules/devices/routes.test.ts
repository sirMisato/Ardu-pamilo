import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { InMemoryAuditLog } from "../audit/audit-log.js";

const demoPassword = "local-demo-password";

describe("device provisioning routes", () => {
  it("lists devices for a tenant-owned plot only", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");
    await provisionDevice(app, loginResponse, "plot-a", "ESP32-A-001");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/devices",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          serial_no: "ESP32-A-001",
          plot_id: "plot-a",
          status: "provisioned"
        }
      ],
      error: null
    });
    expect(JSON.stringify(response.json().data)).not.toContain("password");

    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-b/devices",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(blocked.statusCode).toBe(404);
    expect(blocked.json()).toMatchObject({
      error: {
        code: "NOT_FOUND"
      }
    });
  });

  it("provisions a device with one-time MQTT credentials and ACL material", async () => {
    const auditLog = new InMemoryAuditLog();
    const app = buildApp({ auditLog });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await provisionDevice(app, loginResponse, "plot-a", "ESP32-A-002");

    expect(response.statusCode).toBe(201);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toMatchObject({
      data: {
        id: expect.stringMatching(/^device-/),
        plot_id: "plot-a",
        serial_no: "ESP32-A-002",
        mqtt_username: expect.stringMatching(/^pamilo\.tenant-a\.device-/),
        credential_ref: expect.stringMatching(/^mqtt:device-/),
        credential: {
          password: expect.stringMatching(/^pamilo_/),
          fingerprint: expect.any(String),
          shown_once: true
        },
        topics: {
          publish: expect.arrayContaining([
            expect.stringContaining("/telemetry")
          ]),
          subscribe: expect.arrayContaining([
            expect.stringContaining("/commands")
          ])
        },
        mosquitto_acl: expect.arrayContaining([
          expect.stringMatching(/^user pamilo\.tenant-a\.device-/),
          expect.stringContaining("topic write pamilo/v1/tenants/tenant-a/devices/")
        ])
      },
      error: null
    });
    expect(auditLog.all().map((event) => event.action)).toContain("device.provisioned");
  });

  it("rejects duplicate active serial numbers within one tenant", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    await provisionDevice(app, loginResponse, "plot-a", "ESP32-A-DUP");
    const response = await provisionDevice(app, loginResponse, "plot-a", "ESP32-A-DUP");

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: "DEVICE_SERIAL_CONFLICT"
      }
    });
  });

  it("requires csrf and provision permission for provisioning", async () => {
    const app = buildApp();
    const ownerLogin = await login(app, "farmer-a@example.test", "tenant-a");
    const operatorLogin = await login(app, "operator-a@example.test", "tenant-a");

    const missingCsrf = await app.inject({
      method: "POST",
      url: "/api/v1/plots/plot-a/devices",
      headers: {
        cookie: getCookieHeader(ownerLogin)
      },
      payload: {
        serial_no: "ESP32-NO-CSRF"
      }
    });

    expect(missingCsrf.statusCode).toBe(403);
    expect(missingCsrf.json()).toMatchObject({
      error: {
        code: "CSRF_FAILED"
      }
    });

    const readOnlyRole = await provisionDevice(app, operatorLogin, "plot-a", "ESP32-OPERATOR");

    expect(readOnlyRole.statusCode).toBe(403);
    expect(readOnlyRole.json()).toMatchObject({
      error: {
        code: "FORBIDDEN"
      }
    });
  });

  it("revokes devices without exposing credentials", async () => {
    const auditLog = new InMemoryAuditLog();
    const app = buildApp({ auditLog });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");
    const provisioned = await provisionDevice(app, loginResponse, "plot-a", "ESP32-A-003");
    const deviceId = provisioned.json().data.id as string;

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/devices/${encodeURIComponent(deviceId)}/revoke`,
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {}
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: deviceId,
        status: "revoked",
        revoked_at: expect.any(String)
      },
      error: null
    });
    expect(JSON.stringify(response.json().data)).not.toContain("password");
    expect(auditLog.all().map((event) => event.action)).toEqual([
      "auth.login_success",
      "device.provisioned",
      "device.revoked"
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

async function provisionDevice(
  app: ReturnType<typeof buildApp>,
  loginResponse: LightMyRequestResponse,
  plotId: string,
  serialNo: string
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: `/api/v1/plots/${encodeURIComponent(plotId)}/devices`,
    headers: {
      cookie: getCookieHeader(loginResponse),
      "x-csrf-token": getCsrfToken(loginResponse)
    },
    payload: {
      serial_no: serialNo
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
