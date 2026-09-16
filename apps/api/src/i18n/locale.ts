import type { FastifyInstance, FastifyRequest } from "fastify";

export type LocaleCode = "id" | "en";

export const defaultLocale: LocaleCode = "id";

declare module "fastify" {
  interface FastifyRequest {
    locale: LocaleCode;
  }
}

export function registerLocaleResolver(app: FastifyInstance): void {
  app.decorateRequest("locale", defaultLocale);
  app.addHook("onRequest", async (request) => {
    request.locale = resolveRequestLocale(request);
  });
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

function resolveRequestLocale(request: FastifyRequest): LocaleCode {
  return normalizeLocale(request.headers["x-pamilo-locale"])
    ?? normalizeLocale(request.headers["accept-language"])
    ?? defaultLocale;
}
