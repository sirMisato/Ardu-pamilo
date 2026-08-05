import { randomUUID } from "node:crypto";
import {
  inferTelemetryValueType,
  requireTenantContext,
  type NormalizedSensorReading,
  type TelemetryValueType,
  type TenantContext
} from "@pamilo/shared";

export type TelemetryValue = number | string | boolean | null;

export interface TelemetryInputReading {
  deviceId: string;
  nodeId: string;
  metric: string;
  sensorKey?: string;
  label?: string | null;
  ts: string;
  seq: number;
  value: TelemetryValue;
  unit: string;
  calibrationProfile: string;
  qualityFlags: string[];
  valueType?: TelemetryValueType;
}

export interface TelemetryReadingRecord {
  id: string;
  tenantId: string;
  plotId: string;
  deviceId: string;
  nodeId: string;
  metric: string;
  ts: string;
  seq: number;
  value: TelemetryValue;
  valueType: TelemetryValueType;
  unit: string;
  calibrationProfile: string;
  qualityFlags: string[];
}

export interface TelemetryHistoryQuery {
  plotId: string;
  metric: string;
  from: string;
  to: string;
  resolution: string;
}

export interface TelemetryRepository {
  listLatestForPlot(context: TenantContext, plotId: string): Promise<TelemetryReadingRecord[]>;
  queryHistoryForPlot(context: TenantContext, query: TelemetryHistoryQuery): Promise<TelemetryReadingRecord[]>;
  recordForPlot(context: TenantContext, plotId: string, readings: TelemetryInputReading[] | NormalizedSensorReading[]): Promise<TelemetryReadingRecord[]>;
}

export class InMemoryTelemetryRepository implements TelemetryRepository {
  readonly #readings: TelemetryReadingRecord[];

  constructor(readings: TelemetryReadingRecord[] = defaultTelemetryReadings()) {
    this.#readings = [...readings];
  }

  async listLatestForPlot(context: TenantContext, plotId: string): Promise<TelemetryReadingRecord[]> {
    const tenantContext = requireTenantContext(context);
    const latestByMetric = new Map<string, TelemetryReadingRecord>();

    for (const reading of this.#readings) {
      if (reading.tenantId !== tenantContext.tenantId || reading.plotId !== plotId) {
        continue;
      }

      const current = latestByMetric.get(reading.metric);
      if (!current || compareReadingTime(reading, current) > 0) {
        latestByMetric.set(reading.metric, reading);
      }
    }

    return [...latestByMetric.values()].sort((left, right) => left.metric.localeCompare(right.metric));
  }

  async queryHistoryForPlot(context: TenantContext, query: TelemetryHistoryQuery): Promise<TelemetryReadingRecord[]> {
    const tenantContext = requireTenantContext(context);
    const fromTime = Date.parse(query.from);
    const toTime = Date.parse(query.to);

    return this.#readings
      .filter((reading) =>
        reading.tenantId === tenantContext.tenantId
        && reading.plotId === query.plotId
        && reading.metric === query.metric
        && Date.parse(reading.ts) >= fromTime
        && Date.parse(reading.ts) <= toTime
      )
      .sort(compareReadingTime);
  }

  async recordForPlot(
    context: TenantContext,
    plotId: string,
    readings: TelemetryInputReading[] | NormalizedSensorReading[]
  ): Promise<TelemetryReadingRecord[]> {
    const tenantContext = requireTenantContext(context);
    const records = readings.map((reading) => ({
      id: `telemetry-${randomUUID()}`,
      tenantId: tenantContext.tenantId,
      plotId,
      deviceId: reading.deviceId,
      nodeId: reading.nodeId,
      metric: reading.metric,
      ts: reading.ts,
      seq: reading.seq,
      value: reading.value,
      valueType: "valueType" in reading && reading.valueType
        ? reading.valueType
        : inferTelemetryValueType(reading.value),
      unit: reading.unit,
      calibrationProfile: reading.calibrationProfile,
      qualityFlags: [...reading.qualityFlags]
    }));

    this.#readings.push(...records);
    return records;
  }
}

export function defaultTelemetryReadings(): TelemetryReadingRecord[] {
  return [
    {
      id: "telemetry-a-1",
      tenantId: "tenant-a",
      plotId: "plot-a",
      deviceId: "device-a",
      nodeId: "soil-01",
      metric: "soil_temperature",
      ts: "2026-08-03T03:00:00Z",
      seq: 10,
      value: 27.1,
      valueType: "number",
      unit: "deg_c",
      calibrationProfile: "soil-v1",
      qualityFlags: []
    },
    {
      id: "telemetry-a-2",
      tenantId: "tenant-a",
      plotId: "plot-a",
      deviceId: "device-a",
      nodeId: "soil-01",
      metric: "soil_temperature",
      ts: "2026-08-03T03:05:00Z",
      seq: 11,
      value: 27.4,
      valueType: "number",
      unit: "deg_c",
      calibrationProfile: "soil-v1",
      qualityFlags: []
    },
    {
      id: "telemetry-a-3",
      tenantId: "tenant-a",
      plotId: "plot-a",
      deviceId: "device-a",
      nodeId: "soil-01",
      metric: "soil_moisture",
      ts: "2026-08-03T03:05:00Z",
      seq: 11,
      value: 43.1,
      valueType: "number",
      unit: "percent_relative",
      calibrationProfile: "soil-v1",
      qualityFlags: []
    },
    {
      id: "telemetry-a-4",
      tenantId: "tenant-a",
      plotId: "plot-a",
      deviceId: "device-a",
      nodeId: "soil-01",
      metric: "electrical_conductivity",
      ts: "2026-08-03T03:05:00Z",
      seq: 11,
      value: 1.24,
      valueType: "number",
      unit: "ms_cm",
      calibrationProfile: "soil-v1",
      qualityFlags: []
    },
    {
      id: "telemetry-b-1",
      tenantId: "tenant-b",
      plotId: "plot-b",
      deviceId: "device-b",
      nodeId: "soil-01",
      metric: "soil_temperature",
      ts: "2026-08-03T03:05:00Z",
      seq: 7,
      value: 25.9,
      valueType: "number",
      unit: "deg_c",
      calibrationProfile: "soil-v1",
      qualityFlags: []
    }
  ];
}

function compareReadingTime(left: TelemetryReadingRecord, right: TelemetryReadingRecord): number {
  const timeDifference = Date.parse(left.ts) - Date.parse(right.ts);
  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.seq - right.seq;
}
