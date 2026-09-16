import { computed, readonly, ref, watch, type ComputedRef } from "vue";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import idMessages from "./id.json";
import enMessages from "./en.json";

export type LocaleCode = "id" | "en";
export type DisplayLocale = "id-ID" | "en-US";
export type TranslationParams = Record<string, string | number | null | undefined>;

interface I18nIdentity {
  role?: "guest" | "tenant" | "superadmin";
  tenantId?: string | null;
  userKey?: string | null;
}

type MessageNode = string | MessageTree;

interface MessageTree {
  [key: string]: MessageNode;
}

const messages: Record<LocaleCode, MessageTree> = {
  en: enMessages,
  id: idMessages
};

const localeLabels: Record<LocaleCode, string> = {
  en: "EN - English",
  id: "ID - Indonesia"
};

const displayLocales: Record<LocaleCode, DisplayLocale> = {
  en: "en-US",
  id: "id-ID"
};

const defaultLocale: LocaleCode = "id";
const locale = ref<LocaleCode>(defaultLocale);
let activeIdentity: Required<I18nIdentity> = {
  role: "guest",
  tenantId: "",
  userKey: ""
};
let hasExplicitSessionChoice = false;
let syncLanguagePreference: ((language: LocaleCode) => Promise<boolean>) | null = null;

export const supportedLocales: readonly LocaleCode[] = ["en", "id"];
export const languageOptions: ReadonlyArray<{ label: string; value: LocaleCode }> = [
  { label: localeLabels.en, value: "en" },
  { label: localeLabels.id, value: "id" }
];

export function initI18n(): void {
  const stored = safeReadStorage(getStorageKey(activeIdentity));
  locale.value = normalizeLocale(stored) ?? defaultLocale;
  applyDocumentLanguage(locale.value);
}

export function setLanguagePreferenceSync(handler: (language: LocaleCode) => Promise<boolean>): void {
  syncLanguagePreference = handler;
}

export async function setLocale(nextLocale: string, options: { explicit?: boolean; syncAccount?: boolean } = {}): Promise<void> {
  const normalized = normalizeLocale(nextLocale) ?? defaultLocale;
  const previous = locale.value;
  locale.value = normalized;

  if (options.explicit !== false) {
    hasExplicitSessionChoice = true;
  }

  safeWriteStorage(getStorageKey(activeIdentity), normalized);
  applyDocumentLanguage(normalized);

  if (options.syncAccount !== false && syncLanguagePreference && normalized !== previous) {
    try {
      await syncLanguagePreference(normalized);
    } catch {
      // Local language choice remains active when account sync fails.
    }
  }
}

export function applyLocaleFromIdentity(identity: I18nIdentity, accountPreference?: string | null): void {
  activeIdentity = {
    role: identity.role ?? "guest",
    tenantId: identity.tenantId ?? "",
    userKey: identity.userKey ?? ""
  };

  if (hasExplicitSessionChoice) {
    safeWriteStorage(getStorageKey(activeIdentity), locale.value);
    return;
  }

  const accountLocale = normalizeLocale(accountPreference);
  const storedLocale = normalizeLocale(safeReadStorage(getStorageKey(activeIdentity)));
  locale.value = accountLocale ?? storedLocale ?? defaultLocale;
  applyDocumentLanguage(locale.value);
}

export function resetLocaleToGuest(): void {
  activeIdentity = {
    role: "guest",
    tenantId: "",
    userKey: ""
  };
  hasExplicitSessionChoice = false;
  locale.value = normalizeLocale(safeReadStorage(getStorageKey(activeIdentity))) ?? defaultLocale;
  applyDocumentLanguage(locale.value);
}

export function normalizeLocale(value: unknown): LocaleCode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace("_", "-");

  if (normalized === "id" || normalized === "id-id") {
    return "id";
  }

  if (normalized === "en" || normalized === "en-us") {
    return "en";
  }

  return null;
}

export function getCurrentLanguage(): LocaleCode {
  return locale.value;
}

export function getDisplayLocale(language: LocaleCode = locale.value): DisplayLocale {
  return displayLocales[language];
}

export function t(key: string, params: TranslationParams = {}, language: LocaleCode = locale.value): string {
  const value = resolveMessage(language, key) ?? resolveMessage(defaultLocale, key);

  if (typeof value !== "string") {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
    return "";
  }

  return interpolate(value, params);
}

export function tn(key: string, count: number, params: TranslationParams = {}, language: LocaleCode = locale.value): string {
  const category = new Intl.PluralRules(getDisplayLocale(language)).select(count);
  const exactKey = `${key}.${category}`;
  const fallbackKey = `${key}.other`;
  return t(resolveMessage(language, exactKey) ? exactKey : fallbackKey, { ...params, count }, language);
}

export function useI18n(): {
  displayLocale: ComputedRef<DisplayLocale>;
  locale: Readonly<typeof locale>;
  options: typeof languageOptions;
  t: typeof t;
  tn: typeof tn;
  setLocale: typeof setLocale;
} {
  return {
    displayLocale: computed(() => getDisplayLocale(locale.value)),
    locale: readonly(locale),
    options: languageOptions,
    setLocale,
    t,
    tn
  };
}

export function setupI18nRouter(router: Router): void {
  router.afterEach((route) => {
    updateDocumentTitle(route);
  });

  watch(locale, () => {
    applyDocumentLanguage(locale.value);
    updateDocumentTitle(router.currentRoute.value);
  });
}

export function routeMetaText(route: RouteLocationNormalizedLoaded, field: "title" | "subtitle"): string {
  const key = field === "title" ? route.meta.titleKey : route.meta.subtitleKey;

  if (typeof key === "string") {
    return t(key);
  }

  const fallback = route.meta[field];
  return typeof fallback === "string" ? fallback : "PAMILO";
}

function updateDocumentTitle(route: RouteLocationNormalizedLoaded): void {
  const title = routeMetaText(route, "title");
  document.title = title === "PAMILO" ? "PAMILO" : `${title} | PAMILO`;
}

function applyDocumentLanguage(language: LocaleCode): void {
  document.documentElement.lang = getDisplayLocale(language);
}

function resolveMessage(language: LocaleCode, key: string): MessageNode | undefined {
  const parts = key.split(".");
  let current: MessageNode | undefined = messages[language];

  for (const part of parts) {
    if (!current || typeof current === "string" || !(part in current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

function interpolate(value: string, params: TranslationParams): string {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const replacement = params[name];
    return replacement === null || replacement === undefined ? "" : String(replacement);
  });
}

function getStorageKey(identity: Required<I18nIdentity>): string {
  if (identity.role === "tenant" && identity.tenantId && identity.userKey) {
    return `pamilo.locale.tenant.${identity.tenantId}.${identity.userKey}`;
  }

  if (identity.role === "superadmin" && identity.userKey) {
    return `pamilo.locale.superadmin.${identity.userKey}`;
  }

  return "pamilo.locale.guest";
}

function safeReadStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Browsers can deny storage; the in-memory locale still changes.
  }
}
