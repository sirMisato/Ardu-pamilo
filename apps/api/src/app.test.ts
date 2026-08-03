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

  it("returns readiness placeholders for local adapters", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health/ready"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dependencies: {
        mysql: "not_configured_local",
        redis: "not_configured_local",
        telemetry: "in_memory_local",
        victoriametrics: "not_configured_local",
        weather: "in_memory_local"
      }
    });
  });

  it("reports configured external telemetry dependencies for staging adapters", async () => {
    const previousAdapter = process.env.TELEMETRY_STORAGE_ADAPTER;
    const previousRedis = process.env.REDIS_URL;
    const previousVictoriaMetrics = process.env.VICTORIA_METRICS_URL;

    process.env.TELEMETRY_STORAGE_ADAPTER = "redis-victoria-hybrid";
    process.env.REDIS_URL = "redis://redis:6379";
    process.env.VICTORIA_METRICS_URL = "http://victoria-metrics:8428";

    try {
      const app = buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/health/ready"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        dependencies: {
          mysql: "not_configured_local",
          redis: "configured_for_telemetry",
          telemetry: "redis-victoria-hybrid",
          victoriametrics: "configured_for_telemetry",
          weather: "in_memory_local"
        }
      });
    } finally {
      restoreEnv("TELEMETRY_STORAGE_ADAPTER", previousAdapter);
      restoreEnv("REDIS_URL", previousRedis);
      restoreEnv("VICTORIA_METRICS_URL", previousVictoriaMetrics);
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
