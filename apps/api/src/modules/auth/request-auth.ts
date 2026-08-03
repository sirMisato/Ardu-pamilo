import type { FastifyRequest } from "fastify";
import type { TenantContext } from "@pamilo/shared";
import type { IdentityStore } from "./identity-store.js";
import type { SessionStore } from "./session-store.js";
import type { SessionRecord, TenantRecord, UserRecord } from "./types.js";

export const sessionCookieName = "pamilo_session";
export const csrfCookieName = "pamilo_csrf";
export const csrfHeaderName = "x-csrf-token";

export interface AuthDependencies {
  identityStore: IdentityStore;
  sessionStore: SessionStore;
}

export interface AuthenticatedContext {
  session: SessionRecord;
  user: UserRecord;
  tenant: TenantRecord;
  tenantContext: TenantContext;
}

export function getAuthenticatedContext(request: FastifyRequest, deps: AuthDependencies): AuthenticatedContext | null {
  const sessionId = request.cookies[sessionCookieName];

  if (!sessionId) {
    return null;
  }

  const session = deps.sessionStore.findActive(sessionId);
  if (!session) {
    return null;
  }

  const user = deps.identityStore.findUserById(session.userId);
  const tenant = deps.identityStore.findTenantById(session.tenantId);

  if (!user || user.status !== "active" || !tenant || tenant.status !== "active") {
    return null;
  }

  return {
    session,
    user,
    tenant,
    tenantContext: {
      tenantId: session.tenantId,
      userId: session.userId,
      role: session.role
    }
  };
}

export function isValidCsrf(request: FastifyRequest, session: SessionRecord): boolean {
  const header = request.headers[csrfHeaderName];
  return typeof header === "string" && header.length > 0 && header === session.csrfToken;
}
