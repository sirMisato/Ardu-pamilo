import type { FastifyInstance } from "fastify";
import { buildDeviceMqttAccess, roleHasPermission } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { AuthDependencies } from "../auth/request-auth.js";
import { getAuthenticatedContext, isValidCsrf } from "../auth/request-auth.js";
import type { PlotRepository } from "../plots/plot-repository.js";
import {
  DuplicateDeviceSerialError,
  type DeviceProvisioningResult,
  type DeviceRecord,
  type DeviceRepository
} from "./device-repository.js";

export interface DeviceRouteDependencies extends AuthDependencies {
  auditLog: AuditLog;
  devices: DeviceRepository;
  plots: PlotRepository;
}

export async function registerDeviceRoutes(app: FastifyInstance, deps: DeviceRouteDependencies): Promise<void> {
  app.get("/api/v1/devices", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read devices.");
    }

    return ok(request, deps.devices.listForTenant(context.tenantContext).map(toDevicePayload));
  });

  app.get("/api/v1/plots/:plotId/devices", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read devices.");
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

    return ok(request, deps.devices.listForPlot(context.tenantContext, plot.id).map(toDevicePayload));
  });

  app.get("/api/v1/devices/:deviceId", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:read")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to read devices.");
    }

    const params = request.params;
    if (!isDeviceParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Device ID is required.");
    }

    const device = deps.devices.findByIdForTenant(context.tenantContext, params.deviceId);
    if (!device) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Device was not found.");
    }

    return ok(request, toDevicePayload(device));
  });

  app.post("/api/v1/plots/:plotId/devices", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:provision")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to provision devices.");
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

    const body = parseDeviceBody(request.body);
    if (!body.ok) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Device request is invalid.", body.errors.map((message) => ({
        path: "serial_no",
        message
      })));
    }

    try {
      const provisioning = deps.devices.provisionForPlot(context.tenantContext, {
        plotId: plot.id,
        serialNo: body.value.serialNo,
        label: body.value.label
      });

      deps.auditLog.record({
        action: "device.provisioned",
        actorUserId: context.user.id,
        tenantId: context.tenant.id,
        objectType: "device",
        objectId: provisioning.device.id,
        requestId: request.id,
        metadata: {
          plot_id: plot.id,
          credential_ref: provisioning.device.credentialRef
        }
      });

      reply.code(201);
      reply.header("cache-control", "no-store");
      return ok(request, toProvisioningPayload(provisioning));
    } catch (error) {
      if (error instanceof DuplicateDeviceSerialError) {
        reply.code(409);
        return fail(request, "DEVICE_SERIAL_CONFLICT", error.message);
      }

      throw error;
    }
  });

  app.patch("/api/v1/devices/:deviceId", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:provision")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to update devices.");
    }

    const params = request.params;
    if (!isDeviceParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Device ID is required.");
    }

    const body = parseDeviceUpdateBody(request.body);
    if (!body.ok) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Device update request is invalid.", body.errors);
    }

    if (body.value.plotId) {
      const plot = deps.plots.findByIdForTenant(context.tenantContext, body.value.plotId);
      if (!plot) {
        reply.code(404);
        return fail(request, "NOT_FOUND", "Target plot was not found.");
      }
    }

    const device = deps.devices.updateForTenant(context.tenantContext, params.deviceId, body.value);
    if (!device) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Device was not found.");
    }

    deps.auditLog.record({
      action: "device.updated",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "device",
      objectId: device.id,
      requestId: request.id,
      metadata: {
        plot_id: device.plotId
      }
    });

    return ok(request, toDevicePayload(device));
  });

  app.delete("/api/v1/devices/:deviceId", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:provision")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to delete devices.");
    }

    const params = request.params;
    if (!isDeviceParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Device ID is required.");
    }

    const device = deps.devices.deleteForTenant(context.tenantContext, params.deviceId);
    if (!device) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Device was not found.");
    }

    deps.auditLog.record({
      action: "device.deleted",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "device",
      objectId: device.id,
      requestId: request.id
    });

    return ok(request, toDevicePayload(device));
  });

  app.post("/api/v1/devices/:deviceId/revoke", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    if (!roleHasPermission(context.tenantContext.role, "device:provision")) {
      reply.code(403);
      return fail(request, "FORBIDDEN", "User is not allowed to revoke devices.");
    }

    const params = request.params;
    if (!isDeviceParams(params)) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Device ID is required.");
    }

    const device = deps.devices.revokeForTenant(context.tenantContext, params.deviceId);
    if (!device) {
      reply.code(404);
      return fail(request, "NOT_FOUND", "Device was not found.");
    }

    deps.auditLog.record({
      action: "device.revoked",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "device",
      objectId: device.id,
      requestId: request.id
    });

    return ok(request, toDevicePayload(device));
  });
}

function parseDeviceBody(body: unknown): {
  ok: true;
  value: {
    serialNo: string;
    label: string | null;
  };
} | { ok: false; errors: string[] } {
  if (!isRecord(body) || typeof body.serial_no !== "string") {
    return {
      ok: false,
      errors: ["/serial_no is required"]
    };
  }

  const serialNo = body.serial_no.trim();
  if (!serialNo) {
    return {
      ok: false,
      errors: ["/serial_no is required"]
    };
  }

  if (!/^[A-Za-z0-9._:-]+$/.test(serialNo)) {
    return {
      ok: false,
      errors: ["/serial_no contains unsupported characters"]
    };
  }

  return {
    ok: true,
    value: {
      serialNo,
      label: typeof body.label === "string" && body.label.trim()
        ? body.label.trim()
        : null
    }
  };
}

function parseDeviceUpdateBody(body: unknown): {
  ok: true;
  value: {
    label?: string | null;
    plotId?: string;
  };
} | { ok: false; errors: Array<{ path: string; message: string }> } {
  if (!isRecord(body)) {
    return {
      ok: false,
      errors: [
        {
          path: "body",
          message: "Request body is required."
        }
      ]
    };
  }

  const value: {
    label?: string | null;
    plotId?: string;
  } = {};
  const errors: Array<{ path: string; message: string }> = [];

  if ("label" in body) {
    if (body.label === null) {
      value.label = null;
    } else if (typeof body.label === "string") {
      value.label = body.label.trim() || null;
    } else {
      errors.push({
        path: "label",
        message: "Label must be a string or null."
      });
    }
  }

  if ("plot_id" in body) {
    if (typeof body.plot_id !== "string" || !body.plot_id.trim()) {
      errors.push({
        path: "plot_id",
        message: "Plot ID must be a non-empty string."
      });
    } else {
      value.plotId = body.plot_id.trim();
    }
  }

  if (!("label" in body) && !("plot_id" in body)) {
    errors.push({
      path: "body",
      message: "At least one mutable field is required."
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
    value
  };
}

function toProvisioningPayload(provisioning: DeviceProvisioningResult): ReturnType<typeof toDevicePayload> & {
  credential: {
    password: string;
    fingerprint: string;
    shown_once: true;
  };
  mosquitto_acl: readonly string[];
} {
  return {
    ...toDevicePayload(provisioning.device),
    credential: {
      password: provisioning.credential.password,
      fingerprint: provisioning.credential.fingerprint,
      shown_once: provisioning.credential.shownOnce
    },
    mosquitto_acl: provisioning.access.mosquittoAcl
  };
}

function toDevicePayload(device: DeviceRecord): {
  id: string;
  plot_id: string;
  serial_no: string;
  label: string | null;
  client_id: string;
  mqtt_username: string;
  credential_ref: string;
  credential_fingerprint: string;
  status: string;
  provisioned_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  topics: {
    publish: readonly string[];
    subscribe: readonly string[];
  };
} {
  const access = buildDeviceMqttAccess({
    tenantId: device.tenantId,
    deviceId: device.id,
    clientId: device.clientId,
    username: device.mqttUsername
  });

  return {
    id: device.id,
    plot_id: device.plotId,
    serial_no: device.serialNo,
    label: device.label,
    client_id: device.clientId,
    mqtt_username: device.mqttUsername,
    credential_ref: device.credentialRef,
    credential_fingerprint: device.credentialFingerprint,
    status: device.status,
    provisioned_at: device.provisionedAt,
    last_seen_at: device.lastSeenAt,
    revoked_at: device.revokedAt,
    topics: {
      publish: access.publishTopics,
      subscribe: access.subscribeTopics
    }
  };
}

function isPlotParams(params: unknown): params is { plotId: string } {
  return typeof params === "object" && params !== null && "plotId" in params && typeof params.plotId === "string";
}

function isDeviceParams(params: unknown): params is { deviceId: string } {
  return typeof params === "object" && params !== null && "deviceId" in params && typeof params.deviceId === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
