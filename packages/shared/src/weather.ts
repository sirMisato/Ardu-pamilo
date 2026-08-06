import type { ValidationResult } from "./telemetry.js";

export type WeatherCacheStatus = "fresh" | "stale" | "missing";

export interface WeatherForecastPoint {
  utcDatetime: string;
  localDatetime: string;
  temperatureC: number | null;
  humidityPct: number | null;
  rainfallMm: number | null;
  weatherDesc: string;
  weatherDescEn: string;
  weatherCode: number | null;
  windSpeedKph: number | null;
  windDirection: string | null;
  cloudCoverPct: number | null;
  visibilityText: string | null;
  iconUrl: string | null;
}

export interface WeatherSnapshot {
  source: "bmkg";
  attribution: "BMKG";
  adm4Code: string;
  analysisDate: string;
  fetchedAt: string;
  staleAfter: string;
  cacheStatus: WeatherCacheStatus;
  forecast: WeatherForecastPoint[];
}

export function classifyWeatherCache(input: {
  fetchedAt: string | null;
  staleAfter: string | null;
  now: string;
}): WeatherCacheStatus {
  if (!input.fetchedAt || !input.staleAfter) {
    return "missing";
  }

  if (Number.isNaN(Date.parse(input.fetchedAt)) || Number.isNaN(Date.parse(input.staleAfter))) {
    return "missing";
  }

  return Date.parse(input.now) > Date.parse(input.staleAfter) ? "stale" : "fresh";
}

export function parseWeatherForecastPoint(input: unknown): ValidationResult<WeatherForecastPoint> {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ["/forecast item must be an object"]
    };
  }

  const errors: string[] = [];

  const utcDatetime = readString(input, "utc_datetime", errors);
  const localDatetime = readString(input, "local_datetime", errors);
  const weatherDesc = readString(input, "weather_desc", errors);
  const weatherDescEn = readString(input, "weather_desc_en", errors);

  const point: WeatherForecastPoint = {
    utcDatetime,
    localDatetime,
    temperatureC: readNullableNumber(input, "t", errors),
    humidityPct: readNullableNumber(input, "hu", errors),
    rainfallMm: readNullableNumber(input, "tp", errors),
    weatherDesc,
    weatherDescEn,
    weatherCode: readNullableNumber(input, "weather", errors),
    windSpeedKph: readNullableNumber(input, "ws", errors),
    windDirection: readNullableString(input, "wd", errors),
    cloudCoverPct: readNullableNumber(input, "tcc", errors),
    visibilityText: readNullableString(input, "vs_text", errors),
    iconUrl: readNullableString(input, "image", errors)
  };

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  if (Number.isNaN(Date.parse(point.utcDatetime))) {
    return {
      ok: false,
      errors: ["/utc_datetime must be a valid date-time"]
    };
  }

  return {
    ok: true,
    value: point
  };
}

function readString(input: Record<string, unknown>, key: string, errors: string[]): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`/${key} is required`);
    return "";
  }

  return value.trim();
}

function readNullableNumber(input: Record<string, unknown>, key: string, errors: string[]): number | null {
  const value = input[key];
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`/${key} must be a number or null`);
    return null;
  }

  return value;
}

function readNullableString(input: Record<string, unknown>, key: string, errors: string[]): string | null {
  const value = input[key];
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push(`/${key} must be a string or null`);
    return null;
  }

  return value.trim() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
