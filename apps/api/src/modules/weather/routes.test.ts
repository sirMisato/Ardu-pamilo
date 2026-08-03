import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import type { PolygonGeometry } from "@pamilo/shared";
import { buildApp } from "../../app.js";

const demoPassword = "local-demo-password";

const validPolygon: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [106.82, -6.22],
      [106.83, -6.22],
      [106.83, -6.21],
      [106.82, -6.21],
      [106.82, -6.22]
    ]
  ]
};

describe("weather routes", () => {
  it("returns a missing BMKG cache payload when a plot has no ADM4 mapping", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/weather",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        source: "bmkg",
        attribution: "BMKG",
        adm4_code: null,
        mapping_status: "unmapped",
        cache_status: "missing",
        forecast: []
      },
      error: null
    });
  });

  it("returns cached BMKG forecast for a mapped tenant-owned plot", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");
    const created = await createMappedPlot(app, loginResponse);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/plots/${encodeURIComponent(created.id)}/weather`,
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        source: "bmkg",
        attribution: "BMKG",
        adm4_code: "31.71.01.1001",
        mapping_status: "verified",
        cache_status: "stale",
        analysis_date: "2026-08-03",
        forecast: expect.arrayContaining([
          expect.objectContaining({
            utc_datetime: "2026-08-03T06:00:00Z",
            local_datetime: "2026-08-03T13:00:00+07:00",
            temperature_c: 29,
            humidity_pct: 82,
            weather_desc: "Hujan Ringan",
            weather_desc_en: "Light Rain"
          })
        ])
      },
      error: null
    });
  });

  it("hides weather for another tenant's plot", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-b/weather",
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

  it("allows read-only operators to read plot weather", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "operator-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a/weather",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        source: "bmkg",
        cache_status: "missing"
      },
      error: null
    });
  });
});

async function createMappedPlot(
  app: ReturnType<typeof buildApp>,
  loginResponse: LightMyRequestResponse
): Promise<{ id: string }> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/farms/farm-a/plots",
    headers: {
      cookie: getCookieHeader(loginResponse),
      "x-csrf-token": getCsrfToken(loginResponse)
    },
    payload: {
      name: "Plot BMKG",
      adm4_code: "31.71.01.1001",
      geometry: validPolygon
    }
  });

  expect(response.statusCode).toBe(201);
  return response.json().data as { id: string };
}

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
