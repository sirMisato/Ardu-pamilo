import type { FastifyRequest } from "fastify";

export interface ApiMeta {
  request_id: string;
  generated_at: string;
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Array<{
    path: string;
    message: string;
  }>;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: ApiMeta;
  error: ApiError | null;
}

export function ok<T>(request: FastifyRequest, data: T): ApiEnvelope<T> {
  return {
    data,
    meta: meta(request),
    error: null
  };
}

export function fail(request: FastifyRequest, code: string, message: string, fields?: ApiError["fields"]): ApiEnvelope<never> {
  return {
    data: null,
    meta: meta(request),
    error: {
      code,
      message,
      ...(fields ? { fields } : {})
    }
  };
}

function meta(request: FastifyRequest): ApiMeta {
  return {
    request_id: request.id,
    generated_at: new Date().toISOString()
  };
}
