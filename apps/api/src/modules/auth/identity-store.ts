import { hashPassword } from "./password.js";
import type { TenantMembership, TenantRecord, UserRecord } from "./types.js";

export interface IdentityStore {
  findUserByEmail(email: string): UserRecord | null;
  findUserById(userId: string): UserRecord | null;
  findTenantById(tenantId: string): TenantRecord | null;
  listMembershipsForUser(userId: string): TenantMembership[];
}

export class InMemoryIdentityStore implements IdentityStore {
  readonly #users: UserRecord[];
  readonly #tenants: TenantRecord[];
  readonly #memberships: TenantMembership[];

  constructor(seed?: {
    users?: UserRecord[];
    tenants?: TenantRecord[];
    memberships?: TenantMembership[];
  }) {
    this.#users = seed?.users ?? defaultUsers();
    this.#tenants = seed?.tenants ?? defaultTenants();
    this.#memberships = seed?.memberships ?? defaultMemberships();
  }

  findUserByEmail(email: string): UserRecord | null {
    return this.#users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  findUserById(userId: string): UserRecord | null {
    return this.#users.find((user) => user.id === userId) ?? null;
  }

  findTenantById(tenantId: string): TenantRecord | null {
    return this.#tenants.find((tenant) => tenant.id === tenantId) ?? null;
  }

  listMembershipsForUser(userId: string): TenantMembership[] {
    return this.#memberships.filter((membership) => membership.userId === userId);
  }
}

function defaultUsers(): UserRecord[] {
  const password = "local-demo-password";

  return [
    {
      id: "user-farmer-a",
      email: "farmer-a@example.test",
      passwordHash: hashPassword(password, "local-farmer-a"),
      status: "active"
    },
    {
      id: "user-operator-a",
      email: "operator-a@example.test",
      passwordHash: hashPassword(password, "local-operator-a"),
      status: "active"
    },
    {
      id: "user-farmer-b",
      email: "farmer-b@example.test",
      passwordHash: hashPassword(password, "local-farmer-b"),
      status: "active"
    },
    {
      id: "user-platform-admin",
      email: "platform-admin@example.test",
      passwordHash: hashPassword(password, "local-platform-admin"),
      status: "active"
    }
  ];
}

function defaultTenants(): TenantRecord[] {
  return [
    {
      id: "tenant-a",
      name: "Tenant A",
      status: "active"
    },
    {
      id: "tenant-b",
      name: "Tenant B",
      status: "active"
    }
  ];
}

function defaultMemberships(): TenantMembership[] {
  return [
    {
      userId: "user-farmer-a",
      tenantId: "tenant-a",
      role: "farmer_owner"
    },
    {
      userId: "user-operator-a",
      tenantId: "tenant-a",
      role: "farmer_operator"
    },
    {
      userId: "user-farmer-b",
      tenantId: "tenant-b",
      role: "farmer_owner"
    },
    {
      userId: "user-platform-admin",
      tenantId: "tenant-a",
      role: "platform_admin"
    }
  ];
}
