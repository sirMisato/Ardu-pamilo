import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import { InMemoryAuditLog, type AuditLog } from "./modules/audit/audit-log.js";
import { InMemoryIdentityStore, type IdentityStore } from "./modules/auth/identity-store.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { InMemorySessionStore, type SessionStore } from "./modules/auth/session-store.js";
import { InMemoryPlotRepository, type PlotRepository } from "./modules/plots/plot-repository.js";
import { registerPlotRoutes } from "./modules/plots/routes.js";

export interface HealthPayload {
  status: "ok";
  service: string;
  generated_at: string;
}

export interface AppDependencies {
  auditLog: AuditLog;
  identityStore: IdentityStore;
  plots: PlotRepository;
  sessionStore: SessionStore;
}

function now(): string {
  return new Date().toISOString();
}

export function createAppDependencies(overrides: Partial<AppDependencies> = {}): AppDependencies {
  return {
    auditLog: overrides.auditLog ?? new InMemoryAuditLog(),
    identityStore: overrides.identityStore ?? new InMemoryIdentityStore(),
    plots: overrides.plots ?? new InMemoryPlotRepository(),
    sessionStore: overrides.sessionStore ?? new InMemorySessionStore()
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
      mysql: "not_configured_in_phase_2",
      redis: "not_configured_in_phase_2",
      telemetry: "not_configured_in_phase_2"
    }
  }));

  void app.register(async (instance) => {
    await registerAuthRoutes(instance, deps);
    await registerPlotRoutes(instance, deps);
  });

  return app;
}
