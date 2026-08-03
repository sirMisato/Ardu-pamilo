import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { requireTenantContext } from "@pamilo/shared";
import { buildApp } from "../../app.js";
import { InMemoryPlotRepository } from "./plot-repository.js";

const demoPassword = "local-demo-password";

describe("tenant isolation", () => {
  it("allows a tenant user to read their own plot", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-a",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: "plot-a",
        name: "Plot Tenant A"
      },
      error: null
    });
  });

  it("hides another tenant's plot behind a not found response", async () => {
    const app = buildApp();
    const loginResponse = await login(app, "farmer-a@example.test", "tenant-a");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/plots/plot-b",
      headers: {
        cookie: getCookieHeader(loginResponse)
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      data: null,
      error: {
        code: "NOT_FOUND"
      }
    });
  });

  it("rejects tenant-owned repository calls without TenantContext", () => {
    const repository = new InMemoryPlotRepository();

    expect(() =>
      repository.findByIdForTenant(
        requireTenantContext(null),
        "plot-a"
      )
    ).toThrow("TenantContext is required");
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
