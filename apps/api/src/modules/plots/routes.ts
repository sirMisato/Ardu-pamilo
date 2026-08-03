import type { FastifyInstance } from "fastify";
import { roleHasPermission } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext } from "../auth/request-auth.js";
import type { PlotRepository } from "./plot-repository.js";

export interface PlotRouteDependencies extends AuthDependencies {
  plots: PlotRepository;
}

export async function registerPlotRoutes(app: FastifyInstance, deps: PlotRouteDependencies): Promise<void> {
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

    return ok(request, {
      id: plot.id,
      name: plot.name,
      area_m2: plot.areaM2,
      area_ha: plot.areaHa
    });
  });
}

function isPlotParams(params: unknown): params is { plotId: string } {
  return typeof params === "object" && params !== null && "plotId" in params && typeof params.plotId === "string";
}
