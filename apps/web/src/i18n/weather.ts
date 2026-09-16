import type { BmkgForecastItem } from "../services/bmkgService";
import { getCurrentLanguage } from "./index";

export function getWeatherConditionLabel(item: Pick<BmkgForecastItem, "condition" | "conditionEn"> | null | undefined): string {
  if (!item) {
    return "";
  }

  return getCurrentLanguage() === "en" && item.conditionEn ? item.conditionEn : item.condition;
}
