import type { LightMyRequestResponse } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const demoPassword = "local-demo-password";

describe("api security hardening", () => {
  it("sets baseline security headers and request id", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health/live"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(response.headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(response.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  });

  it("returns a standard envelope for unknown routes", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/missing"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      data: null,
      error: {
        code: "NOT_FOUND",
        message: "Route was not found."
      }
    });
  });

  it("redacts unhandled error details from responses", async () => {
    const app = buildApp();
    app.get("/api/v1/crash-test", async () => {
      throw new Error("internal-db implementation detail");
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/crash-test"
    });
    const body = response.body;

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      data: null,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred."
      }
    });
    expect(body).not.toContain("internal-db");
    expect(body).not.toContain("stack");
  });

  it("rejects oversized JSON payloads with a safe envelope", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: `${"a".repeat(300 * 1024)}@example.test`,
        password: demoPassword
      }
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({
      data: null,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request payload is too large."
      }
    });
  });

  it("rejects valid csrf tokens from untrusted origins", async () => {
    const app = buildApp();
    const loginResponse = await login(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms",
      headers: {
        cookie: getCookieHeader(loginResponse),
        host: "localhost:3000",
        origin: "https://evil.example",
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        name: "Blocked Cross Origin",
        timezone: "Asia/Jakarta"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: "CSRF_FAILED"
      }
    });
  });

  it("allows the local Vite dev origin for csrf-protected routes", async () => {
    const app = buildApp();
    const loginResponse = await login(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/farms",
      headers: {
        cookie: getCookieHeader(loginResponse),
        host: "localhost:3000",
        origin: "http://localhost:5173",
        "x-csrf-token": getCsrfToken(loginResponse)
      },
      payload: {
        name: "Allowed Dev Origin",
        timezone: "Asia/Jakarta"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        name: "Allowed Dev Origin"
      },
      error: null
    });
  });
});

async function login(app: ReturnType<typeof buildApp>): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: "farmer-a@example.test",
      password: demoPassword,
      tenant_id: "tenant-a"
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
