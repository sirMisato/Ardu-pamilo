import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  buildDeviceMqttAccess,
  requireTenantContext,
  type DeviceMqttAccess,
  type TenantContext
} from "@pamilo/shared";

export type DeviceStatus = "provisioned" | "active" | "revoked";

export interface DeviceRecord {
  id: string;
  tenantId: string;
  plotId: string;
  serialNo: string;
  label: string | null;
  clientId: string;
  mqttUsername: string;
  credentialRef: string;
  credentialHash: string;
  credentialFingerprint: string;
  status: DeviceStatus;
  provisionedAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface DeviceProvisioningResult {
  device: DeviceRecord;
  access: DeviceMqttAccess;
  credential: {
    password: string;
    fingerprint: string;
    shownOnce: true;
  };
}

export interface DeviceUpdateInput {
  label?: string | null;
  plotId?: string;
}

export interface DeviceTelemetryBinding {
  id: string;
  tenantId: string;
  plotId: string;
  status: DeviceStatus;
}

export interface DeviceRepository {
  listForTenant(context: TenantContext): DeviceRecord[];
  listForPlot(context: TenantContext, plotId: string): DeviceRecord[];
  findByIdForTenant(context: TenantContext, deviceId: string): DeviceRecord | null;
  provisionForPlot(context: TenantContext, input: {
    plotId: string;
    serialNo: string;
    label?: string | null;
  }): DeviceProvisioningResult;
  updateForTenant(context: TenantContext, deviceId: string, input: DeviceUpdateInput): DeviceRecord | null;
  revokeForTenant(context: TenantContext, deviceId: string): DeviceRecord | null;
  deleteForTenant(context: TenantContext, deviceId: string): DeviceRecord | null;
  resolveTelemetryBinding(tenantId: string, deviceId: string): DeviceTelemetryBinding | null;
  markSeenFromTelemetry(tenantId: string, deviceId: string, seenAt: string): DeviceRecord | null;
}

export class DuplicateDeviceSerialError extends Error {
  constructor(serialNo: string) {
    super(`Active device with serial number ${serialNo} already exists in this tenant.`);
    this.name = "DuplicateDeviceSerialError";
  }
}

export class InMemoryDeviceRepository implements DeviceRepository {
  readonly #devices: DeviceRecord[];

  constructor(devices: DeviceRecord[] = []) {
    this.#devices = [...devices];
  }

  listForTenant(context: TenantContext): DeviceRecord[] {
    const tenantContext = requireTenantContext(context);
    return this.#devices.filter((device) => device.tenantId === tenantContext.tenantId);
  }

  listForPlot(context: TenantContext, plotId: string): DeviceRecord[] {
    const tenantContext = requireTenantContext(context);
    return this.#devices.filter((device) => device.tenantId === tenantContext.tenantId && device.plotId === plotId);
  }

  findByIdForTenant(context: TenantContext, deviceId: string): DeviceRecord | null {
    const tenantContext = requireTenantContext(context);
    return this.#devices.find((device) => device.id === deviceId && device.tenantId === tenantContext.tenantId) ?? null;
  }

  provisionForPlot(context: TenantContext, input: {
    plotId: string;
    serialNo: string;
    label?: string | null;
  }): DeviceProvisioningResult {
    const tenantContext = requireTenantContext(context);

    if (this.hasActiveSerial(tenantContext, input.serialNo)) {
      throw new DuplicateDeviceSerialError(input.serialNo);
    }

    const deviceId = `device-${randomUUID()}`;
    const access = buildDeviceMqttAccess({
      tenantId: tenantContext.tenantId,
      deviceId
    });
    const password = generateDevicePassword();
    const credentialHash = hashCredential(password);
    const now = new Date().toISOString();
    const device: DeviceRecord = {
      id: deviceId,
      tenantId: tenantContext.tenantId,
      plotId: input.plotId,
      serialNo: input.serialNo,
      label: input.label ?? null,
      clientId: access.clientId,
      mqttUsername: access.username,
      credentialRef: `mqtt:${deviceId}:v1`,
      credentialHash,
      credentialFingerprint: credentialHash.slice(0, 16),
      status: "provisioned",
      provisionedAt: now,
      lastSeenAt: null,
      revokedAt: null
    };

    this.#devices.push(device);

    return {
      device,
      access,
      credential: {
        password,
        fingerprint: device.credentialFingerprint,
        shownOnce: true
      }
    };
  }

  updateForTenant(context: TenantContext, deviceId: string, input: DeviceUpdateInput): DeviceRecord | null {
    const tenantContext = requireTenantContext(context);
    const index = this.#devices.findIndex((device) => device.id === deviceId && device.tenantId === tenantContext.tenantId);

    if (index < 0) {
      return null;
    }

    const existing = this.#devices[index];
    if (!existing) {
      return null;
    }

    const updated: DeviceRecord = {
      ...existing,
      label: input.label === undefined ? existing.label : input.label,
      plotId: input.plotId ?? existing.plotId
    };

    this.#devices[index] = updated;
    return updated;
  }

  revokeForTenant(context: TenantContext, deviceId: string): DeviceRecord | null {
    const tenantContext = requireTenantContext(context);
    const index = this.#devices.findIndex((device) => device.id === deviceId && device.tenantId === tenantContext.tenantId);

    if (index < 0) {
      return null;
    }

    const existing = this.#devices[index];
    if (!existing) {
      return null;
    }

    const updated: DeviceRecord = {
      ...existing,
      status: "revoked",
      revokedAt: new Date().toISOString()
    };

    this.#devices[index] = updated;
    return updated;
  }

  deleteForTenant(context: TenantContext, deviceId: string): DeviceRecord | null {
    return this.revokeForTenant(context, deviceId);
  }

  resolveTelemetryBinding(tenantId: string, deviceId: string): DeviceTelemetryBinding | null {
    const device = this.#devices.find((candidate) =>
      candidate.tenantId === tenantId
      && candidate.id === deviceId
      && candidate.status !== "revoked"
    );

    if (!device) {
      return null;
    }

    return {
      id: device.id,
      tenantId: device.tenantId,
      plotId: device.plotId,
      status: device.status
    };
  }

  markSeenFromTelemetry(tenantId: string, deviceId: string, seenAt: string): DeviceRecord | null {
    const index = this.#devices.findIndex((candidate) =>
      candidate.tenantId === tenantId
      && candidate.id === deviceId
      && candidate.status !== "revoked"
    );

    if (index < 0) {
      return null;
    }

    const existing = this.#devices[index];
    if (!existing) {
      return null;
    }

    const updated: DeviceRecord = {
      ...existing,
      status: "active",
      lastSeenAt: seenAt
    };

    this.#devices[index] = updated;
    return updated;
  }

  private hasActiveSerial(context: TenantContext, serialNo: string): boolean {
    const normalizedSerial = serialNo.toLowerCase();
    return this.#devices.some((device) =>
      device.tenantId === context.tenantId
      && device.status !== "revoked"
      && device.serialNo.toLowerCase() === normalizedSerial
    );
  }
}

function generateDevicePassword(): string {
  return `pamilo_${randomBytes(24).toString("base64url")}`;
}

function hashCredential(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
