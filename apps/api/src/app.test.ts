import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("api health endpoints", () => {
  it("returns liveness status", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health/live"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "api"
    });
  });

  it("returns readiness placeholders for phase 2", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health/ready"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dependencies: {
        mysql: "not_configured_in_phase_2",
        redis: "not_configured_in_phase_2",
        telemetry: "not_configured_in_phase_2"
      }
    });
  });
});
