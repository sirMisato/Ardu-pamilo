import { describe, expect, it } from "vitest";
import { assertPermission, requireTenantContext, roleHasPermission } from "./tenancy.js";

describe("tenant contracts", () => {
  it("requires tenant context for tenant-owned operations", () => {
    expect(() => requireTenantContext(null)).toThrow("TenantContext is required");
  });

  it("maps permissions by role", () => {
    expect(roleHasPermission("farmer_owner", "device:provision")).toBe(true);
    expect(roleHasPermission("farmer_operator", "device:provision")).toBe(false);
  });

  it("throws when a role lacks a permission", () => {
    expect(() => assertPermission("farmer_operator", "plot:write")).toThrow("does not have permission");
  });
});
