import type { FastifyReply, FastifyRequest } from "fastify";
import { apiMessage } from "../i18n/messages.js";
import type { JwtTenantPayload } from "./verifyTenant.js";

export async function verifySuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtTenantPayload>();

    if (payload.role !== "super_admin") {
      await reply.code(403).send({
        error: "Forbidden",
        message: apiMessage(request.locale, "adminForbidden")
      });
      return;
    }

    request.tenant = {
      role: "super_admin",
      tenantId: payload.tenant_id ?? "platform",
      userId: payload.sub
    };
  } catch {
    await reply.code(401).send({
      error: "Unauthorized",
      message: apiMessage(request.locale, "adminTokenRequired")
    });
  }
}
