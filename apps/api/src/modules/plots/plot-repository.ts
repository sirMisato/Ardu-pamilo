import { randomUUID } from "node:crypto";
import {
  parsePolygonGeometry,
  requireTenantContext,
  summarizePolygonGeometry,
  type PolygonGeometry,
  type TenantContext
} from "@pamilo/shared";

export type MappingStatus = "verified" | "needs_review" | "unmapped";

export interface PlotRecord {
  id: string;
  tenantId: string;
  farmId: string;
  name: string;
  geometry: PolygonGeometry;
  areaM2: number;
  areaHa: number;
  centroidLat: number;
  centroidLng: number;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  adm4Code: string | null;
  mappingStatus: MappingStatus;
}

export interface PlotRepository {
  createForFarm(context: TenantContext, input: {
    farmId: string;
    name: string;
    geometry: PolygonGeometry;
    adm4Code?: string | null;
  }): PlotRecord;
  findByIdForTenant(context: TenantContext, plotId: string): PlotRecord | null;
  listForFarm(context: TenantContext, farmId: string): PlotRecord[];
  updateGeometryForTenant(context: TenantContext, plotId: string, geometry: PolygonGeometry): PlotRecord | null;
}

export class InMemoryPlotRepository implements PlotRepository {
  readonly #plots: PlotRecord[];

  constructor(plots: PlotRecord[] = defaultPlots()) {
    this.#plots = [...plots];
  }

  createForFarm(
    context: TenantContext,
    input: {
      farmId: string;
      name: string;
      geometry: PolygonGeometry;
      adm4Code?: string | null;
    }
  ): PlotRecord {
    const tenantContext = requireTenantContext(context);
    const plot = buildPlotRecord({
      id: `plot-${randomUUID()}`,
      tenantId: tenantContext.tenantId,
      farmId: input.farmId,
      name: input.name,
      geometry: input.geometry,
      adm4Code: input.adm4Code ?? null,
      mappingStatus: input.adm4Code ? "verified" : "unmapped"
    });

    this.#plots.push(plot);
    return plot;
  }

  findByIdForTenant(context: TenantContext, plotId: string): PlotRecord | null {
    const tenantContext = requireTenantContext(context);
    const plot = this.#plots.find((candidate) => candidate.id === plotId);

    if (!plot || plot.tenantId !== tenantContext.tenantId) {
      return null;
    }

    return plot;
  }

  listForFarm(context: TenantContext, farmId: string): PlotRecord[] {
    const tenantContext = requireTenantContext(context);
    return this.#plots.filter((plot) => plot.tenantId === tenantContext.tenantId && plot.farmId === farmId);
  }

  updateGeometryForTenant(context: TenantContext, plotId: string, geometry: PolygonGeometry): PlotRecord | null {
    const tenantContext = requireTenantContext(context);
    const index = this.#plots.findIndex((candidate) => candidate.id === plotId && candidate.tenantId === tenantContext.tenantId);

    if (index < 0) {
      return null;
    }

    const existing = this.#plots[index];
    if (!existing) {
      return null;
    }

    const updated = buildPlotRecord({
      ...existing,
      geometry
    });

    this.#plots[index] = updated;
    return updated;
  }
}

export function defaultPlots(): PlotRecord[] {
  return [
    buildPlotRecord({
      id: "plot-a",
      tenantId: "tenant-a",
      farmId: "farm-a",
      name: "Plot Tenant A",
      geometry: mustParseGeometry({
        type: "Polygon",
        coordinates: [
          [
            [106.8, -6.2],
            [106.81, -6.2],
            [106.81, -6.19],
            [106.8, -6.19],
            [106.8, -6.2]
          ]
        ]
      }),
      adm4Code: null,
      mappingStatus: "unmapped"
    }),
    buildPlotRecord({
      id: "plot-b",
      tenantId: "tenant-b",
      farmId: "farm-b",
      name: "Plot Tenant B",
      geometry: mustParseGeometry({
        type: "Polygon",
        coordinates: [
          [
            [110.3, -7.8],
            [110.31, -7.8],
            [110.31, -7.79],
            [110.3, -7.79],
            [110.3, -7.8]
          ]
        ]
      }),
      adm4Code: null,
      mappingStatus: "unmapped"
    })
  ];
}

function buildPlotRecord(input: {
  id: string;
  tenantId: string;
  farmId: string;
  name: string;
  geometry: PolygonGeometry;
  adm4Code: string | null;
  mappingStatus: MappingStatus;
}): PlotRecord {
  const summary = summarizePolygonGeometry(input.geometry);

  return {
    id: input.id,
    tenantId: input.tenantId,
    farmId: input.farmId,
    name: input.name,
    geometry: summary.geometry,
    areaM2: summary.areaM2,
    areaHa: summary.areaHa,
    centroidLat: summary.centroid.lat,
    centroidLng: summary.centroid.lng,
    bbox: summary.bbox,
    adm4Code: input.adm4Code,
    mappingStatus: input.mappingStatus
  };
}

function mustParseGeometry(input: unknown): PolygonGeometry {
  const parsed = parsePolygonGeometry(input);
  if (!parsed.ok) {
    throw new Error(parsed.errors.join(", "));
  }

  return parsed.value;
}
