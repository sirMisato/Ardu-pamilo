import type { FastifyInstance } from "fastify";
import { roleHasPermission, type WeatherCacheStatus, type WeatherSnapshot } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext } from "../auth/request-auth.js";
import type { PlotRecord, PlotRepository } from "../plots/plot-repository.js";
import type { WeatherRepository } from "./weather-repository.js";

export interface WeatherRouteDependencies extends AuthDependencies {
  plots: PlotRepository;
  weather: WeatherRepository;
}

export async function registerWeatherRoutes(app: FastifyInstance, deps: WeatherRouteDependencies): Promise<void> {
  app.get("/api/v1/plots/:plotId/weather", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read weather.");
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

    if (!plot.adm4Code) {
      return ok(request, emptyWeatherPayload(plot, "missing"));
    }

    const snapshot = await deps.weather.getByAdm4Code(plot.adm4Code);
    if (!snapshot) {
      return ok(request, emptyWeatherPayload(plot, "missing"));
    }

    return ok(request, toWeatherPayload(plot, snapshot));
  });
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

function isPlotParams(params: unknown): params is { plotId: string } {
  return typeof params === "object" && params !== null && "plotId" in params && typeof params.plotId === "string";
}
