import type { TenantRole } from "@pamilo/shared";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  status: "active" | "disabled";
}

export interface TenantRecord {
  id: string;
  name: string;
  status: "active" | "disabled";
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantRole;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  csrfToken: string;
  createdAt: string;
  revokedAt: string | null;
}
