export interface AuditEvent {
  id: string;
  action: string;
  actorUserId: string | null;
  tenantId: string | null;
  objectType: string;
  objectId: string | null;
  requestId: string | null;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuditLog {
  record(event: Omit<AuditEvent, "id" | "createdAt">): AuditEvent;
  all(): AuditEvent[];
}

export class InMemoryAuditLog implements AuditLog {
  readonly #events: AuditEvent[] = [];

  record(event: Omit<AuditEvent, "id" | "createdAt">): AuditEvent {
    const nextEvent: AuditEvent = {
      ...event,
      id: `audit-${this.#events.length + 1}`,
      createdAt: new Date().toISOString()
    };

    this.#events.push(nextEvent);
    return nextEvent;
  }

  all(): AuditEvent[] {
    return [...this.#events];
  }
}
