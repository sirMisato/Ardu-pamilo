import type { FastifyInstance, FastifyRequest } from "fastify";
import { fail } from "./api-response.js";

export const defaultBodyLimitBytes = 256 * 1024;

export function resolveBodyLimitBytes(): number {
  const configured = Number(process.env.API_BODY_LIMIT_BYTES);

  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }

  return defaultBodyLimitBytes;
}

export function registerSecurityHardening(app: FastifyInstance): void {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    reply.header("cross-origin-resource-policy", "same-origin");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

    if (process.env.NODE_ENV === "production") {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404);
    return fail(request, "NOT_FOUND", "Route was not found.");
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = httpStatusCode(error);

    if (statusCode === 413) {
      reply.code(413);
      return fail(request, "PAYLOAD_TOO_LARGE", "Request payload is too large.");
    }

    if (statusCode >= 400 && statusCode < 500) {
      reply.code(statusCode);
      return fail(request, "REQUEST_FAILED", "Request is invalid.");
    }

    request.log.error({
      error_code: errorCode(error),
      request_id: request.id
    }, "request failed");
    reply.code(500);
    return fail(request, "INTERNAL_SERVER_ERROR", "An internal server error occurred.");
  });
}

function httpStatusCode(error: unknown): number {
  if (!isErrorLike(error)) {
    return 500;
  }

  if (typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600) {
    return error.statusCode;
  }

  return 500;
}

function errorCode(error: unknown): string {
  if (!isErrorLike(error) || typeof error.code !== "string") {
    return "UNKNOWN";
  }

  return error.code;
}

function isErrorLike(error: unknown): error is { code?: unknown; statusCode?: unknown } {
  return typeof error === "object" && error !== null;
}

export function isTrustedRequestOrigin(request: FastifyRequest): boolean {
  const origin = readHeader(request.headers.origin);

  if (!origin) {
    return true;
  }

  const host = readHeader(request.headers.host);
  const originHost = parseOriginHost(origin);

  if (!originHost) {
    return false;
  }

  if (host && originHost === host.toLowerCase()) {
    return true;
  }

  return trustedOrigins().includes(origin.toLowerCase());
}

function trustedOrigins(): string[] {
  const configured = process.env.API_TRUSTED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim().toLowerCase())
    .filter(Boolean) ?? [];

  if (process.env.NODE_ENV === "production") {
    return configured;
  }

  return [
    ...configured,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];
}

function parseOriginHost(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function readHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim().toLowerCase() ?? null;
  }

  return value?.trim().toLowerCase() ?? null;
}
