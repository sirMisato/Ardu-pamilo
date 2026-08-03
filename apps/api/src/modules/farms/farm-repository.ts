import { randomUUID } from "node:crypto";
import { requireTenantContext, type TenantContext } from "@pamilo/shared";

export interface FarmRecord {
  id: string;
  tenantId: string;
  name: string;
  timezone: string;
}

export interface FarmRepository {
  createForTenant(context: TenantContext, input: { name: string; timezone: string }): FarmRecord;
  findByIdForTenant(context: TenantContext, farmId: string): FarmRecord | null;
  listForTenant(context: TenantContext): FarmRecord[];
}

export class InMemoryFarmRepository implements FarmRepository {
  readonly #farms: FarmRecord[];

  constructor(farms: FarmRecord[] = defaultFarms()) {
    this.#farms = [...farms];
  }

  createForTenant(context: TenantContext, input: { name: string; timezone: string }): FarmRecord {
    const tenantContext = requireTenantContext(context);
    const farm: FarmRecord = {
      id: `farm-${randomUUID()}`,
      tenantId: tenantContext.tenantId,
      name: input.name,
      timezone: input.timezone
    };

    this.#farms.push(farm);
    return farm;
  }

  findByIdForTenant(context: TenantContext, farmId: string): FarmRecord | null {
    const tenantContext = requireTenantContext(context);
    return this.#farms.find((farm) => farm.id === farmId && farm.tenantId === tenantContext.tenantId) ?? null;
  }

  listForTenant(context: TenantContext): FarmRecord[] {
    const tenantContext = requireTenantContext(context);
    return this.#farms.filter((farm) => farm.tenantId === tenantContext.tenantId);
  }
}

export function defaultFarms(): FarmRecord[] {
  return [
    {
      id: "farm-a",
      tenantId: "tenant-a",
      name: "Farm Tenant A",
      timezone: "Asia/Jakarta"
    },
    {
      id: "farm-b",
      tenantId: "tenant-b",
      name: "Farm Tenant B",
      timezone: "Asia/Jakarta"
    }
  ];
}
