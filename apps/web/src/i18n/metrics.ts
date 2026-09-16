import { t } from "./index";

export interface MetricDisplayDefinition {
  labelKey: string;
  unit: string;
}

const metricRegistry: Record<string, MetricDisplayDefinition> = {
  battery: { labelKey: "metric.battery", unit: "%" },
  conductivity: { labelKey: "metric.conductivity", unit: "µS/cm" },
  humidity: { labelKey: "metric.humidity", unit: "%" },
  moisture: { labelKey: "metric.moisture", unit: "%" },
  nitrogen: { labelKey: "metric.nitrogen", unit: "mg/kg" },
  ph: { labelKey: "metric.ph", unit: "pH" },
  phosphorus: { labelKey: "metric.phosphorus", unit: "mg/kg" },
  potassium: { labelKey: "metric.potassium", unit: "mg/kg" },
  rainfall: { labelKey: "metric.rainfall", unit: "mm" },
  soil_temperature: { labelKey: "metric.soil_temperature", unit: "°C" },
  temperature: { labelKey: "metric.temperature", unit: "°C" }
};

const unitAliases: Record<string, string> = {
  c: "°C",
  celcius: "°C",
  celsius: "°C",
  mg_kg: "mg/kg",
  percent: "%",
  percentage: "%",
  us_cm: "µS/cm",
  µs_cm: "µS/cm"
};

export function getMetricLabel(metricKey: string): string {
  return metricRegistry[metricKey]?.labelKey ? t(metricRegistry[metricKey].labelKey) : metricKey;
}

export function getMetricUnit(metricKey: string, sourceUnit?: string | null): string {
  if (sourceUnit) {
    return normalizeUnitSymbol(sourceUnit);
  }

  return metricRegistry[metricKey]?.unit ?? "";
}

export function normalizeUnitSymbol(unit: string): string {
  const normalized = unit.trim();
  const alias = unitAliases[normalized.toLowerCase()];
  return alias ?? normalized;
}
