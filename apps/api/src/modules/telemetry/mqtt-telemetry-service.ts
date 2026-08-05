import { createHash } from "node:crypto";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import type { TenantContext } from "@pamilo/shared";
import type { DeviceRepository } from "../devices/device-repository.js";
import { parseDynamicTelemetryMessage } from "./dynamic-telemetry.js";
import type { DynamicTelemetryRepository } from "./dynamic-telemetry-repository.js";
import type { TelemetryRepository } from "./telemetry-repository.js";

export interface MqttTelemetryLogger {
  info(value: unknown, message?: string): void;
  warn(value: unknown, message?: string): void;
  error(value: unknown, message?: string): void;
}

export interface MqttTelemetryService {
  start(): void;
  stop(): Promise<void>;
  status(): string;
}

export interface MqttTelemetryServiceOptions {
  mqttUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
  subscriptionTopic?: string;
  devices: DeviceRepository;
  telemetry: TelemetryRepository;
  dynamicTelemetry: DynamicTelemetryRepository;
  logger: MqttTelemetryLogger;
}

const defaultSubscriptionTopic = "pamilo/v1/tenants/+/devices/+/telemetry";

export function createMqttTelemetryService(options: MqttTelemetryServiceOptions): MqttTelemetryService {
  return new DefaultMqttTelemetryService(options);
}

export function createMqttTelemetryServiceFromEnv(options: {
  devices: DeviceRepository;
  telemetry: TelemetryRepository;
  dynamicTelemetry: DynamicTelemetryRepository;
  logger: MqttTelemetryLogger;
  env?: NodeJS.ProcessEnv;
}): {
  service: MqttTelemetryService | null;
  status: string;
} {
  const env = options.env ?? process.env;
  const enabled = env.API_MQTT_LISTENER_ENABLED === "true" || env.PAMILO_API_MQTT_LISTENER_ENABLED === "true";

  if (!enabled) {
    return {
      service: null,
      status: "disabled"
    };
  }

  const mqttUrl = env.API_MQTT_URL?.trim() || env.MQTT_URL?.trim();
  if (!mqttUrl) {
    throw new Error("API_MQTT_URL or MQTT_URL is required when API_MQTT_LISTENER_ENABLED=true.");
  }

  if (env.NODE_ENV === "production" && !mqttUrl.startsWith("mqtts://")) {
    throw new Error("Production API MQTT listener requires an mqtts:// broker URL.");
  }

  return {
    service: createMqttTelemetryService({
      mqttUrl,
      username: env.API_MQTT_USERNAME?.trim() || env.MQTT_USERNAME?.trim(),
      password: env.API_MQTT_PASSWORD ?? env.MQTT_PASSWORD,
      clientId: env.API_MQTT_CLIENT_ID?.trim() || "pamilo-api-telemetry-listener",
      subscriptionTopic: env.API_MQTT_SUBSCRIPTION_TOPIC?.trim() || defaultSubscriptionTopic,
      devices: options.devices,
      telemetry: options.telemetry,
      dynamicTelemetry: options.dynamicTelemetry,
      logger: options.logger
    }),
    status: "configured"
  };
}

class DefaultMqttTelemetryService implements MqttTelemetryService {
  readonly #mqttUrl: string;
  readonly #mqttOptions: IClientOptions;
  readonly #subscriptionTopic: string;
  readonly #devices: DeviceRepository;
  readonly #telemetry: TelemetryRepository;
  readonly #dynamicTelemetry: DynamicTelemetryRepository;
  readonly #logger: MqttTelemetryLogger;
  #client: MqttClient | null = null;
  #status = "stopped";

  constructor(options: MqttTelemetryServiceOptions) {
    this.#mqttUrl = options.mqttUrl;
    this.#mqttOptions = {
      clientId: options.clientId ?? "pamilo-api-telemetry-listener",
      clean: true,
      connectTimeout: 10_000,
      reconnectPeriod: 5_000,
      username: options.username,
      password: options.password
    };
    this.#subscriptionTopic = options.subscriptionTopic ?? defaultSubscriptionTopic;
    this.#devices = options.devices;
    this.#telemetry = options.telemetry;
    this.#dynamicTelemetry = options.dynamicTelemetry;
    this.#logger = options.logger;
  }

  start(): void {
    if (this.#client) {
      return;
    }

    this.#status = "connecting";
    const client = mqtt.connect(this.#mqttUrl, this.#mqttOptions);
    this.#client = client;

    client.on("connect", () => {
      this.#status = "connected";
      client.subscribe(this.#subscriptionTopic, {
        qos: 1
      }, (error) => {
        if (error) {
          this.#status = "subscription_failed";
          this.#logger.error({
            error: error.message,
            topic: this.#subscriptionTopic
          }, "Failed to subscribe API MQTT telemetry listener.");
          return;
        }

        this.#logger.info({
          topic: this.#subscriptionTopic
        }, "API MQTT telemetry listener subscribed.");
      });
    });

    client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload);
    });

    client.on("error", (error) => {
      this.#status = "error";
      this.#logger.error({
        error: error.message
      }, "API MQTT telemetry listener error.");
    });

    client.on("close", () => {
      this.#status = "closed";
    });
  }

  async stop(): Promise<void> {
    const client = this.#client;
    this.#client = null;

    if (!client) {
      this.#status = "stopped";
      return;
    }

    await new Promise<void>((resolve) => {
      client.end(false, {}, () => {
        this.#status = "stopped";
        resolve();
      });
    });
  }

  status(): string {
    return this.#status;
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    const receivedAt = new Date();
    const parsed = parseDynamicTelemetryMessage(topic, payload, receivedAt);

    if (!parsed.ok) {
      this.#logger.warn({
        topic,
        reason: parsed.reason,
        errors: parsed.errors
      }, "Rejected MQTT telemetry message.");
      return;
    }

    const binding = this.#devices.resolveTelemetryBinding(parsed.tenantId, parsed.deviceId);
    if (!binding) {
      this.#logger.warn({
        tenant_id: parsed.tenantId,
        device_id: parsed.deviceId
      }, "Rejected MQTT telemetry for unknown or revoked device.");
      return;
    }

    const tenantContext: TenantContext = {
      tenantId: parsed.tenantId,
      userId: "mqtt-telemetry-listener",
      role: "platform_admin"
    };
    const rawPayloadHash = createHash("sha256").update(payload).digest("hex");

    await this.#dynamicTelemetry.storeForPlot({
      tenantId: parsed.tenantId,
      plotId: binding.plotId,
      deviceId: parsed.deviceId,
      readings: parsed.readings,
      rawPayloadHash,
      receivedAt: receivedAt.toISOString()
    });
    await this.#telemetry.recordForPlot(tenantContext, binding.plotId, parsed.readings);
    this.#devices.markSeenFromTelemetry(parsed.tenantId, parsed.deviceId, parsed.ts);

    this.#logger.info({
      tenant_id: parsed.tenantId,
      plot_id: binding.plotId,
      device_id: parsed.deviceId,
      readings: parsed.readings.length
    }, "Stored MQTT telemetry message.");
  }
}
