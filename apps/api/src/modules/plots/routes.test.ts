import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import type { PolygonGeometry } from "@pamilo/shared";
import { buildApp } from "../../app.js";
import { InMemoryAuditLog } from "../audit/audit-log.js";

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

const largerPolygon: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [106.82, -6.22],
      [106.84, -6.22],
      [106.84, -6.2],
      [106.82, -6.2],
      [106.82, -6.22]
    ]
  ]
};

describe("plot GIS routes", () => {
  it("lists plots for a tenant-owned farm only", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/farms/farm-a/plots",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          id: "plot-a",
          farm_id: "farm-a",
          centroid: {
            lat: expect.any(Number),
            lng: expect.any(Number)
          },
          bbox: {
            west: expect.any(Number),
            south: expect.any(Number),
            east: expect.any(Number),
            north: expect.any(Number)
          }
        }
      ],
      error: null
    });

    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/farms/farm-b/plots",
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

  it("creates plots with backend geometry metrics", async () => {
    const auditLog = new InMemoryAuditLog();
    const app = buildApp({ auditLog });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms/farm-a/plots",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        name: "Plot Kalibrasi",
        adm4_code: "31.71.01.1001",
        geometry: validPolygon
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        id: expect.stringMatching(/^plot-/),
        farm_id: "farm-a",
        name: "Plot Kalibrasi",
        area_m2: expect.any(Number),
        area_ha: expect.any(Number),
        adm4_code: "31.71.01.1001",
        mapping_status: "verified"
      },
      error: null
    });
    expect(response.json().data.area_m2).toBeGreaterThan(1);
    expect(response.json().data.area_ha).toBeCloseTo(response.json().data.area_m2 / 10000, 6);
    expect(auditLog.all().map((event) => event.action)).toContain("plot.created");
  });

  it("rejects invalid plot polygons before persistence", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms/farm-a/plots",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        name: "Plot Bermasalah",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 1],
              [1, 0],
              [0, 1],
              [0, 0]
            ]
          ]
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        fields: [
          {
            path: "geometry",
            message: "/coordinates polygon must not self-intersect"
          }
        ]
      }
    });
  });

  it("requires csrf and write permission for plot mutation routes", async () => {
    const app = buildApp();
    const ownerLogin = await login(app, "farmer-a@example.test", "tenant-a");
    const operatorLogin = await login(app, "operator-a@example.test", "tenant-a");

    const missingCsrf = await app.inject({
      method: "PATCH",
      url: "/api/v1/plots/plot-a/geometry",
      headers: {
        cookie: getCookieHeader(ownerLogin)
      },
      payload: {
        geometry: validPolygon
      }
    });

    expect(missingCsrf.statusCode).toBe(403);
    expect(missingCsrf.json()).toMatchObject({
      error: {
        code: "CSRF_FAILED"
      }
    });

    const readOnlyRole = await app.inject({
      method: "PATCH",
      url: "/api/v1/plots/plot-a/geometry",
      headers: {
        cookie: getCookieHeader(operatorLogin),
        "x-csrf-token": getCsrfToken(operatorLogin)
      },
      payload: {
        geometry: validPolygon
      }
    });

    expect(readOnlyRole.statusCode).toBe(403);
    expect(readOnlyRole.json()).toMatchObject({
      error: {
        code: "FORBIDDEN"
      }
    });
  });

  it("recalculates geometry metrics on plot geometry update", async () => {
    const auditLog = new InMemoryAuditLog();
    const app = buildApp({ auditLog });
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const before = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/plots/plot-a/geometry",
      headers: {
        cookie: getCookieHeader(loginResponse),
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        geometry: largerPolygon
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.area_m2).toBeGreaterThan(before.json().data.area_m2);
    expect(response.json()).toMatchObject({
      data: {
        id: "plot-a",
        geometry: largerPolygon,
        bbox: {
          west: 106.82,
          south: -6.22,
          east: 106.84,
          north: -6.2
        }
      },
      error: null
    });
    expect(auditLog.all().map((event) => event.action)).toContain("plot.geometry_updated");
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
