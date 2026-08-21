import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { JsonValue } from "../db/schema.js";
import { requireTenantContext, verifyTenant } from "../middleware/verifyTenant.js";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const weatherHistoryPayloadSchema = z.object({
  adm4Code: z.string().trim().min(1).max(32),
  current: jsonRecordSchema,
  daily: z.array(jsonRecordSchema).max(10).default([]),
  errorMessage: z.string().trim().max(1000).optional().nullable(),
  fetchedAt: z.string().optional(),
  forecastUrl: z.string().trim().max(1000),
  hourly: z.array(jsonRecordSchema).max(48).default([]),
  isMock: z.boolean().default(false),
  location: jsonRecordSchema,
  plotId: z.string().trim().max(36).optional().nullable(),
  source: z.string().trim().max(255)
});

const weatherHistoryQuerySchema = z.object({
  adm4Code: z.string().trim().max(32).optional(),
  end: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(250),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  plotId: z.string().trim().max(36).optional(),
  start: z.string().datetime().optional()
});

type WeatherHistoryPayload = z.infer<typeof weatherHistoryPayloadSchema>;

interface WeatherHistoryRow {
  adm4_code: string;
  cloud_cover_percent: number | string | null;
  created_at: Date | string;
  current_condition: string;
  current_json: JsonValue | string;
  current_temperature_c: number | string | null;
  daily_json: JsonValue | string;
  error_message: string | null;
  fetched_at: Date | string;
  forecast_url: string;
  hourly_json: JsonValue | string;
  humidity_percent: number | string | null;
  id: string | number | bigint;
  is_mock: boolean | number;
  location_json: JsonValue | string;
  observed_at: Date | string;
  plot_id: string | null;
  plot_name: string | null;
  rainfall_mm: number | string | null;
  source: string;
  wind_direction: string | null;
  wind_speed: number | string | null;
}

export const weatherRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.post<{ Body: z.input<typeof weatherHistoryPayloadSchema> }>("/weather/history", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = weatherHistoryPayloadSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid weather history payload",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const body = parsed.data;
    const plotId = await resolveWeatherPlotId(tenant.tenantId, body);

    if (body.plotId && plotId === undefined) {
      return reply.code(404).send({
        error: "Plot not found",
        message: "Zona/area weather tidak tersedia untuk tenant ini."
      });
    }

    const observedAt = resolveObservedAt(body);
    const fetchedAt = normalizeDate(body.fetchedAt) ?? new Date();
    const duplicate = await selectDuplicateWeatherHistory(tenant.tenantId, body.adm4Code, plotId ?? null, observedAt);

    if (duplicate) {
      return {
        inserted: false,
        item: toWeatherHistoryDto(duplicate)
      };
    }

    await db
      .insertInto("weather_history")
      .values({
        adm4_code: body.adm4Code,
        cloud_cover_percent: readNumber(body.current.cloudCoverPercent),
        created_at: new Date(),
        current_condition: readString(body.current.condition, "Cuaca Tersedia") ?? "Cuaca Tersedia",
        current_json: JSON.stringify(toJsonValue(body.current)),
        current_temperature_c: readNumber(body.current.temperatureC),
        daily_json: JSON.stringify(toJsonValue(body.daily)),
        error_message: body.errorMessage ?? null,
        fetched_at: fetchedAt,
        forecast_url: body.forecastUrl,
        hourly_json: JSON.stringify(toJsonValue(body.hourly)),
        humidity_percent: readNumber(body.current.humidityPercent),
        is_mock: body.isMock,
        location_json: JSON.stringify(toJsonValue(body.location)),
        observed_at: observedAt,
        plot_id: plotId ?? null,
        rainfall_mm: readNumber(body.current.rainfallMm),
        source: body.source,
        tenant_id: tenant.tenantId,
        wind_direction: readString(body.current.windDirection, null),
        wind_speed: readNumber(body.current.windSpeed)
      })
      .execute();

    const inserted = await selectDuplicateWeatherHistory(tenant.tenantId, body.adm4Code, plotId ?? null, observedAt);

    return reply.code(201).send({
      inserted: true,
      item: inserted ? toWeatherHistoryDto(inserted) : null
    });
  });

  app.get<{ Querystring: z.input<typeof weatherHistoryQuerySchema> }>("/weather/history", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = weatherHistoryQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid weather history query",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const { adm4Code, end, limit, offset, plotId, start } = parsed.data;
    let query = db
      .selectFrom("weather_history")
      .leftJoin("plots", (join) => join
        .onRef("plots.id", "=", "weather_history.plot_id")
        .on("plots.tenant_id", "=", tenant.tenantId))
      .select([
        "weather_history.adm4_code",
        "weather_history.cloud_cover_percent",
        "weather_history.created_at",
        "weather_history.current_condition",
        "weather_history.current_json",
        "weather_history.current_temperature_c",
        "weather_history.daily_json",
        "weather_history.error_message",
        "weather_history.fetched_at",
        "weather_history.forecast_url",
        "weather_history.hourly_json",
        "weather_history.humidity_percent",
        "weather_history.id",
        "weather_history.is_mock",
        "weather_history.location_json",
        "weather_history.observed_at",
        "weather_history.plot_id",
        "weather_history.rainfall_mm",
        "weather_history.source",
        "weather_history.wind_direction",
        "weather_history.wind_speed",
        "plots.name as plot_name"
      ])
      .where("weather_history.tenant_id", "=", tenant.tenantId)
      .orderBy("weather_history.observed_at", "desc")
      .limit(limit)
      .offset(offset);

    if (adm4Code) {
      query = query.where("weather_history.adm4_code", "=", adm4Code);
    }

    if (plotId) {
      query = query.where("weather_history.plot_id", "=", plotId);
    }

    if (start) {
      query = query.where("weather_history.observed_at", ">=", new Date(start));
    }

    if (end) {
      query = query.where("weather_history.observed_at", "<=", new Date(end));
    }

    const rows = await query.execute();

    return {
      count: rows.length,
      items: rows.map((row) => toWeatherHistoryDto(row as WeatherHistoryRow)).reverse(),
      limit,
      offset
    };
  });
};

async function resolveWeatherPlotId(tenantId: string, body: WeatherHistoryPayload): Promise<string | null | undefined> {
  if (body.plotId) {
    const plot = await db
      .selectFrom("plots")
      .select("id")
      .where("id", "=", body.plotId)
      .where("tenant_id", "=", tenantId)
      .executeTakeFirst();

    return plot?.id;
  }

  const plot = await db
    .selectFrom("plots")
    .select("id")
    .where("tenant_id", "=", tenantId)
    .where("bmkg_adm4_code", "=", body.adm4Code)
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  return plot?.id ?? null;
}

async function selectDuplicateWeatherHistory(
  tenantId: string,
  adm4Code: string,
  plotId: string | null,
  observedAt: Date
): Promise<WeatherHistoryRow | undefined> {
  let query = db
    .selectFrom("weather_history")
    .leftJoin("plots", (join) => join
      .onRef("plots.id", "=", "weather_history.plot_id")
      .on("plots.tenant_id", "=", tenantId))
    .select([
      "weather_history.adm4_code",
      "weather_history.cloud_cover_percent",
      "weather_history.created_at",
      "weather_history.current_condition",
      "weather_history.current_json",
      "weather_history.current_temperature_c",
      "weather_history.daily_json",
      "weather_history.error_message",
      "weather_history.fetched_at",
      "weather_history.forecast_url",
      "weather_history.hourly_json",
      "weather_history.humidity_percent",
      "weather_history.id",
      "weather_history.is_mock",
      "weather_history.location_json",
      "weather_history.observed_at",
      "weather_history.plot_id",
      "weather_history.rainfall_mm",
      "weather_history.source",
      "weather_history.wind_direction",
      "weather_history.wind_speed",
      "plots.name as plot_name"
    ])
    .where("weather_history.tenant_id", "=", tenantId)
    .where("weather_history.adm4_code", "=", adm4Code)
    .where("weather_history.observed_at", "=", observedAt);

  query = plotId
    ? query.where("weather_history.plot_id", "=", plotId)
    : query.where("weather_history.plot_id", "is", null);

  return query.executeTakeFirst() as Promise<WeatherHistoryRow | undefined>;
}

function resolveObservedAt(body: WeatherHistoryPayload): Date {
  return normalizeDate(readString(body.current.dateTime, null))
    ?? normalizeDate(readString(body.current.localDateTime, null))
    ?? normalizeDate(body.fetchedAt)
    ?? new Date();
}

function normalizeDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toWeatherHistoryDto(row: WeatherHistoryRow) {
  return {
    adm4Code: row.adm4_code,
    cloudCoverPercent: normalizeNumber(row.cloud_cover_percent),
    condition: row.current_condition,
    createdAt: serializeDate(row.created_at),
    current: parseJson(row.current_json),
    daily: parseJsonArray(row.daily_json),
    errorMessage: row.error_message,
    fetchedAt: serializeDate(row.fetched_at),
    forecastUrl: row.forecast_url,
    hourly: parseJsonArray(row.hourly_json),
    humidityPercent: normalizeNumber(row.humidity_percent),
    id: String(row.id),
    isMock: Boolean(row.is_mock),
    location: parseJson(row.location_json),
    observedAt: serializeDate(row.observed_at),
    plotId: row.plot_id,
    plotName: row.plot_name,
    rainfallMm: normalizeNumber(row.rainfall_mm),
    source: row.source,
    temperatureC: normalizeNumber(row.current_temperature_c),
    windDirection: row.wind_direction,
    windSpeed: normalizeNumber(row.wind_speed)
  };
}

function readString(value: unknown, fallback: string | null): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, childValue]) => [key, toJsonValue(childValue)]));
  }

  return null;
}

function parseJson(value: JsonValue | string): JsonValue {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return {};
  }
}

function parseJsonArray(value: JsonValue | string): JsonValue[] {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`).toISOString();
  }

  return value;
}
