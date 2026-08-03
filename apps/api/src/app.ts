import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSecurityHardening, resolveBodyLimitBytes } from "./lib/security-hardening.js";
import { InMemoryAuditLog, type AuditLog } from "./modules/audit/audit-log.js";
import { InMemoryIdentityStore, type IdentityStore } from "./modules/auth/identity-store.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { InMemorySessionStore, type SessionStore } from "./modules/auth/session-store.js";
import { InMemoryDeviceRepository, type DeviceRepository } from "./modules/devices/device-repository.js";
import { registerDeviceRoutes } from "./modules/devices/routes.js";
import { InMemoryFarmRepository, type FarmRepository } from "./modules/farms/farm-repository.js";
import { registerFarmRoutes } from "./modules/farms/routes.js";
import { InMemoryPlotRepository, type PlotRepository } from "./modules/plots/plot-repository.js";
import { registerPlotRoutes } from "./modules/plots/routes.js";
import { RedisVictoriaTelemetryRepository } from "./modules/telemetry/redis-victoria-telemetry-repository.js";
import { InMemoryTelemetryRepository, type TelemetryRepository } from "./modules/telemetry/telemetry-repository.js";
import { registerTelemetryRoutes } from "./modules/telemetry/routes.js";
import { InMemoryWeatherRepository, type WeatherRepository } from "./modules/weather/weather-repository.js";
import { registerWeatherRoutes } from "./modules/weather/routes.js";

export interface HealthPayload {
  status: "ok";
  service: string;
  generated_at: string;
}

export interface AppDependencies {
  auditLog: AuditLog;
  devices: DeviceRepository;
  farms: FarmRepository;
  identityStore: IdentityStore;
  plots: PlotRepository;
  runtimeDependencies: RuntimeDependencyStatuses;
  sessionStore: SessionStore;
  telemetry: TelemetryRepository;
  telemetryStatus: string;
  weather: WeatherRepository;
}

export interface RuntimeDependencyStatuses {
  mysql: string;
  redis: string;
  telemetry: string;
  victoriametrics: string;
  weather: string;
}

function now(): string {
  return new Date().toISOString();
}

export function createAppDependencies(overrides: Partial<AppDependencies> = {}): AppDependencies {
  const defaultTelemetry = createDefaultTelemetryDependency();

  return {
    auditLog: overrides.auditLog ?? new InMemoryAuditLog(),
    devices: overrides.devices ?? new InMemoryDeviceRepository(),
    farms: overrides.farms ?? new InMemoryFarmRepository(),
    identityStore: overrides.identityStore ?? new InMemoryIdentityStore(),
    plots: overrides.plots ?? new InMemoryPlotRepository(),
    runtimeDependencies: overrides.runtimeDependencies ?? {
      mysql: "not_configured_local",
      redis: defaultTelemetry.redis,
      telemetry: overrides.telemetryStatus ?? (overrides.telemetry ? "custom_test" : defaultTelemetry.status),
      victoriametrics: defaultTelemetry.victoriametrics,
      weather: "in_memory_local"
    },
    sessionStore: overrides.sessionStore ?? new InMemorySessionStore(),
    telemetry: overrides.telemetry ?? defaultTelemetry.repository,
    telemetryStatus: overrides.telemetryStatus ?? (overrides.telemetry ? "custom_test" : defaultTelemetry.status),
    weather: overrides.weather ?? new InMemoryWeatherRepository()
  };
}

export function buildApp(overrides: Partial<AppDependencies> = {}): FastifyInstance {
  const deps = createAppDependencies(overrides);
  const app = Fastify({
    bodyLimit: resolveBodyLimitBytes(),
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  registerSecurityHardening(app);

  void app.register(cookie);

  app.get("/health/live", async (): Promise<HealthPayload> => ({
    status: "ok",
    service: "api",
    generated_at: now()
  }));

  app.get("/health/ready", async () => ({
    status: "ok",
    service: "api",
    generated_at: now(),
    dependencies: deps.runtimeDependencies
  }));

  void app.register(async (instance) => {
    await registerAuthRoutes(instance, deps);
    await registerFarmRoutes(instance, deps);
    await registerPlotRoutes(instance, deps);
    await registerDeviceRoutes(instance, deps);
    await registerTelemetryRoutes(instance, deps);
    await registerWeatherRoutes(instance, deps);
  });

  return app;
}

function createDefaultTelemetryDependency(): {
  repository: TelemetryRepository;
  redis: string;
  status: string;
  victoriametrics: string;
} {
  const adapter = process.env.TELEMETRY_STORAGE_ADAPTER?.trim() ?? "";
  const redisUrl = process.env.REDIS_URL?.trim() ?? "";
  const victoriaMetricsUrl = process.env.VICTORIA_METRICS_URL?.trim() ?? "";

  if (adapter === "redis-victoria" || adapter === "redis-victoria-hybrid") {
    if (!redisUrl || !victoriaMetricsUrl) {
      throw new Error("REDIS_URL and VICTORIA_METRICS_URL are required for redis-victoria telemetry storage.");
    }

    const fallback = adapter === "redis-victoria-hybrid" ? new InMemoryTelemetryRepository() : null;

    return {
      repository: new RedisVictoriaTelemetryRepository({
        redisUrl,
        victoriaMetricsUrl,
        fallback
      }),
      redis: "configured_for_telemetry",
      status: adapter,
      victoriametrics: "configured_for_telemetry"
    };
  }

  return {
    repository: new InMemoryTelemetryRepository(),
    redis: "not_configured_local",
    status: "in_memory_local",
    victoriametrics: "not_configured_local"
  };
}
