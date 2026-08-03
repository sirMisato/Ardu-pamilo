export type TenantRole = "farmer_owner" | "farmer_operator" | "platform_admin";

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
