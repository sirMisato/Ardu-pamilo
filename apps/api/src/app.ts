import Fastify, { type FastifyInstance } from "fastify";

export interface HealthPayload {
  status: "ok";
  service: string;
  generated_at: string;
}

function now(): string {
  return new Date().toISOString();
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

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
      mysql: "not_configured_in_phase_1",
      redis: "not_configured_in_phase_1",
      telemetry: "not_configured_in_phase_1"
    }
  }));

  return app;
}
