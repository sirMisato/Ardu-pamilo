import { metricCodes, type MetricCode, type ValidationResult } from "./telemetry.js";

export type ThresholdSeverity = "info" | "warning" | "critical";
export type ThresholdStatus = "draft" | "reviewed" | "verified" | "suspended";

export interface AgronomyThreshold {
  crop: string;
  variety: string | null;
  growthStage: string;
  metric: MetricCode;
  unit: string;
  method: string;
  soilContext: string | null;
  lowerBound: number | null;
  upperBound: number | null;
  severity: ThresholdSeverity;
  durationMinutes: number;
  hysteresis: number;
  sourceUrl: string;
  reviewer: string;
  version: string;
  status: ThresholdStatus;
}

const severities: readonly ThresholdSeverity[] = ["info", "warning", "critical"];
const statuses: readonly ThresholdStatus[] = ["draft", "reviewed", "verified", "suspended"];

export function validateAgronomyThreshold(input: unknown): ValidationResult<AgronomyThreshold> {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ["/threshold must be an object"]
    };
  }

  const errors: string[] = [];
  const crop = readRequiredString(input, "crop", errors);
  const growthStage = readRequiredString(input, "growth_stage", errors);
  const metric = readMetric(input, errors);
  const unit = readRequiredString(input, "unit", errors);
  const method = readRequiredString(input, "method", errors);
  const lowerBound = readNullableNumber(input, "lower_bound", errors);
  const upperBound = readNullableNumber(input, "upper_bound", errors);
  const severity = readEnum(input, "severity", severities, errors);
  const durationMinutes = readPositiveInteger(input, "duration_minutes", errors);
  const hysteresis = readNonNegativeNumber(input, "hysteresis", errors);
  const sourceUrl = readRequiredString(input, "source_url", errors);
  const reviewer = readRequiredString(input, "reviewer", errors);
  const version = readRequiredString(input, "version", errors);
  const status = readEnum(input, "status", statuses, errors);

  if (["*", "all", "universal"].includes(crop.toLowerCase())) {
    errors.push("/crop must name a specific crop");
  }

  if (lowerBound === null && upperBound === null) {
    errors.push("/lower_bound or /upper_bound is required");
  }

  if (lowerBound !== null && upperBound !== null && lowerBound > upperBound) {
    errors.push("/lower_bound must be less than or equal to /upper_bound");
  }

  if (sourceUrl && !sourceUrl.startsWith("https://")) {
    errors.push("/source_url must be an https URL");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      crop,
      variety: readOptionalString(input, "variety"),
      growthStage,
      metric,
      unit,
      method,
      soilContext: readOptionalString(input, "soil_context"),
      lowerBound,
      upperBound,
      severity,
      durationMinutes,
      hysteresis,
      sourceUrl,
      reviewer,
      version,
      status
    }
  };
}

function readRequiredString(input: Record<string, unknown>, key: string, errors: string[]): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`/${key} is required`);
    return "";
  }

  return value.trim();
}

function readOptionalString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMetric(input: Record<string, unknown>, errors: string[]): MetricCode {
  const value = input.metric;
  if (typeof value !== "string" || !metricCodes.includes(value as MetricCode)) {
    errors.push("/metric must be supported");
    return "soil_temperature";
  }

  return value as MetricCode;
}

function readEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  values: readonly T[],
  errors: string[]
): T {
  const value = input[key];
  if (typeof value !== "string" || !values.includes(value as T)) {
    errors.push(`/${key} must be one of ${values.join(", ")}`);
    return values[0] as T;
  }

  return value as T;
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

function readPositiveInteger(input: Record<string, unknown>, key: string, errors: string[]): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    errors.push(`/${key} must be a positive integer`);
    return 1;
  }

  return value;
}

function readNonNegativeNumber(input: Record<string, unknown>, key: string, errors: string[]): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(`/${key} must be a non-negative number`);
    return 0;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
