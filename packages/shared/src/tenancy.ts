export type TenantRole = "farmer_owner" | "farmer_operator" | "platform_admin";

export type Permission =
  | "tenant:read"
  | "plot:read"
  | "plot:write"
  | "device:provision"
  | "platform:admin";

export const rolePermissions: Record<TenantRole, readonly Permission[]> = {
  farmer_owner: ["tenant:read", "plot:read", "plot:write", "device:provision"],
  farmer_operator: ["tenant:read", "plot:read"],
  platform_admin: ["tenant:read", "plot:read", "plot:write", "device:provision", "platform:admin"]
};

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: TenantRole;
}

export function requireTenantContext(context: TenantContext | null | undefined): TenantContext {
  if (!context?.tenantId || !context.userId) {
    throw new Error("TenantContext is required for tenant-owned operations.");
  }

  return context;
}

export function roleHasPermission(role: TenantRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function assertPermission(role: TenantRole, permission: Permission): void {
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Role ${role} does not have permission ${permission}.`);
  }
}
