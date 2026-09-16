import { t } from "./index";

export interface MetricDisplayDefinition {
  labelKey: string;
  unit: string;
}

const metricRegistry: Record<string, MetricDisplayDefinition> = {
  battery: { labelKey: "metric.battery", unit: "%" },
  conductivity: { labelKey: "metric.conductivity", unit: "uS/cm" },
  electrical_conductivity: { labelKey: "metric.conductivity", unit: "uS/cm" },
  humidity: { labelKey: "metric.humidity", unit: "%" },
  moisture: { labelKey: "metric.moisture", unit: "%" },
  nitrogen: { labelKey: "metric.nitrogen", unit: "mg/kg" },
  ph: { labelKey: "metric.ph", unit: "pH" },
  phosphorus: { labelKey: "metric.phosphorus", unit: "mg/kg" },
  potassium: { labelKey: "metric.potassium", unit: "mg/kg" },
  rainfall: { labelKey: "metric.rainfall", unit: "mm" },
  soil_temperature: { labelKey: "metric.soil_temperature", unit: "C" },
  temperature: { labelKey: "metric.temperature", unit: "C" }
};

const unitAliases: Record<string, string> = {
  c: "C",
  celcius: "C",
  celsius: "C",
  mg_kg: "mg/kg",
  percent: "%",
  percentage: "%",
  us_cm: "uS/cm",
  "\u00b5s_cm": "uS/cm"
};

export function getMetricLabel(metricKey: string): string {
  const normalizedKey = normalizeMetricKey(metricKey);
  return metricRegistry[normalizedKey]?.labelKey ? t(metricRegistry[normalizedKey].labelKey) : formatCustomMetricLabel(metricKey);
}

export function getMetricUnit(metricKey: string, sourceUnit?: string | null): string {
  if (sourceUnit) {
    return normalizeUnitSymbol(sourceUnit);
  }

  return metricRegistry[normalizeMetricKey(metricKey)]?.unit ?? "";
}

export function normalizeUnitSymbol(unit: string): string {
  const normalized = unit.trim();
  const alias = unitAliases[normalized.toLowerCase()];
  return alias ?? normalized;
}

export function normalizeMetricKey(metricKey: string): string {
  const normalized = metricKey
    .replace(/^metrics\./, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const compact = normalized.replace(/_/g, "");

  if (normalized === "ph" || compact === "soilph") return "ph";
  if (normalized === "n" || normalized === "nitrogen") return "nitrogen";
  if (normalized === "p" || normalized === "phosphorus" || normalized === "phosphor") return "phosphorus";
  if (normalized === "k" || normalized === "potassium") return "potassium";
  if (normalized === "moisture" || normalized === "soil_moisture" || compact === "soilmoisture") return "moisture";
  if (normalized === "soil_temperature" || compact === "soiltemperature") return "soil_temperature";
  if (normalized === "conductivity" || normalized === "ec" || normalized === "electrical_conductivity" || compact === "electricalconductivity") return "conductivity";

  return normalized;
}

function formatCustomMetricLabel(metricKey: string): string {
  return metricKey
    .replace(/^metrics\./, "")
    .replace(/[-_.]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || metricKey;
}
