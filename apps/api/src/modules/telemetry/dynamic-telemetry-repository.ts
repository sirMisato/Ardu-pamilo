import { randomUUID } from "node:crypto";
import {
  inferTelemetryValueType,
  type TelemetryValueType
} from "@pamilo/shared";
import type { TelemetryInputReading, TelemetryValue } from "./telemetry-repository.js";

export interface DynamicTelemetryStoredReading {
  id: string;
  tenantId: string;
  plotId: string;
  deviceId: string;
  nodeId: string;
  metric: string;
  label: string | null;
  ts: string;
  seq: number;
  value: TelemetryValue;
  valueType: TelemetryValueType;
  unit: string;
  qualityFlags: string[];
  rawPayloadHash: string;
  receivedAt: string;
}

export interface DynamicTelemetryMetricCatalogRecord {
  tenantId: string;
  deviceId: string;
  nodeId: string;
  metric: string;
  label: string | null;
  unit: string;
  valueType: TelemetryValueType;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface DynamicTelemetryRepository {
  storeForPlot(input: {
    tenantId: string;
    plotId: string;
    deviceId: string;
    readings: TelemetryInputReading[];
    rawPayloadHash: string;
    receivedAt: string;
  }): Promise<DynamicTelemetryStoredReading[]>;
  listCatalogForDevice(tenantId: string, deviceId: string): Promise<DynamicTelemetryMetricCatalogRecord[]>;
}

export class InMemoryDynamicTelemetryRepository implements DynamicTelemetryRepository {
  readonly #readings: DynamicTelemetryStoredReading[] = [];
  readonly #catalog = new Map<string, DynamicTelemetryMetricCatalogRecord>();

  async storeForPlot(input: {
    tenantId: string;
    plotId: string;
    deviceId: string;
    readings: TelemetryInputReading[];
    rawPayloadHash: string;
    receivedAt: string;
  }): Promise<DynamicTelemetryStoredReading[]> {
    const records = input.readings.map((reading) => {
      const valueType = reading.valueType ?? inferTelemetryValueType(reading.value);
      const record: DynamicTelemetryStoredReading = {
        id: `dynamic-telemetry-${randomUUID()}`,
        tenantId: input.tenantId,
        plotId: input.plotId,
        deviceId: input.deviceId,
        nodeId: reading.nodeId,
        metric: reading.metric,
        label: reading.label ?? null,
        ts: reading.ts,
        seq: reading.seq,
        value: reading.value,
        valueType,
        unit: reading.unit,
        qualityFlags: [...reading.qualityFlags],
        rawPayloadHash: input.rawPayloadHash,
        receivedAt: input.receivedAt
      };

      this.upsertCatalog(record);
      return record;
    });

    this.#readings.push(...records);
    return records;
  }

  async listCatalogForDevice(tenantId: string, deviceId: string): Promise<DynamicTelemetryMetricCatalogRecord[]> {
    return [...this.#catalog.values()]
      .filter((record) => record.tenantId === tenantId && record.deviceId === deviceId)
      .sort((left, right) => left.metric.localeCompare(right.metric));
  }

  private upsertCatalog(reading: DynamicTelemetryStoredReading): void {
    const key = `${reading.tenantId}/${reading.deviceId}/${reading.nodeId}/${reading.metric}`;
    const existing = this.#catalog.get(key);

    if (!existing) {
      this.#catalog.set(key, {
        tenantId: reading.tenantId,
        deviceId: reading.deviceId,
        nodeId: reading.nodeId,
        metric: reading.metric,
        label: reading.label,
        unit: reading.unit,
        valueType: reading.valueType,
        firstSeenAt: reading.receivedAt,
        lastSeenAt: reading.receivedAt
      });
      return;
    }

    this.#catalog.set(key, {
      ...existing,
      label: reading.label ?? existing.label,
      unit: reading.unit || existing.unit,
      valueType: reading.valueType,
      lastSeenAt: reading.receivedAt
    });
  }
}
