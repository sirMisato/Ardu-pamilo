import type { FastifyInstance } from "fastify";
import { roleHasPermission, type TelemetryValueType, type WeatherCacheStatus, type WeatherSnapshot } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext } from "../auth/request-auth.js";
import type { DeviceRecord, DeviceRepository } from "../devices/device-repository.js";
import type { PlotRecord, PlotRepository } from "../plots/plot-repository.js";
import type { TelemetryReadingRecord, TelemetryRepository, TelemetryValue } from "../telemetry/telemetry-repository.js";
import type { WeatherRepository } from "../weather/weather-repository.js";

export interface DashboardRouteDependencies extends AuthDependencies {
  devices: DeviceRepository;
  plots: PlotRepository;
  telemetry: TelemetryRepository;
  weather: WeatherRepository;
}

const defaultHistoryWindowMs = 60 * 60 * 1000;
const defaultPollIntervalMs = 15_000;

export async function registerDashboardRoutes(app: FastifyInstance, deps: DashboardRouteDependencies): Promise<void> {
  app.get("/api/v1/plots/:plotId/dashboard", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read dashboard data.");
    }

    const params = request.params;
    if (!isPlotParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Plot ID is required.");
    }

    const plot = deps.plots.findByIdForTenant(context.tenantContext, params.plotId);
    if (!plot) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Plot was not found.");
    }

    const latest = await deps.telemetry.listLatestForPlot(context.tenantContext, plot.id);
    const devices = deps.devices.listForPlot(context.tenantContext, plot.id);
    const historyRange = createHistoryRange(latest);
    const metrics = latest.map((reading) => reading.metric);
    const histories = await Promise.all(metrics.map(async (metric) => {
      const points = await deps.telemetry.queryHistoryForPlot(context.tenantContext, {
        plotId: plot.id,
        metric,
        from: historyRange.from,
        to: historyRange.to,
        resolution: "raw"
      });

      return {
        metric,
        from: historyRange.from,
        to: historyRange.to,
        resolution: "raw",
        points: points.map(toTelemetryPayload)
      };
    }));
    const weather = plot.adm4Code ? await deps.weather.getByAdm4Code(plot.adm4Code) : null;

    return ok(request, {
      plot: toPlotSummary(plot),
      devices: summarizeDevices(devices),
      telemetry: {
        latest: latest.map(toTelemetryPayload),
        metrics: latest.map((reading) => toMetricSummary(reading, histories.find((history) => history.metric === reading.metric)?.points ?? [])),
        histories
      },
      weather: weather ? toWeatherPayload(plot, weather) : emptyWeatherPayload(plot, "missing"),
      realtime: {
        poll_interval_ms: defaultPollIntervalMs,
        generated_at: new Date().toISOString()
      }
    });
  });
}

function toPlotSummary(plot: PlotRecord): {
  id: string;
  name: string;
  farm_id: string;
  area_ha: number;
  adm4_code: string | null;
  mapping_status: string;
  centroid: {
    lat: number;
    lng: number;
  };
} {
  return {
    id: plot.id,
    name: plot.name,
    farm_id: plot.farmId,
    area_ha: plot.areaHa,
    adm4_code: plot.adm4Code,
    mapping_status: plot.mappingStatus,
    centroid: {
      lat: plot.centroidLat,
      lng: plot.centroidLng
    }
  };
}

function summarizeDevices(devices: DeviceRecord[]): {
  total: number;
  online: number;
  offline: number;
  items: Array<{
    id: string;
    serial_no: string;
    label: string | null;
    status: string;
    last_seen_at: string | null;
  }>;
} {
  const online = devices.filter((device) => isRecentTimestamp(device.lastSeenAt)).length;

  return {
    total: devices.length,
    online,
    offline: Math.max(0, devices.length - online),
    items: devices.map((device) => ({
      id: device.id,
      serial_no: device.serialNo,
      label: device.label,
      status: device.status,
      last_seen_at: device.lastSeenAt
    }))
  };
}

function toMetricSummary(reading: TelemetryReadingRecord, history: ReturnType<typeof toTelemetryPayload>[]): {
  metric: string;
  label: string;
  latest_value: TelemetryValue;
  unit: string;
  value_type: TelemetryValueType;
  latest_at: string;
  sample_count: number;
  min: number | null;
  max: number | null;
  average: number | null;
} {
  const numericValues = history
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    metric: reading.metric,
    label: formatMetricLabel(reading.metric),
    latest_value: reading.value,
    unit: reading.unit,
    value_type: reading.valueType,
    latest_at: reading.ts,
    sample_count: history.length,
    min: numericValues.length > 0 ? Math.min(...numericValues) : null,
    max: numericValues.length > 0 ? Math.max(...numericValues) : null,
    average: numericValues.length > 0
      ? numericValues.reduce((total, value) => total + value, 0) / numericValues.length
      : null
  };
}

function emptyWeatherPayload(plot: PlotRecord, cacheStatus: WeatherCacheStatus): {
  source: "bmkg";
  attribution: "BMKG";
  adm4_code: string | null;
  mapping_status: string;
  cache_status: WeatherCacheStatus;
  analysis_date: string | null;
  fetched_at: string | null;
  stale_after: string | null;
  forecast: [];
} {
  return {
    source: "bmkg",
    attribution: "BMKG",
    adm4_code: plot.adm4Code,
    mapping_status: plot.mappingStatus,
    cache_status: cacheStatus,
    analysis_date: null,
    fetched_at: null,
    stale_after: null,
    forecast: []
  };
}

function toWeatherPayload(plot: PlotRecord, snapshot: WeatherSnapshot): {
  source: "bmkg";
  attribution: "BMKG";
  adm4_code: string;
  mapping_status: string;
  cache_status: WeatherCacheStatus;
  analysis_date: string;
  fetched_at: string;
  stale_after: string;
  forecast: Array<{
    utc_datetime: string;
    local_datetime: string;
    temperature_c: number | null;
    humidity_pct: number | null;
    rainfall_mm: number | null;
    weather_desc: string;
    weather_desc_en: string;
    weather_code: number | null;
    wind_speed_kph: number | null;
    wind_direction: string | null;
    cloud_cover_pct: number | null;
    visibility_text: string | null;
    icon_url: string | null;
  }>;
} {
  return {
    source: snapshot.source,
    attribution: snapshot.attribution,
    adm4_code: snapshot.adm4Code,
    mapping_status: plot.mappingStatus,
    cache_status: snapshot.cacheStatus,
    analysis_date: snapshot.analysisDate,
    fetched_at: snapshot.fetchedAt,
    stale_after: snapshot.staleAfter,
    forecast: snapshot.forecast.map((point) => ({
      utc_datetime: point.utcDatetime,
      local_datetime: point.localDatetime,
      temperature_c: point.temperatureC,
      humidity_pct: point.humidityPct,
      rainfall_mm: point.rainfallMm,
      weather_desc: point.weatherDesc,
      weather_desc_en: point.weatherDescEn,
      weather_code: point.weatherCode,
      wind_speed_kph: point.windSpeedKph,
      wind_direction: point.windDirection,
      cloud_cover_pct: point.cloudCoverPct,
      visibility_text: point.visibilityText,
      icon_url: point.iconUrl
    }))
  };
}

function toTelemetryPayload(reading: TelemetryReadingRecord): {
  device_id: string;
  node_id: string;
  metric: string;
  ts: string;
  seq: number;
  value: TelemetryValue;
  value_type: TelemetryValueType;
  unit: string;
  calibration_profile: string;
  quality_flags: string[];
} {
  return {
    device_id: reading.deviceId,
    node_id: reading.nodeId,
    metric: reading.metric,
    ts: reading.ts,
    seq: reading.seq,
    value: reading.value,
    value_type: reading.valueType,
    unit: reading.unit,
    calibration_profile: reading.calibrationProfile,
    quality_flags: reading.qualityFlags
  };
}

function createHistoryRange(readings: TelemetryReadingRecord[]): {
  from: string;
  to: string;
} {
  const latestTimestamp = readings
    .map((reading) => Date.parse(reading.ts))
    .filter((timestamp) => Number.isFinite(timestamp))
    .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
  const to = latestTimestamp > 0 ? latestTimestamp : Date.now();
  const from = to - defaultHistoryWindowMs;

  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString()
  };
}

function isRecentTimestamp(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 15 * 60 * 1000;
}

function formatMetricLabel(metric: string): string {
  return metric
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPlotParams(params: unknown): params is { plotId: string } {
  return typeof params === "object" && params !== null && "plotId" in params && typeof params.plotId === "string";
}
