import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { InMemoryTelemetryRepository } from "./telemetry-repository.js";

const demoPassword = "local-demo-password";

describe("telemetry routes", () => {
  it("returns latest telemetry for a tenant-owned plot", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/telemetry/latest",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      error: null
    });
    expect(response.json().data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        device_id: "device-a",
        node_id: "soil-01",
        metric: "soil_temperature",
        ts: "2026-08-03T03:05:00Z",
        value: 27.4,
        unit: "deg_c"
      }),
      expect.objectContaining({
        metric: "soil_moisture",
        value: 43.1,
        unit: "percent_relative"
      })
    ]));
  });

  it("hides latest telemetry for another tenant's plot", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-b/telemetry/latest",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND"
      }
    });
  });

  it("returns history points for a valid metric window", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/telemetry/history?metric=soil_temperature&from=2026-08-03T03:00:00Z&to=2026-08-03T03:10:00Z&resolution=raw",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        metric: "soil_temperature",
        resolution: "raw",
        points: [
          {
            ts: "2026-08-03T03:00:00Z",
            value: 27.1
          },
          {
            ts: "2026-08-03T03:05:00Z",
            value: 27.4
          }
        ]
      },
      error: null
    });
  });

  it("returns history points for dynamic metric keys", async () => {
    const telemetry = new InMemoryTelemetryRepository([
      {
        id: "dynamic-a-1",
        tenantId: "tenant-a",
        plotId: "plot-a",
        deviceId: "device-a",
        nodeId: "soil-01",
        metric: "soil_ph",
        ts: "2026-08-03T03:05:00Z",
        seq: 21,
        value: 6.4,
        valueType: "number",
        unit: "ph",
        calibrationProfile: "dynamic-v1",
        qualityFlags: []
      }
    ]);
    const app = buildApp({ telemetry });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/telemetry/history?metric=soil_ph&from=2026-08-03T03:00:00Z&to=2026-08-03T03:10:00Z&resolution=raw",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        metric: "soil_ph",
        points: [
          {
            metric: "soil_ph",
            value: 6.4,
            value_type: "number"
          }
        ]
      },
      error: null
    });
  });

  it("rejects invalid history query parameters", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/telemetry/history?metric=Bad%20Metric&from=nope&to=2026-08-03T03:10:00Z&resolution=2m",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        fields: expect.arrayContaining([
          {
            path: "metric",
            message: "Metric is required and must use lowercase letters, numbers, or underscores."
          },
          {
            path: "from",
            message: "From must be a valid date-time."
          },
          {
            path: "resolution",
            message: "Resolution must be one of raw, 5m, 15m, or 1h."
          }
        ])
      }
    });
  });

  it("allows read-only operators to read telemetry", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "operator-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/telemetry/latest",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBeGreaterThan(0);
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
