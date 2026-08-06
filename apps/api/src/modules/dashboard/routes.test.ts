import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

const demoPassword = "local-demo-password";

describe("dashboard routes", () => {
  it("returns tenant-scoped real-time dashboard data from dynamic telemetry keys", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/dashboard",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        plot: {
          id: "plot-a",
          name: "Plot Tenant A",
          adm4_code: null
        },
        devices: {
          total: 0,
          online: 0,
          offline: 0
        },
        telemetry: {
          latest: expect.arrayContaining([
            expect.objectContaining({
              metric: "soil_temperature",
              value: 27.4
            }),
            expect.objectContaining({
              metric: "soil_moisture",
              value: 43.1
            })
          ]),
          metrics: expect.arrayContaining([
            expect.objectContaining({
              metric: "soil_temperature",
              label: "Soil Temperature",
              value_type: "number",
              sample_count: 2,
              min: 27.1,
              max: 27.4
            })
          ]),
          histories: expect.arrayContaining([
            expect.objectContaining({
              metric: "soil_temperature",
              points: expect.arrayContaining([
                expect.objectContaining({
                  value: 27.1
                })
              ])
            })
          ])
        },
        weather: {
          source: "bmkg",
          cache_status: "missing"
        },
        realtime: {
          poll_interval_ms: 15000
        }
      },
      error: null
    });
  });

  it("hides dashboard data for another tenant's plot", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-b/dashboard",
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
