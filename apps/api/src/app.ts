import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
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
  sessionStore: SessionStore;
  telemetry: TelemetryRepository;
  weather: WeatherRepository;
}

function now(): string {
  return new Date().toISOString();
}

export function createAppDependencies(overrides: Partial<AppDependencies> = {}): AppDependencies {
  return {
    auditLog: overrides.auditLog ?? new InMemoryAuditLog(),
    devices: overrides.devices ?? new InMemoryDeviceRepository(),
    farms: overrides.farms ?? new InMemoryFarmRepository(),
    identityStore: overrides.identityStore ?? new InMemoryIdentityStore(),
    plots: overrides.plots ?? new InMemoryPlotRepository(),
    sessionStore: overrides.sessionStore ?? new InMemorySessionStore(),
    telemetry: overrides.telemetry ?? new InMemoryTelemetryRepository(),
    weather: overrides.weather ?? new InMemoryWeatherRepository()
  };
}

export function buildApp(overrides: Partial<AppDependencies> = {}): FastifyInstance {
  const deps = createAppDependencies(overrides);
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

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
    dependencies: {
      mysql: "not_configured_local",
      redis: "not_configured_local",
      telemetry: "in_memory_local",
      weather: "in_memory_local"
    }
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
