import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DEMO_TENANT_EMAIL: z.string().email().default("tenant@sedayafarm.local"),
  DEMO_TENANT_ENABLED: z.enum(["true", "false"]).default("false"),
  DEMO_TENANT_ID: z.string().trim().min(1).max(36).default("demo-tenant"),
  DEMO_TENANT_NAME: z.string().trim().min(1).max(160).default("PAMILO Demo Farm"),
  DEMO_TENANT_PASSWORD: z.string().min(8).optional(),
  DEMO_TENANT_RESET_DATA: z.enum(["true", "false"]).default("false"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  LOG_LEVEL: z.string().default("info"),
  MQTT_BROKER_URL: z.string().default("mqtt://127.0.0.1:1883"),
  MQTT_CLIENT_ID: z.string().default("pamilo-api-local"),
  MQTT_INGEST_ENABLED: z.enum(["true", "false"]).default("false"),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_TELEMETRY_TOPIC: z.string().default("pamilo/v1/tenants/+/devices/+/telemetry"),
  MQTT_USERNAME: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD_HASH: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid API environment: ${details}`);
}

export const env = {
  database: {
    ssl: parsedEnv.data.DATABASE_SSL === "true",
    url: parsedEnv.data.DATABASE_URL
  },
  demoTenant: {
    email: parsedEnv.data.DEMO_TENANT_EMAIL,
    enabled: parsedEnv.data.DEMO_TENANT_ENABLED === "true",
    id: parsedEnv.data.DEMO_TENANT_ID,
    name: parsedEnv.data.DEMO_TENANT_NAME,
    password: parsedEnv.data.DEMO_TENANT_PASSWORD,
    resetData: parsedEnv.data.DEMO_TENANT_RESET_DATA === "true"
  },
  frontendOrigin: parsedEnv.data.FRONTEND_ORIGIN,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  logLevel: parsedEnv.data.LOG_LEVEL,
  mqtt: {
    brokerUrl: parsedEnv.data.MQTT_BROKER_URL,
    clientId: parsedEnv.data.MQTT_CLIENT_ID,
    enabled: parsedEnv.data.MQTT_INGEST_ENABLED === "true",
    password: parsedEnv.data.MQTT_PASSWORD || undefined,
    telemetryTopic: parsedEnv.data.MQTT_TELEMETRY_TOPIC,
    username: parsedEnv.data.MQTT_USERNAME || undefined
  },
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  superAdmin: {
    email: parsedEnv.data.SUPER_ADMIN_EMAIL || undefined,
    passwordHash: parsedEnv.data.SUPER_ADMIN_PASSWORD_HASH || undefined
  }
} as const;
