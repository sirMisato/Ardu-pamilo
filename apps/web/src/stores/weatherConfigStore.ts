import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { TenantFieldProfile } from "./tenantProfileStore";

const storageKey = "pamilo.weather.configs";
const activeStorageKey = "pamilo.weather.activeConfigId";

export interface WeatherConfig {
  baseUrl: string;
  bmkgAdm4Code: string;
  fieldId: string;
  fieldName: string;
  id: string;
  isEnabled: boolean;
  name: string;
  notes: string;
  updatedAt: string;
}

export interface WeatherConfigInput {
  baseUrl: string;
  bmkgAdm4Code: string;
  fieldId: string;
  fieldName: string;
  isEnabled: boolean;
  name: string;
  notes: string;
}

export const useWeatherConfigStore = defineStore("weatherConfig", () => {
  const configs = ref<WeatherConfig[]>(readConfigs());
  const activeConfigId = ref(readActiveConfigId());

  const activeConfig = computed(() => {
    return configs.value.find((config) => config.id === activeConfigId.value && config.isEnabled)
      ?? configs.value.find((config) => config.isEnabled)
      ?? null;
  });

  const activeAdm4Code = computed(() => activeConfig.value?.bmkgAdm4Code ?? "");
  const activeBaseUrl = computed(() => activeConfig.value?.baseUrl ?? "");

  function ensureDefaults(fields: TenantFieldProfile[], defaultBaseUrl: string): void {
    if (configs.value.length > 0) {
      ensureActiveConfig();
      return;
    }

    configs.value = fields.map((field, index) => ({
      baseUrl: defaultBaseUrl,
      bmkgAdm4Code: field.bmkgAdm4Code,
      fieldId: field.id,
      fieldName: field.name,
      id: createId(),
      isEnabled: true,
      name: `BMKG ${field.name}`,
      notes: field.regionLabel,
      updatedAt: new Date().toISOString()
    }));
    activeConfigId.value = firstEnabledConfig(configs.value)?.id ?? "";
    persist();
  }

  function createConfig(input: WeatherConfigInput): WeatherConfig {
    const nextConfig: WeatherConfig = {
      ...normalizeInput(input),
      id: createId(),
      updatedAt: new Date().toISOString()
    };
    configs.value = [nextConfig, ...configs.value];

    if (nextConfig.isEnabled) {
      activeConfigId.value = nextConfig.id;
    }

    persist();
    return nextConfig;
  }

  function updateConfig(configId: string, input: WeatherConfigInput): void {
    configs.value = configs.value.map((config) => config.id === configId
      ? {
          ...config,
          ...normalizeInput(input),
          updatedAt: new Date().toISOString()
        }
      : config);
    ensureActiveConfig();
    persist();
  }

  function deleteConfig(configId: string): void {
    configs.value = configs.value.filter((config) => config.id !== configId);

    if (activeConfigId.value === configId) {
      activeConfigId.value = firstEnabledConfig(configs.value)?.id ?? "";
    }

    persist();
  }

  function setActiveConfig(configId: string): void {
    if (configs.value.some((config) => config.id === configId && config.isEnabled)) {
      activeConfigId.value = configId;
      persist();
    }
  }

  function ensureActiveConfig(): void {
    if (activeConfigId.value && configs.value.some((config) => config.id === activeConfigId.value && config.isEnabled)) {
      return;
    }

    activeConfigId.value = firstEnabledConfig(configs.value)?.id ?? "";
  }

  function persist(): void {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(configs.value));
    window.localStorage.setItem(activeStorageKey, activeConfigId.value);
  }

  return {
    activeAdm4Code,
    activeBaseUrl,
    activeConfig,
    activeConfigId,
    configs,
    createConfig,
    deleteConfig,
    ensureDefaults,
    setActiveConfig,
    updateConfig
  };
});

function normalizeInput(input: WeatherConfigInput): WeatherConfigInput {
  return {
    baseUrl: input.baseUrl.trim(),
    bmkgAdm4Code: input.bmkgAdm4Code.trim(),
    fieldId: input.fieldId,
    fieldName: input.fieldName.trim(),
    isEnabled: input.isEnabled,
    name: input.name.trim(),
    notes: input.notes.trim()
  };
}

function firstEnabledConfig(configs: WeatherConfig[]): WeatherConfig | undefined {
  return configs.find((config) => config.isEnabled);
}

function readConfigs(): WeatherConfig[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) as unknown : [];
    return Array.isArray(parsedValue) ? parsedValue.filter(isWeatherConfig) : [];
  } catch {
    return [];
  }
}

function readActiveConfigId(): string {
  if (!canUseStorage()) {
    return "";
  }

  return window.localStorage.getItem(activeStorageKey) ?? "";
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `weather-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isWeatherConfig(value: unknown): value is WeatherConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.name === "string"
    && typeof record.fieldId === "string"
    && typeof record.fieldName === "string"
    && typeof record.bmkgAdm4Code === "string"
    && typeof record.baseUrl === "string"
    && typeof record.isEnabled === "boolean";
}
