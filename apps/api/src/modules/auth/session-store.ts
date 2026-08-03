import { randomBytes, randomUUID } from "node:crypto";
import type { TenantRole } from "@pamilo/shared";
import type { SessionRecord } from "./types.js";

export interface SessionStore {
  create(input: {
    userId: string;
    tenantId: string;
    role: TenantRole;
  }): SessionRecord;
  findActive(sessionId: string): SessionRecord | null;
  revoke(sessionId: string): void;
}

export class InMemorySessionStore implements SessionStore {
  readonly #sessions = new Map<string, SessionRecord>();

  create(input: { userId: string; tenantId: string; role: TenantRole }): SessionRecord {
    const session: SessionRecord = {
      id: randomUUID(),
      userId: input.userId,
      tenantId: input.tenantId,
      role: input.role,
      csrfToken: randomBytes(32).toString("base64url"),
      createdAt: new Date().toISOString(),
      revokedAt: null
    };

    this.#sessions.set(session.id, session);
    return session;
  }

  findActive(sessionId: string): SessionRecord | null {
    const session = this.#sessions.get(sessionId);
    if (!session || session.revokedAt) {
      return null;
    }

    return session;
  }

  revoke(sessionId: string): void {
    const session = this.#sessions.get(sessionId);
    if (!session || session.revokedAt) {
      return;
    }

    this.#sessions.set(sessionId, {
      ...session,
      revokedAt: new Date().toISOString()
    });
  }
}
