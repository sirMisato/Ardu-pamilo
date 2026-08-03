import type { FastifyInstance, FastifyReply } from "fastify";
import type { TenantRole } from "@pamilo/shared";
import { fail, ok } from "../../lib/api-response.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { IdentityStore } from "./identity-store.js";
import { verifyPassword } from "./password.js";
import {
  csrfCookieName,
  getAuthenticatedContext,
  isValidCsrf,
  sessionCookieName,
  type AuthDependencies
} from "./request-auth.js";
import type { SessionStore } from "./session-store.js";
import type { SessionRecord, TenantMembership, TenantRecord, UserRecord } from "./types.js";

export interface AuthRouteDependencies extends AuthDependencies {
  auditLog: AuditLog;
  identityStore: IdentityStore;
  sessionStore: SessionStore;
}

interface LoginBody {
  email: string;
  password: string;
  tenant_id?: string;
}

interface AuthTenantPayload {
  id: string;
  name: string;
  role: TenantRole;
}

export async function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDependencies): Promise<void> {
  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = parseLoginBody(request.body);

    if (!body) {
      reply.code(400);
      return fail(request, "VALIDATION_FAILED", "Login request is invalid.");
    }

    const user = deps.identityStore.findUserByEmail(body.email);

    if (!user || user.status !== "active" || !verifyPassword(body.password, user.passwordHash)) {
      deps.auditLog.record({
        action: "auth.login_failed",
        actorUserId: user?.id ?? null,
        tenantId: null,
        objectType: "user",
        objectId: user?.id ?? null,
        requestId: request.id,
        metadata: {
          email: body.email
        }
      });

      reply.code(401);
      return fail(request, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    const membership = chooseMembership(deps.identityStore.listMembershipsForUser(user.id), body.tenant_id);
    if (!membership) {
      reply.code(403);
      return fail(request, "TENANT_NOT_ALLOWED", "User is not allowed to access the requested tenant.");
    }

    const tenant = deps.identityStore.findTenantById(membership.tenantId);
    if (!tenant || tenant.status !== "active") {
      reply.code(403);
      return fail(request, "TENANT_NOT_ALLOWED", "User is not allowed to access the requested tenant.");
    }

    const session = deps.sessionStore.create({
      userId: user.id,
      tenantId: membership.tenantId,
      role: membership.role
    });

    setSessionCookies(reply, session);

    deps.auditLog.record({
      action: "auth.login_success",
      actorUserId: user.id,
      tenantId: membership.tenantId,
      objectType: "session",
      objectId: session.id,
      requestId: request.id
    });

    return ok(
      request,
      buildMePayload(
        user,
        tenant,
        membership,
        session.csrfToken,
        deps.identityStore
      )
    );
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    if (!isValidCsrf(request, context.session)) {
      reply.code(403);
      return fail(request, "CSRF_FAILED", "CSRF token is missing or invalid.");
    }

    deps.sessionStore.revoke(context.session.id);
    clearSessionCookies(reply);

    deps.auditLog.record({
      action: "auth.logout",
      actorUserId: context.user.id,
      tenantId: context.tenant.id,
      objectType: "session",
      objectId: context.session.id,
      requestId: request.id
    });

    return ok(request, {
      logged_out: true
    });
  });

  app.get("/api/v1/me", async (request, reply) => {
    const context = getAuthenticatedContext(request, deps);

    if (!context) {
      reply.code(401);
      return fail(request, "UNAUTHENTICATED", "Authentication is required.");
    }

    return ok(
      request,
      buildMePayload(
        context.user,
        context.tenant,
        {
          userId: context.user.id,
          tenantId: context.tenant.id,
          role: context.session.role
        },
        context.session.csrfToken,
        deps.identityStore
      )
    );
  });
}

function parseLoginBody(body: unknown): LoginBody | null {
  if (!isRecord(body)) {
    return null;
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return null;
  }

  if ("tenant_id" in body && typeof body.tenant_id !== "string") {
    return null;
  }

  return {
    email: body.email,
    password: body.password,
    tenant_id: typeof body.tenant_id === "string" ? body.tenant_id : undefined
  };
}

function chooseMembership(memberships: TenantMembership[], requestedTenantId: string | undefined): TenantMembership | null {
  if (requestedTenantId) {
    return memberships.find((membership) => membership.tenantId === requestedTenantId) ?? null;
  }

  return memberships[0] ?? null;
}

function buildMePayload(
  user: UserRecord,
  tenant: TenantRecord,
  membership: TenantMembership,
  csrfToken: string,
  identityStore: IdentityStore
): {
  user: {
    id: string;
    email: string;
  };
  active_tenant: {
    id: string;
    name: string;
    role: TenantRole;
  };
  available_tenants: AuthTenantPayload[];
  csrf_token: string;
} {
  const availableTenants = identityStore
    .listMembershipsForUser(user.id)
    .map((candidate) => {
      const candidateTenant = identityStore.findTenantById(candidate.tenantId);

      if (!candidateTenant || candidateTenant.status !== "active") {
        return null;
      }

      return {
        id: candidateTenant.id,
        name: candidateTenant.name,
        role: candidate.role
      };
    })
    .filter((candidate): candidate is AuthTenantPayload => candidate !== null);

  return {
    user: {
      id: user.id,
      email: user.email
    },
    active_tenant: {
      id: tenant.id,
      name: tenant.name,
      role: membership.role
    },
    available_tenants: availableTenants,
    csrf_token: csrfToken
  };
}

function setSessionCookies(reply: FastifyReply, session: SessionRecord): void {
  const secure = process.env.NODE_ENV === "production";

  reply.setCookie(sessionCookieName, session.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure
  });

  reply.setCookie(csrfCookieName, session.csrfToken, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    secure
  });
}

function clearSessionCookies(reply: FastifyReply): void {
  reply.clearCookie(sessionCookieName, { path: "/" });
  reply.clearCookie(csrfCookieName, { path: "/" });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
