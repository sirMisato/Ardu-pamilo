import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { closeDatabase, db } from "./db/client.js";
import { requireTenantContext, verifyTenant } from "./middleware/verifyTenant.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { aiRecommendationRoutes } from "./routes/aiRecommendationRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { cropRoutes } from "./routes/cropRoutes.js";
import { deviceRoutes } from "./routes/deviceRoutes.js";
import { plotRoutes } from "./routes/plotRoutes.js";
import { settingsRoutes } from "./routes/settingsRoutes.js";
import { telemetryRoutes } from "./routes/telemetryRoutes.js";
import { tenantUserRoutes } from "./routes/tenantUserRoutes.js";
import { weatherRoutes } from "./routes/weatherRoutes.js";
import { startMqttTelemetryService, type MqttTelemetryService } from "./services/mqttService.js";

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

  app.get("/api/health", async () => ({
    ok: true,
    service: "pamilo-api",
    time: new Date().toISOString()
  }));

  await app.register(authRoutes);
  await app.register(adminRoutes, {
    prefix: "/api/admin"
  });

  app.register(async (tenantRoutes) => {
    tenantRoutes.addHook("preHandler", verifyTenant);

    tenantRoutes.get("/me", async (request) => {
      const tenant = requireTenantContext(request);

      return {
        tenant
      };
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
  await app.register(plotRoutes, {
    prefix: "/api/v1"
  });
  await app.register(telemetryRoutes, {
    prefix: "/api/v1"
  });
  await app.register(settingsRoutes, {
    prefix: "/api/v1"
  });
  await app.register(tenantUserRoutes, {
    prefix: "/api/v1"
  });
  await app.register(aiRecommendationRoutes, {
    prefix: "/api/v1"
  });
  await app.register(weatherRoutes, {
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

const isMainModule = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isMainModule) {
  const app = await buildServer();

  await app.listen({
    host: "0.0.0.0",
    port: env.port
  });
}
