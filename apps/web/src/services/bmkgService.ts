import { appEnvironment } from "../config/environment";
import { getBmkgWeatherCodeLabel } from "../i18n/weather";

const defaultForecastBaseUrl = "https://api.bmkg.go.id/publik/prakiraan-cuaca";
const bmkgAttribution = "Data: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)";

export interface BmkgForecastLocation {
  adm4: string;
  province: string;
  city: string;
  district: string;
  village: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

export interface BmkgForecastItem {
  id: string;
  dateTime: string;
  localDateTime: string;
  condition: string;
  conditionEn: string;
  weatherCode: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  rainfallMm: number | null;
  cloudCoverPercent: number | null;
  windDirection: string;
  windSpeed: number | null;
  visibility: string;
  iconUrl: string;
}

export interface BmkgDailyForecast {
  date: string;
  dateLabel: string;
  summary: string;
  summaryEn: string;
  averageTemperatureC: number | null;
  humidityRange: string;
  rainChancePercent: number;
  items: BmkgForecastItem[];
}

export interface BmkgForecastResult {
  attribution: string;
  fetchedAt: string;
  forecastUrl: string;
  isMock: boolean;
  location: BmkgForecastLocation;
  current: BmkgForecastItem;
  daily: BmkgDailyForecast[];
  items: BmkgForecastItem[];
  errorMessage?: string;
}

interface FetchForecastOptions {
  adm4: string;
  baseUrl?: string;
}

type BmkgRecord = Record<string, unknown>;

export async function fetchBmkgForecast(options: FetchForecastOptions): Promise<BmkgForecastResult> {
  const adm4 = options.adm4.trim();
  const baseUrl = options.baseUrl ?? appEnvironment.bmkgForecastBaseUrl ?? defaultForecastBaseUrl;
  const forecastUrl = adm4 ? buildForecastUrl(baseUrl, adm4) : baseUrl;

  if (!adm4) {
    return createMockForecastResult(
      forecastUrl,
      "BMKG ADM4 region code is required for the active tenant field.",
      "unconfigured"
    );
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(forecastUrl, {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`BMKG request failed with HTTP ${response.status}`);
    }

    const payload = await response.json() as unknown;
    return parseBmkgForecastResponse(payload, forecastUrl, adm4);
  } catch (error) {
    return createMockForecastResult(
      forecastUrl,
      error instanceof Error ? error.message : "BMKG forecast request failed.",
      adm4
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export function parseBmkgForecastResponse(
  payload: unknown,
  forecastUrl = defaultForecastBaseUrl,
  requestedAdm4 = ""
): BmkgForecastResult {
  if (!isRecord(payload)) {
    throw new Error("BMKG payload must be a JSON object.");
  }

  const dataRows = Array.isArray(payload.data) ? payload.data.filter(isRecord) : [];
  const locationPayload = resolveLocationPayload(payload, dataRows);
  const items = dataRows
    .flatMap((row) => flattenWeatherRows(row.cuaca))
    .map((record) => normalizeForecastItem(record))
    .filter((item): item is BmkgForecastItem => item !== null)
    .sort((left, right) => left.dateTime.localeCompare(right.dateTime));

  if (items.length === 0) {
    throw new Error("BMKG payload did not contain forecast items.");
  }

  const current = pickCurrentForecast(items);

  return {
    attribution: bmkgAttribution,
    fetchedAt: new Date().toISOString(),
    forecastUrl,
    isMock: false,
    location: normalizeLocation(locationPayload, requestedAdm4),
    current,
    daily: buildDailyForecasts(items),
    items
  };
}

function buildForecastUrl(baseUrl: string, adm4: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("adm4", adm4);
    return url.toString();
  } catch {
    const url = new URL(defaultForecastBaseUrl);
    url.searchParams.set("adm4", adm4);
    return url.toString();
  }
}

function resolveLocationPayload(payload: BmkgRecord, dataRows: BmkgRecord[]): BmkgRecord {
  if (isRecord(payload.lokasi)) {
    return payload.lokasi;
  }

  const firstDataRow = dataRows[0];
  if (firstDataRow && isRecord(firstDataRow.lokasi)) {
    return firstDataRow.lokasi;
  }

  return {};
}

function flattenWeatherRows(value: unknown): BmkgRecord[] {
  const records: BmkgRecord[] = [];
  const stack = Array.isArray(value) ? [...value] : [value];

  while (stack.length > 0) {
    const current = stack.shift();
    if (Array.isArray(current)) {
      stack.push(...current);
    } else if (isRecord(current)) {
      records.push(current);
    }
  }

  return records;
}

function normalizeLocation(record: BmkgRecord, requestedAdm4: string): BmkgForecastLocation {
  return {
    adm4: readString(record.adm4, requestedAdm4),
    province: readString(record.provinsi, "Indonesia"),
    city: readString(record.kotkab, "Wilayah BMKG"),
    district: readString(record.kecamatan, "-"),
    village: readString(record.desa, "-"),
    latitude: readNumber(record.lat),
    longitude: readNumber(record.lon),
    timezone: readString(record.timezone, "Asia/Jakarta")
  };
}

function normalizeForecastItem(record: BmkgRecord): BmkgForecastItem | null {
  const dateTime = readString(record.datetime, readString(record.utc_datetime, ""));
  const localDateTime = readString(record.local_datetime, dateTime);

  if (!dateTime && !localDateTime) {
    return null;
  }

  const weatherCode = readNumber(record.weather);
  const condition = readString(
    record.weather_desc,
    getBmkgWeatherCodeLabel(weatherCode, "id") ?? "Cuaca Tersedia"
  );
  const conditionEn = readString(record.weather_desc_en, getBmkgWeatherCodeLabel(weatherCode, "en") ?? "Weather available");

  return {
    id: `${localDateTime || dateTime}-${weatherCode ?? "weather"}`,
    dateTime: dateTime || localDateTime,
    localDateTime: localDateTime || dateTime,
    condition,
    conditionEn,
    weatherCode,
    temperatureC: readNumber(record.t),
    humidityPercent: readNumber(record.hu),
    rainfallMm: readNumber(record.tp),
    cloudCoverPercent: readNumber(record.tcc),
    windDirection: readString(record.wd, "-"),
    windSpeed: readNumber(record.ws),
    visibility: readString(record.vs_text, "-"),
    iconUrl: readString(record.image, "")
  };
}

function pickCurrentForecast(items: BmkgForecastItem[]): BmkgForecastItem {
  const now = Date.now();
  const current = items.find((item) => {
    const candidateTime = Date.parse(item.dateTime);
    return Number.isFinite(candidateTime) && candidateTime >= now;
  });

  return current ?? items[0] ?? createFallbackForecastItem();
}

function buildDailyForecasts(items: BmkgForecastItem[]): BmkgDailyForecast[] {
  const grouped = new Map<string, BmkgForecastItem[]>();

  for (const item of items) {
    const dateKey = item.localDateTime.slice(0, 10);
    const currentGroup = grouped.get(dateKey) ?? [];
    grouped.set(dateKey, [...currentGroup, item]);
  }

  return Array.from(grouped.entries())
    .slice(0, 3)
    .map(([date, dayItems]) => normalizeDailyForecast(date, dayItems))
    .filter((day): day is BmkgDailyForecast => day !== null);
}

function normalizeDailyForecast(date: string, dayItems: BmkgForecastItem[]): BmkgDailyForecast | null {
  const sortedItems = [...dayItems].sort((left, right) => left.localDateTime.localeCompare(right.localDateTime));
  const representative = sortedItems.find((item) => {
    const hour = new Date(item.localDateTime.replace(" ", "T")).getHours();
    return hour >= 10 && hour <= 15;
  }) ?? sortedItems[0];

  if (!representative) {
    return null;
  }

  const temperatures = sortedItems
    .map((item) => item.temperatureC)
    .filter((value): value is number => typeof value === "number");
  const humidityValues = sortedItems
    .map((item) => item.humidityPercent)
    .filter((value): value is number => typeof value === "number");
  const rainySamples = sortedItems.filter((item) => {
    const rainfall = item.rainfallMm ?? 0;
    return rainfall > 0 || item.condition.toLowerCase().includes("hujan");
  }).length;

  return {
    date,
    dateLabel: formatDateLabel(date),
    summary: representative.condition,
    summaryEn: representative.conditionEn,
    averageTemperatureC: average(temperatures),
    humidityRange: formatRange(humidityValues, "%"),
    rainChancePercent: sortedItems.length > 0 ? Math.round((rainySamples / sortedItems.length) * 100) : 0,
    items: sortedItems
  };
}

function createMockForecastResult(forecastUrl: string, errorMessage: string, adm4: string): BmkgForecastResult {
  const items = createMockForecastItems();

  return {
    attribution: bmkgAttribution,
    fetchedAt: new Date().toISOString(),
    forecastUrl,
    isMock: true,
    location: {
      adm4,
      province: "Tenant region",
      city: "Wilayah BMKG",
      district: "Active field",
      village: "Mock forecast",
      latitude: null,
      longitude: null,
      timezone: "Asia/Jakarta"
    },
    current: items[0] ?? createFallbackForecastItem(),
    daily: buildDailyForecasts(items),
    items,
    errorMessage
  };
}

function createMockForecastItems(): BmkgForecastItem[] {
  const now = new Date();
  const weatherCodes = [2, 60, 3, 2, 80, 0];

  return Array.from({ length: 18 }, (_, index) => {
    const localDate = new Date(now);
    localDate.setHours(now.getHours() + index * 3, 0, 0, 0);
    const weatherCode = weatherCodes[index % weatherCodes.length] ?? 2;
    const condition = getBmkgWeatherCodeLabel(weatherCode, "id") ?? "Cuaca Tersedia";
    const conditionEn = getBmkgWeatherCodeLabel(weatherCode, "en") ?? "Weather available";
    const rainfall = condition.includes("Hujan") ? 0.8 + (index % 3) * 0.4 : 0;

    return {
      id: `mock-${index}`,
      dateTime: localDate.toISOString(),
      localDateTime: toLocalDateTime(localDate),
      condition,
      conditionEn,
      weatherCode,
      temperatureC: 27 + (index % 5),
      humidityPercent: 64 + (index % 6) * 4,
      rainfallMm: rainfall,
      cloudCoverPercent: 35 + (index % 5) * 9,
      windDirection: ["N", "NE", "E", "SE"][index % 4] ?? "E",
      windSpeed: 4 + (index % 4) * 1.3,
      visibility: "> 10 km",
      iconUrl: ""
    };
  });
}

function createFallbackForecastItem(): BmkgForecastItem {
  const now = new Date();

  return {
    id: "fallback-current",
    dateTime: now.toISOString(),
    localDateTime: toLocalDateTime(now),
    condition: "Cerah Berawan",
    conditionEn: "Partly Cloudy",
    weatherCode: 2,
    temperatureC: 29,
    humidityPercent: 72,
    rainfallMm: 0,
    cloudCoverPercent: 55,
    windDirection: "E",
    windSpeed: 5,
    visibility: "> 10 km",
    iconUrl: ""
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function formatRange(values: number[], suffix: string): string {
  if (values.length === 0) {
    return "-";
  }

  return `${Math.min(...values)}-${Math.max(...values)}${suffix}`;
}

function formatDateLabel(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    weekday: "short"
  }).format(parsedDate);
}

function toLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  const second = String(value.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function isRecord(value: unknown): value is BmkgRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
