import type { FastifyInstance } from "fastify";
import { parsePolygonGeometry, roleHasPermission, type PolygonGeometry } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext, isValidCsrf } from "../auth/request-auth.js";
import type { FarmRepository } from "../farms/farm-repository.js";
import type { PlotRecord, PlotRepository } from "./plot-repository.js";

export interface PlotRouteDependencies extends AuthDependencies {
  auditLog: AuditLog;
  farms: FarmRepository;
  plots: PlotRepository;
}

export async function registerPlotRoutes(app: FastifyInstance, deps: PlotRouteDependencies): Promise<void> {
  app.get("/api/v1/farms/:farmId/plots", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read plots.");
    }

    const params = request.params;
    if (!isFarmParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Farm ID is required.");
    }

    const farm = deps.farms.findByIdForTenant(context.tenantContext, params.farmId);
    if (!farm) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Farm was not found.");
    }

    return ok(request, deps.plots.listForFarm(context.tenantContext, farm.id).map(toPlotPayload));
  });

  app.post("/api/v1/farms/:farmId/plots", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:write")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to create plots.");
    }

    const params = request.params;
    if (!isFarmParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Farm ID is required.");
    }

    const farm = deps.farms.findByIdForTenant(context.tenantContext, params.farmId);
    if (!farm) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Farm was not found.");
    }

    const body = parsePlotBody(request.body);
    if (!body.ok) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Plot request is invalid.", body.errors.map((message) => ({
        path: "geometry",
        message
      })));
    }

    const plot = deps.plots.createForFarm(context.tenantContext, {
      farmId: farm.id,
      name: body.value.name,
      geometry: body.value.geometry,
      adm4Code: body.value.adm4Code
    });

    deps.auditLog.record({
      action: "plot.created",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "plot",
      objectId: plot.id,
      requestId: request.id
    });

    reply.code(201);
    return ok(request, toPlotPayload(plot));
  });

  app.get("/api/v1/plots/:plotId", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read plots.");
    }

    const params = request.params;
    if (!isPlotParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Plot ID is required.");
    }

    const plot = deps.plots.findByIdForTenant(context.tenantContext, params.plotId);

    if (!plot) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Plot was not found.");
    }

    return ok(request, toPlotPayload(plot));
  });

  app.patch("/api/v1/plots/:plotId/geometry", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:write")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to update plot geometry.");
    }

    const params = request.params;
    if (!isPlotParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Plot ID is required.");
    }

    const body = parseGeometryBody(request.body);
    if (!body.ok) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Geometry request is invalid.", body.errors.map((message) => ({
        path: "geometry",
        message
      })));
    }

    const plot = deps.plots.updateGeometryForTenant(context.tenantContext, params.plotId, body.value);
    if (!plot) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Plot was not found.");
    }

    deps.auditLog.record({
      action: "plot.geometry_updated",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "plot",
      objectId: plot.id,
      requestId: request.id
    });

    return ok(request, toPlotPayload(plot));
  });
}

function parsePlotBody(body: unknown): {
  ok: true;
  value: {
    name: string;
    geometry: PolygonGeometry;
    adm4Code: string | null;
  };
} | { ok: false; errors: string[] } {
  if (!isRecord(body) || typeof body.name !== "string") {
    return {
      ok: false,
      errors: ["/name is required"]
    };
  }

  const geometryResult = parseGeometryBody(body);
  if (!geometryResult.ok) {
    return geometryResult;
  }

  const name = body.name.trim();
  if (!name) {
    return {
      ok: false,
      errors: ["/name is required"]
    };
  }

  return {
    ok: true,
    value: {
      name,
      geometry: geometryResult.value,
      adm4Code: typeof body.adm4_code === "string" && body.adm4_code.trim()
        ? body.adm4_code.trim()
        : null
    }
  };
}

function parseGeometryBody(body: unknown): { ok: true; value: PolygonGeometry } | { ok: false; errors: string[] } {
  if (!isRecord(body) || !("geometry" in body)) {
    return {
      ok: false,
      errors: ["/geometry is required"]
    };
  }

  return parsePolygonGeometry(body.geometry);
}

function toPlotPayload(plot: PlotRecord): {
  id: string;
  farm_id: string;
  name: string;
  geometry: PolygonGeometry;
  area_m2: number;
  area_ha: number;
  centroid: {
    lat: number;
    lng: number;
  };
  bbox: PlotRecord["bbox"];
  adm4_code: string | null;
  mapping_status: string;
} {
  return {
    id: plot.id,
    farm_id: plot.farmId,
    name: plot.name,
    geometry: plot.geometry,
    area_m2: plot.areaM2,
    area_ha: plot.areaHa,
    centroid: {
      lat: plot.centroidLat,
      lng: plot.centroidLng
    },
    bbox: plot.bbox,
    adm4_code: plot.adm4Code,
    mapping_status: plot.mappingStatus
  };
}

function isFarmParams(params: unknown): params is { farmId: string } {
  return typeof params === "object" && params !== null && "farmId" in params && typeof params.farmId === "string";
}

function isPlotParams(params: unknown): params is { plotId: string } {
  return typeof params === "object" && params !== null && "plotId" in params && typeof params.plotId === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
