import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import { env } from "./config/env.js";
import { closeDatabase, db } from "./db/client.js";
import { requireTenantContext, verifyTenant } from "./middleware/verifyTenant.js";
import { cropRoutes } from "./routes/cropRoutes.js";
import { deviceRoutes } from "./routes/deviceRoutes.js";
import { telemetryRoutes } from "./routes/telemetryRoutes.js";
import { startMqttTelemetryService, type MqttTelemetryService } from "./services/mqttService.js";

interface LoginBody {
  emailOrUsername: string;
  password: string;
  tenantId?: string;
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.logLevel
    }
  });

  await app.register(cors, {
    credentials: true,
    origin: [env.frontendOrigin]
  });

  await app.register(jwt, {
    secret: env.jwtSecret
  });

  app.decorateRequest("tenant", null);

  app.get("/health", async () => ({
    ok: true,
    service: "pamilo-api",
    time: new Date().toISOString()
  }));

  app.post<{ Body: LoginBody }>("/api/v1/auth/login", async (request, reply) => {
    if (env.nodeEnv === "production") {
      return reply.code(501).send({
        error: "Not implemented",
        message: "Production login must validate password_hash from tenants before issuing JWTs."
      });
    }

    const tenantId = request.body.tenantId?.trim() || "mock-tenant";
    const token = app.jwt.sign(
      {
        role: "tenant_admin",
        sub: request.body.emailOrUsername,
        tenant_id: tenantId
      },
      {
        expiresIn: "8h"
      }
    );

    return {
      accessToken: token,
      tenant: {
        id: tenantId,
        role: "tenant_admin"
      }
    };
  });

  app.register(async (tenantRoutes) => {
    tenantRoutes.addHook("preHandler", verifyTenant);

    tenantRoutes.get("/me", async (request) => {
      const tenant = requireTenantContext(request);

      return {
        tenant
      };
    });

    tenantRoutes.get("/plots", async (request) => {
      const tenant = requireTenantContext(request);

      return db
        .selectFrom("plots")
        .selectAll()
        .where("tenant_id", "=", tenant.tenantId)
        .orderBy("created_at", "desc")
        .execute();
    });

  }, {
    prefix: "/api/v1"
  });

  await app.register(deviceRoutes, {
    prefix: "/api/v1"
  });
  await app.register(cropRoutes, {
    prefix: "/api/v1"
  });
  await app.register(telemetryRoutes, {
    prefix: "/api/v1"
  });

  let mqttService: MqttTelemetryService | null = null;

  if (env.mqtt.enabled) {
    mqttService = startMqttTelemetryService({
      brokerUrl: env.mqtt.brokerUrl,
      clientId: env.mqtt.clientId,
      db,
      logger: app.log,
      password: env.mqtt.password,
      telemetryTopic: env.mqtt.telemetryTopic,
      username: env.mqtt.username
    });
  } else {
    app.log.info("MQTT ingestion is disabled. Set MQTT_INGEST_ENABLED=true to start the ingestor.");
  }

  app.addHook("onClose", async () => {
    await mqttService?.stop();
    await closeDatabase();
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const app = await buildServer();

  await app.listen({
    host: "0.0.0.0",
    port: env.port
  });
}
