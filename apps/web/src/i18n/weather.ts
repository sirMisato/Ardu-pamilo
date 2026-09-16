import { formatNumber } from "./formatters";
import { getCurrentLanguage, t, type LocaleCode } from "./index";

export interface WeatherConditionSource {
  condition?: string | null;
  conditionEn?: string | null;
  weatherCode?: number | null;
}

const weatherCodeLabels: Record<number, { en: string; id: string }> = {
  0: { en: "Clear", id: "Cerah" },
  1: { en: "Clear", id: "Cerah" },
  2: { en: "Partly cloudy", id: "Cerah Berawan" },
  3: { en: "Cloudy", id: "Berawan" },
  4: { en: "Overcast", id: "Berawan Tebal" },
  5: { en: "Haze", id: "Udara Kabur" },
  10: { en: "Smoke", id: "Asap" },
  45: { en: "Fog", id: "Kabut" },
  60: { en: "Light rain", id: "Hujan Ringan" },
  61: { en: "Moderate rain", id: "Hujan Sedang" },
  63: { en: "Heavy rain", id: "Hujan Lebat" },
  80: { en: "Local rain", id: "Hujan Lokal" },
  95: { en: "Thunderstorm", id: "Hujan Petir" },
  97: { en: "Thunderstorm", id: "Hujan Petir" }
};

const genericConditionLabels = new Set(["cuaca tersedia", "weather available", "unknown weather condition"]);

const windDirectionLabels: Record<string, { en: string; id: string }> = {
  N: { en: "North", id: "Utara" },
  NNE: { en: "North-northeast", id: "Utara timur laut" },
  NE: { en: "Northeast", id: "Timur laut" },
  ENE: { en: "East-northeast", id: "Timur timur laut" },
  E: { en: "East", id: "Timur" },
  ESE: { en: "East-southeast", id: "Timur tenggara" },
  SE: { en: "Southeast", id: "Tenggara" },
  SSE: { en: "South-southeast", id: "Selatan tenggara" },
  S: { en: "South", id: "Selatan" },
  SSW: { en: "South-southwest", id: "Selatan barat daya" },
  SW: { en: "Southwest", id: "Barat daya" },
  WSW: { en: "West-southwest", id: "Barat barat daya" },
  W: { en: "West", id: "Barat" },
  WNW: { en: "West-northwest", id: "Barat barat laut" },
  NW: { en: "Northwest", id: "Barat laut" },
  NNW: { en: "North-northwest", id: "Utara barat laut" },
  VARIABLE: { en: "Variable", id: "Berubah-ubah" },
  VRB: { en: "Variable", id: "Berubah-ubah" }
};

export function getWeatherConditionLabel(item: WeatherConditionSource | null | undefined): string {
  if (!item) {
    return t("weather.unknownCondition");
  }

  const language = getCurrentLanguage();
  const sourceLabel = language === "en" ? item.conditionEn : item.condition;
  if (sourceLabel && !isGenericConditionLabel(sourceLabel)) {
    return sourceLabel;
  }

  if (typeof item.weatherCode === "number" && weatherCodeLabels[item.weatherCode]) {
    return getBmkgWeatherCodeLabel(item.weatherCode, language) ?? t("weather.unknownCondition");
  }

  return t("weather.unknownCondition");
}

export function getBmkgWeatherCodeLabel(code: number | null | undefined, language: LocaleCode = getCurrentLanguage()): string | null {
  return typeof code === "number" ? weatherCodeLabels[code]?.[language] ?? null : null;
}

export function getWeatherConditionDetail(item: Pick<WeatherConditionSource, "weatherCode"> | null | undefined): string {
  return typeof item?.weatherCode === "number" ? t("weather.weatherCodeDetail", { code: item.weatherCode }) : "";
}

export function getWeatherToneClass(item: WeatherConditionSource | null | undefined): string {
  const label = getWeatherConditionLabel(item).toLowerCase();
  if (label.includes("hujan") || label.includes("rain") || label.includes("thunder")) {
    return "bg-sky-100 text-sky-700";
  }

  if (label.includes("cerah") || label.includes("clear") || label.includes("sun")) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-teal-100 text-teal-700";
}

export function formatWindSpeed(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t("format.nullValue");
  }

  const unit = getCurrentLanguage() === "en" ? "km/h" : "km/j";
  return `${formatNumber(value, { maximumFractionDigits: 1 })} ${unit}`;
}

export function formatWindDirection(direction: string | null | undefined): string {
  const normalized = (direction ?? "").trim().toUpperCase();
  if (!normalized || normalized === "-") {
    return t("format.nullValue");
  }

  return windDirectionLabels[normalized]?.[getCurrentLanguage()] ?? direction ?? t("format.nullValue");
}

export function formatWindLabel(value: number | null | undefined, direction: string | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t("format.nullValue");
  }

  const directionLabel = formatWindDirection(direction);
  return directionLabel === t("format.nullValue")
    ? formatWindSpeed(value)
    : `${formatWindSpeed(value)} ${directionLabel}`;
}

export function isRainyCondition(item: WeatherConditionSource | null | undefined): boolean {
  const label = getWeatherConditionLabel(item).toLowerCase();
  return label.includes("hujan") || label.includes("rain") || label.includes("thunder");
}

function isGenericConditionLabel(value: string): boolean {
  return genericConditionLabels.has(value.trim().toLowerCase());
}
