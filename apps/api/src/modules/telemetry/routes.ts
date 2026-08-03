import type { FastifyInstance } from "fastify";
import { metricCodes, roleHasPermission, type MetricCode } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext } from "../auth/request-auth.js";
import type { PlotRepository } from "../plots/plot-repository.js";
import type { TelemetryReadingRecord, TelemetryRepository } from "./telemetry-repository.js";

const supportedResolutions = new Set(["raw", "5m", "15m", "1h"]);

export interface TelemetryRouteDependencies extends AuthDependencies {
  plots: PlotRepository;
  telemetry: TelemetryRepository;
}

export async function registerTelemetryRoutes(app: FastifyInstance, deps: TelemetryRouteDependencies): Promise<void> {
  app.get("/api/v1/plots/:plotId/telemetry/latest", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read telemetry.");
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

    const latest = await deps.telemetry.listLatestForPlot(context.tenantContext, plot.id);

    return ok(request, latest.map(toTelemetryPayload));
  });

  app.get("/api/v1/plots/:plotId/telemetry/history", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "plot:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read telemetry.");
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

    const query = parseHistoryQuery(request.query);
    if (!query.ok) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Telemetry history query is invalid.", query.errors);
    }

    const points = await deps.telemetry.queryHistoryForPlot(context.tenantContext, {
      plotId: plot.id,
      metric: query.value.metric,
      from: query.value.from,
      to: query.value.to,
      resolution: query.value.resolution
    });

    return ok(request, {
      metric: query.value.metric,
      from: query.value.from,
      to: query.value.to,
      resolution: query.value.resolution,
      points: points.map(toTelemetryPayload)
    });
  });
}

function parseHistoryQuery(query: unknown): {
  ok: true;
  value: {
    metric: MetricCode;
    from: string;
    to: string;
    resolution: string;
  };
} | {
  ok: false;
  errors: Array<{ path: string; message: string }>;
} {
  const errors: Array<{ path: string; message: string }> = [];

  if (!isRecord(query)) {
    return {
      ok: false,
      errors: [
        {
          path: "query",
          message: "Query parameters are required."
        }
      ]
    };
  }

  const metric = typeof query.metric === "string" ? query.metric : "";
  const from = typeof query.from === "string" ? query.from : "";
  const to = typeof query.to === "string" ? query.to : "";
  const resolution = typeof query.resolution === "string" ? query.resolution : "";

  if (!metricCodes.includes(metric as MetricCode)) {
    errors.push({
      path: "metric",
      message: "Metric is required and must be supported."
    });
  }

  if (!isValidDateTime(from)) {
    errors.push({
      path: "from",
      message: "From must be a valid date-time."
    });
  }

  if (!isValidDateTime(to)) {
    errors.push({
      path: "to",
      message: "To must be a valid date-time."
    });
  }

  if (from && to && isValidDateTime(from) && isValidDateTime(to) && Date.parse(from) > Date.parse(to)) {
    errors.push({
      path: "from",
      message: "From must be before or equal to to."
    });
  }

  if (!supportedResolutions.has(resolution)) {
    errors.push({
      path: "resolution",
      message: "Resolution must be one of raw, 5m, 15m, or 1h."
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      metric: metric as MetricCode,
      from,
      to,
      resolution
    }
  };
}

function toTelemetryPayload(reading: TelemetryReadingRecord): {
  device_id: string;
  node_id: string;
  metric: MetricCode;
  ts: string;
  seq: number;
  value: number | null;
  unit: string;
  calibration_profile: string;
  quality_flags: string[];
} {
  return {
    device_id: reading.deviceId,
    node_id: reading.nodeId,
    metric: reading.metric,
    ts: reading.ts,
    seq: reading.seq,
    value: reading.value,
    unit: reading.unit,
    calibration_profile: reading.calibrationProfile,
    quality_flags: reading.qualityFlags
  };
}

function isPlotParams(params: unknown): params is { plotId: string } {
  return typeof params === "object" && params !== null && "plotId" in params && typeof params.plotId === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDateTime(value: string): boolean {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}
