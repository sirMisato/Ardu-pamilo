import { computed } from "vue";
import { getDisplayLocale, t, type LocaleCode } from "./index";

export interface PercentFormatOptions {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  valueKind?: "percent" | "ratio";
}

export function formatNumber(value: number | null | undefined, options: Intl.NumberFormatOptions = {}, language?: LocaleCode): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t("format.nullValue");
  }

  return new Intl.NumberFormat(getDisplayLocale(language), options).format(value);
}

export function formatPercent(value: number | null | undefined, options: PercentFormatOptions = {}, language?: LocaleCode): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t("format.nullValue");
  }

  const normalized = options.valueKind === "ratio" ? value : value / 100;
  return new Intl.NumberFormat(getDisplayLocale(language), {
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
    minimumFractionDigits: options.minimumFractionDigits,
    style: "percent"
  }).format(normalized);
}

export function formatDateTime(value: Date | string | number | null | undefined, options: Intl.DateTimeFormatOptions = {}, language?: LocaleCode): string {
  const date = normalizeDate(value);

  if (!date) {
    return t("format.nullValue");
  }

  return new Intl.DateTimeFormat(getDisplayLocale(language), options).format(date);
}

export function formatDateRange(
  start: Date | string | number | null | undefined,
  end: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
  language?: LocaleCode
): string {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);

  if (!startDate || !endDate) {
    return t("format.nullValue");
  }

  return new Intl.DateTimeFormat(getDisplayLocale(language), options).formatRange(startDate, endDate);
}

export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, language?: LocaleCode): string {
  return new Intl.RelativeTimeFormat(getDisplayLocale(language), {
    numeric: "auto"
  }).format(value, unit);
}

export function formatDataCount(value: number | null | undefined, language?: LocaleCode): string {
  return formatNumber(value, {
    maximumFractionDigits: 0
  }, language);
}

export function formatDurationMinutes(value: number | null | undefined, language?: LocaleCode): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t("format.nullValue");
  }

  if (value < 60) {
    return t("format.durationMinute", { count: formatNumber(value, { maximumFractionDigits: 0 }, language) });
  }

  if (value < 1440) {
    return t("format.durationHour", { count: formatNumber(value / 60, { maximumFractionDigits: 1 }, language) });
  }

  return t("format.durationDay", { count: formatNumber(value / 1440, { maximumFractionDigits: 1 }, language) });
}

export function formatCropAge(daysAfterPlanting: number | null | undefined, language?: LocaleCode): string {
  if (daysAfterPlanting === null || daysAfterPlanting === undefined || Number.isNaN(daysAfterPlanting)) {
    return t("format.cropAgeUnavailable");
  }

  return t("format.dayAfterPlanting", {
    count: formatNumber(daysAfterPlanting, { maximumFractionDigits: 0 }, language)
  });
}

export function useFormatters() {
  return computed(() => ({
    dataCount: formatDataCount,
    dateRange: formatDateRange,
    dateTime: formatDateTime,
    durationMinutes: formatDurationMinutes,
    number: formatNumber,
    percent: formatPercent,
    relativeTime: formatRelativeTime
  }));
}

function normalizeDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
