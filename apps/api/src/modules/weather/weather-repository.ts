import { classifyWeatherCache, type WeatherForecastPoint, type WeatherSnapshot } from "@pamilo/shared";

export interface WeatherRepository {
  getByAdm4Code(adm4Code: string): Promise<WeatherSnapshot | null>;
}

export class InMemoryWeatherRepository implements WeatherRepository {
  readonly #snapshots: WeatherSnapshot[];

  constructor(snapshots: WeatherSnapshot[] = defaultWeatherSnapshots()) {
    this.#snapshots = [...snapshots];
  }

  async getByAdm4Code(adm4Code: string): Promise<WeatherSnapshot | null> {
    return this.#snapshots.find((snapshot) => snapshot.adm4Code === adm4Code) ?? null;
  }
}

export interface BmkgWeatherRepositoryOptions {
  baseUrl?: string;
  cacheTtlMs?: number;
  fetchFn?: typeof fetch;
  now?: () => Date;
  requestTimeoutMs?: number;
}

type CachedWeatherSnapshot = {
  snapshot: WeatherSnapshot;
  staleAtMs: number;
};

const defaultBmkgBaseUrl = "https://api.bmkg.go.id/publik/prakiraan-cuaca";
const defaultCacheTtlMs = 6 * 60 * 60 * 1000;
const defaultRequestTimeoutMs = 8000;
const adm4Pattern = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;

export class BmkgWeatherRepository implements WeatherRepository {
  readonly #baseUrl: string;
  readonly #cacheTtlMs: number;
  readonly #fetchFn: typeof fetch;
  readonly #now: () => Date;
  readonly #requestTimeoutMs: number;
  readonly #cache = new Map<string, CachedWeatherSnapshot>();

  constructor(options: BmkgWeatherRepositoryOptions = {}) {
    this.#baseUrl = options.baseUrl ?? defaultBmkgBaseUrl;
    this.#cacheTtlMs = options.cacheTtlMs ?? defaultCacheTtlMs;
    this.#fetchFn = options.fetchFn ?? fetch;
    this.#now = options.now ?? (() => new Date());
    this.#requestTimeoutMs = options.requestTimeoutMs ?? defaultRequestTimeoutMs;
  }

  async getByAdm4Code(adm4Code: string): Promise<WeatherSnapshot | null> {
    if (!adm4Pattern.test(adm4Code)) {
      return null;
    }

    const cached = this.#cache.get(adm4Code);
    const nowMs = this.#now().getTime();

    if (cached && nowMs <= cached.staleAtMs) {
      return withCacheStatus(cached.snapshot, "fresh", this.#now().toISOString());
    }

    try {
      const snapshot = await this.fetchForecast(adm4Code);
      this.#cache.set(adm4Code, {
        snapshot,
        staleAtMs: Date.parse(snapshot.staleAfter)
      });

      return snapshot;
    } catch {
      if (!cached) {
        return null;
      }

      return withCacheStatus(cached.snapshot, "stale", this.#now().toISOString());
    }
  }

  private async fetchForecast(adm4Code: string): Promise<WeatherSnapshot> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#requestTimeoutMs);

    try {
      const url = new URL(this.#baseUrl);
      url.searchParams.set("adm4", adm4Code);

      const response = await this.#fetchFn(url, {
        headers: {
          accept: "application/json",
          "user-agent": "pamilo-smart-farming-gis/0.1"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`BMKG forecast request failed with HTTP ${response.status}.`);
      }

      return parseBmkgForecastResponse(await response.json(), {
        adm4Code,
        now: this.#now(),
        cacheTtlMs: this.#cacheTtlMs
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function parseBmkgForecastResponse(input: unknown, options: {
  adm4Code: string;
  now: Date;
  cacheTtlMs?: number;
}): WeatherSnapshot {
  if (!isRecord(input)) {
    throw new Error("BMKG response must be a JSON object.");
  }

  const forecastItems = collectBmkgForecastItems(input);
  const timezone = readTimezone(input);
  const forecast = forecastItems
    .map((item) => parseBmkgForecastPoint(item, timezone))
    .filter((point): point is WeatherForecastPoint => point !== null)
    .sort((left, right) => Date.parse(left.utcDatetime) - Date.parse(right.utcDatetime));

  if (forecast.length === 0) {
    throw new Error("BMKG response does not contain forecast points.");
  }

  const fetchedAt = options.now.toISOString();
  const staleAfter = new Date(options.now.getTime() + (options.cacheTtlMs ?? defaultCacheTtlMs)).toISOString();
  const analysisDate = readFirstAnalysisDate(forecastItems) ?? fetchedAt;

  return {
    source: "bmkg",
    attribution: "BMKG",
    adm4Code: options.adm4Code,
    analysisDate,
    fetchedAt,
    staleAfter,
    cacheStatus: "fresh",
    forecast
  };
}

export function defaultWeatherSnapshots(): WeatherSnapshot[] {
  return [
    {
      source: "bmkg",
      attribution: "BMKG",
      adm4Code: "31.71.01.1001",
      analysisDate: "2026-08-03",
      fetchedAt: "2026-08-03T00:00:00Z",
      staleAfter: "2026-08-03T06:00:00Z",
      cacheStatus: "stale",
      forecast: [
        {
          utcDatetime: "2026-08-03T06:00:00Z",
          localDatetime: "2026-08-03T13:00:00+07:00",
          temperatureC: 29,
          humidityPct: 82,
          rainfallMm: 0.4,
          weatherDesc: "Hujan Ringan",
          weatherDescEn: "Light Rain",
          weatherCode: 61,
          windSpeedKph: 8,
          windDirection: "SE",
          cloudCoverPct: 74,
          visibilityText: "> 10 km",
          iconUrl: null
        },
        {
          utcDatetime: "2026-08-03T09:00:00Z",
          localDatetime: "2026-08-03T16:00:00+07:00",
          temperatureC: 28,
          humidityPct: 86,
          rainfallMm: 0,
          weatherDesc: "Berawan",
          weatherDescEn: "Cloudy",
          weatherCode: 3,
          windSpeedKph: 6,
          windDirection: "E",
          cloudCoverPct: 82,
          visibilityText: "> 10 km",
          iconUrl: null
        }
      ]
    }
  ];
}

function collectBmkgForecastItems(input: Record<string, unknown>): Record<string, unknown>[] {
  const data = input.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.cuaca)) {
      return [];
    }

    return flattenForecastGroups(entry.cuaca);
  });
}

function flattenForecastGroups(values: unknown[]): Record<string, unknown>[] {
  return values.flatMap((value) => {
    if (Array.isArray(value)) {
      return flattenForecastGroups(value);
    }

    return isRecord(value) ? [value] : [];
  });
}

function parseBmkgForecastPoint(input: Record<string, unknown>, timezone: string | null): WeatherForecastPoint | null {
  const utcDatetime = normalizeUtcDatetime(readString(input.datetime) ?? readString(input.utc_datetime));
  const localDatetime = normalizeLocalDatetime(readString(input.local_datetime), timezone);
  const weatherDesc = readString(input.weather_desc);
  const weatherDescEn = readString(input.weather_desc_en);

  if (!utcDatetime || !localDatetime || !weatherDesc || !weatherDescEn) {
    return null;
  }

  return {
    utcDatetime,
    localDatetime,
    temperatureC: readNumber(input.t),
    humidityPct: readNumber(input.hu),
    rainfallMm: readNumber(input.tp),
    weatherDesc,
    weatherDescEn,
    weatherCode: readNumber(input.weather),
    windSpeedKph: readNumber(input.ws),
    windDirection: readString(input.wd),
    cloudCoverPct: readNumber(input.tcc),
    visibilityText: readString(input.vs_text),
    iconUrl: readHttpsUrl(input.image)
  };
}

function normalizeUtcDatetime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizeLocalDatetime(value: string | null, timezone: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(" ", "T");
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)) {
    return normalized.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  }

  const offset = timezoneToOffset(timezone);
  return `${normalized}${offset}`;
}

function timezoneToOffset(timezone: string | null): string {
  if (timezone === "Asia/Makassar" || timezone === "+0800" || timezone === "+08:00") {
    return "+08:00";
  }

  if (timezone === "Asia/Jayapura" || timezone === "+0900" || timezone === "+09:00") {
    return "+09:00";
  }

  return "+07:00";
}

function readFirstAnalysisDate(items: Record<string, unknown>[]): string | null {
  for (const item of items) {
    const value = readString(item.analysis_date);
    if (value) {
      const normalized = normalizeUtcDatetime(value.endsWith("Z") ? value : `${value}Z`);
      return normalized ?? value;
    }
  }

  return null;
}

function readTimezone(input: Record<string, unknown>): string | null {
  const rootLocation = isRecord(input.lokasi) ? input.lokasi : null;
  const rootTimezone = rootLocation ? readString(rootLocation.timezone) : null;
  if (rootTimezone) {
    return rootTimezone;
  }

  const firstData = Array.isArray(input.data) ? input.data.find(isRecord) : null;
  const nestedLocation = firstData && isRecord(firstData.lokasi) ? firstData.lokasi : null;
  return nestedLocation ? readString(nestedLocation.timezone) : null;
}

function withCacheStatus(snapshot: WeatherSnapshot, cacheStatus: WeatherSnapshot["cacheStatus"], now: string): WeatherSnapshot {
  const classified = classifyWeatherCache({
    fetchedAt: snapshot.fetchedAt,
    staleAfter: snapshot.staleAfter,
    now
  });

  return {
    ...snapshot,
    cacheStatus: classified === "missing" ? cacheStatus : classified,
    forecast: [...snapshot.forecast]
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readHttpsUrl(value: unknown): string | null {
  const text = readString(value);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text.replaceAll(" ", "%20"));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
