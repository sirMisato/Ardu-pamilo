import type { FastifyReply, FastifyRequest } from "fastify";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: "tenant_admin" | "tenant_user" | "super_admin";
}

export interface JwtTenantPayload {
  sub: string;
  tenant_id?: string;
  role?: TenantContext["role"];
}

declare module "fastify" {
  interface FastifyRequest {
    tenant: TenantContext | null;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtTenantPayload;
    user: JwtTenantPayload;
  }
}

export async function verifyTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtTenantPayload>();

    if (!payload.tenant_id) {
      await reply.code(403).send({
        error: "Tenant context missing",
        message: "JWT must include tenant_id for tenant-scoped operations."
      });
      return;
    }

    request.tenant = {
      role: payload.role ?? "tenant_user",
      tenantId: payload.tenant_id,
      userId: payload.sub
    };
  } catch {
    await reply.code(401).send({
      error: "Unauthorized",
      message: "A valid bearer token is required."
    });
  }
}

export function requireTenantContext(request: FastifyRequest): TenantContext {
  if (!request.tenant) {
    throw new Error("TenantContext is unavailable. Did you forget verifyTenant?");
  }

  return request.tenant;
}

export async function verifyTenantAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenant = requireTenantContext(request);

  if (tenant.role !== "tenant_admin") {
    await reply.code(403).send({
      error: "Read-only tenant",
      message: "User read-only hanya dapat melihat Dashboard, Weather Station, Grafik, dan Report."
    });
  }
}
