import "dotenv/config";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional()
);
const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional()
);
const aiProviderSchema = z.enum(["custom", "openai", "sumopod", "tencent"]);
const aiProviderDefaults: Record<z.infer<typeof aiProviderSchema>, { baseUrl: string | null; model: string | null }> = {
  custom: {
    baseUrl: null,
    model: null
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5-nano"
  },
  sumopod: {
    baseUrl: "https://ai.sumopod.com",
    model: "gpt-5-nano"
  },
  tencent: {
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    model: "hy3"
  }
};

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
  AI_RECOMMENDATION_API_KEY: optionalTrimmedString,
  AI_RECOMMENDATION_BASE_URL: optionalUrl,
  AI_RECOMMENDATION_MAX_TOKENS: z.coerce.number().int().positive().max(4000).default(3200),
  AI_RECOMMENDATION_MODEL: optionalTrimmedString,
  AI_RECOMMENDATION_OPENAI_API_KEY: optionalTrimmedString,
  AI_RECOMMENDATION_PROVIDER: aiProviderSchema.default("sumopod"),
  AI_RECOMMENDATION_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.35),
  AI_RECOMMENDATION_TENCENT_API_KEY: optionalTrimmedString,
  AI_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(180_000).default(90_000),
  HUNYUAN_API_KEY: optionalTrimmedString,
  MQTT_BROKER_URL: z.string().default("mqtt://127.0.0.1:1883"),
  MQTT_CLIENT_ID: z.string().default("pamilo-api-local"),
  MQTT_INGEST_ENABLED: z.enum(["true", "false"]).default("false"),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_TELEMETRY_TOPIC: z.string().default("pamilo/v1/tenants/+/devices/+/telemetry"),
  MQTT_USERNAME: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  OPENAI_API_KEY: optionalTrimmedString,
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD_HASH: z.string().optional(),
  TENCENT_API_KEY: optionalTrimmedString,
  WEB_PUSH_CONTACT: z.string().default("mailto:admin@pamilo.local"),
  WEB_PUSH_PRIVATE_KEY: optionalTrimmedString,
  WEB_PUSH_PUBLIC_KEY: optionalTrimmedString
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid API environment: ${details}`);
}

const aiProvider = parsedEnv.data.AI_RECOMMENDATION_PROVIDER;
const aiProviderDefault = aiProviderDefaults[aiProvider];
const aiBaseUrl = (parsedEnv.data.AI_RECOMMENDATION_BASE_URL ?? aiProviderDefault.baseUrl)?.replace(/\/+$/, "");
const aiModel = parsedEnv.data.AI_RECOMMENDATION_MODEL ?? aiProviderDefault.model;

if (!aiBaseUrl || !aiModel) {
  throw new Error("Invalid API environment: AI_RECOMMENDATION_BASE_URL and AI_RECOMMENDATION_MODEL are required when AI_RECOMMENDATION_PROVIDER=custom");
}

const providerApiKey = aiProvider === "openai"
  ? parsedEnv.data.AI_RECOMMENDATION_OPENAI_API_KEY ?? parsedEnv.data.OPENAI_API_KEY
  : aiProvider === "tencent"
    ? parsedEnv.data.AI_RECOMMENDATION_TENCENT_API_KEY ?? parsedEnv.data.HUNYUAN_API_KEY ?? parsedEnv.data.TENCENT_API_KEY
    : undefined;

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
  aiRecommendation: {
    apiKey: providerApiKey ?? parsedEnv.data.AI_RECOMMENDATION_API_KEY,
    baseUrl: aiBaseUrl,
    maxTokens: parsedEnv.data.AI_RECOMMENDATION_MAX_TOKENS,
    model: aiModel,
    provider: aiProvider,
    temperature: parsedEnv.data.AI_RECOMMENDATION_TEMPERATURE,
    timeoutMs: parsedEnv.data.AI_RECOMMENDATION_TIMEOUT_MS
  },
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
  },
  webPush: {
    contact: parsedEnv.data.WEB_PUSH_CONTACT,
    privateKey: parsedEnv.data.WEB_PUSH_PRIVATE_KEY,
    publicKey: parsedEnv.data.WEB_PUSH_PUBLIC_KEY
  }
} as const;
