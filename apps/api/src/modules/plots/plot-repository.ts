import { requireTenantContext, type TenantContext } from "@pamilo/shared";

export interface PlotRecord {
  id: string;
  tenantId: string;
  name: string;
  areaM2: number;
  areaHa: number;
}

export interface PlotRepository {
  findByIdForTenant(context: TenantContext, plotId: string): PlotRecord | null;
}

export class InMemoryPlotRepository implements PlotRepository {
  readonly #plots: PlotRecord[];

  constructor(plots: PlotRecord[] = defaultPlots()) {
    this.#plots = plots;
  }

  findByIdForTenant(context: TenantContext, plotId: string): PlotRecord | null {
    const tenantContext = requireTenantContext(context);
    const plot = this.#plots.find((candidate) => candidate.id === plotId);

    if (!plot || plot.tenantId !== tenantContext.tenantId) {
      return null;
    }

    return plot;
  }
}

function defaultPlots(): PlotRecord[] {
  return [
    {
      id: "plot-a",
      tenantId: "tenant-a",
      name: "Plot Tenant A",
      areaM2: 12000,
      areaHa: 1.2
    },
    {
      id: "plot-b",
      tenantId: "tenant-b",
      name: "Plot Tenant B",
      areaM2: 8000,
      areaHa: 0.8
    }
  ];
}
