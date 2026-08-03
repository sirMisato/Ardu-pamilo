import type { FastifyInstance } from "fastify";
import { roleHasPermission } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext, isValidCsrf } from "../auth/request-auth.js";
import type { FarmRecord, FarmRepository } from "./farm-repository.js";

export interface FarmRouteDependencies extends AuthDependencies {
  auditLog: AuditLog;
  farms: FarmRepository;
}

export async function registerFarmRoutes(app: FastifyInstance, deps: FarmRouteDependencies): Promise<void> {
  app.get("/api/v1/farms", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "farm:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read farms.");
    }

    return ok(request, deps.farms.listForTenant(context.tenantContext).map(toFarmPayload));
  });

  app.post("/api/v1/farms", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "farm:write")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to create farms.");
    }

    const body = parseFarmBody(request.body);
    if (!body) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Farm request is invalid.");
    }

    const farm = deps.farms.createForTenant(context.tenantContext, body);

    deps.auditLog.record({
      action: "farm.created",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "farm",
      objectId: farm.id,
      requestId: request.id
    });

    reply.code(201);
    return ok(request, toFarmPayload(farm));
  });
}

function parseFarmBody(body: unknown): { name: string; timezone: string } | null {
  if (!isRecord(body) || typeof body.name !== "string") {
    return null;
  }

  const name = body.name.trim();
  const timezone = typeof body.timezone === "string" && body.timezone.trim()
    ? body.timezone.trim()
    : "Asia/Jakarta";

  if (!name) {
    return null;
  }

  return {
    name,
    timezone
  };
}

function toFarmPayload(farm: FarmRecord): {
  id: string;
  name: string;
  timezone: string;
} {
  return {
    id: farm.id,
    name: farm.name,
    timezone: farm.timezone
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
