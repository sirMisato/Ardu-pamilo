import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { JsonValue } from "../db/schema.js";
import { requireTenantContext, verifyTenant } from "../middleware/verifyTenant.js";

const plotPayloadSchema = z.object({
  areaHectares: z.preprocess(
    (value) => value === "" || value === undefined ? null : value,
    z.number().finite().nonnegative().nullable()
  ).optional(),
  bmkgAdm4Code: z.string().trim().max(32).optional().nullable(),
  cropId: z.string().trim().max(36).optional().nullable(),
  name: z.string().trim().min(1).max(160),
  polygonGeojson: z.unknown().optional()
});

const updatePlotPayloadSchema = plotPayloadSchema.partial();
const plotParamsSchema = z.object({
  plotId: z.string().trim().min(1).max(36)
});

type PlotPayload = z.infer<typeof plotPayloadSchema>;
type UpdatePlotPayload = z.infer<typeof updatePlotPayloadSchema>;

interface PlotRow {
  area_hectares: number | string | null;
  bmkg_adm4_code: string | null;
  created_at: Date | string;
  crop_id: string | null;
  crop_name: string | null;
  id: string;
  name: string;
  polygon_geojson: JsonValue | string;
  updated_at: Date | string;
}

export const plotRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.get("/plots", async (request) => {
    const tenant = requireTenantContext(request);
    const rows = await selectPlotsForTenant(tenant.tenantId);

    return rows.map(toPlotDto);
  });

  app.post<{ Body: PlotPayload }>("/plots", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = plotPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid plot payload",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const body = parsed.data;
    const cropId = await resolveCropIdForTenant(tenant.tenantId, body.cropId);
    if (cropId === undefined) {
      return reply.code(404).send({
        error: "Crop not found",
        message: "Crop yang dipilih tidak tersedia untuk tenant ini."
      });
    }

    const plotId = randomUUID();

    await db
      .insertInto("plots")
      .values({
        area_hectares: body.areaHectares ?? null,
        bmkg_adm4_code: normalizeNullableString(body.bmkgAdm4Code),
        crop_id: cropId,
        id: plotId,
        name: body.name,
        polygon_geojson: JSON.stringify(normalizePolygon(body.polygonGeojson)),
        tenant_id: tenant.tenantId
      })
      .execute();

    const row = await selectPlotForTenant(plotId, tenant.tenantId);

    return reply.code(201).send(row ? toPlotDto(row) : {
      id: plotId
    });
  });

  app.put<{ Body: UpdatePlotPayload; Params: { plotId: string } }>("/plots/:plotId", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = plotParamsSchema.safeParse(request.params);
    const body = updatePlotPayloadSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: "Invalid plot update",
        issues: {
          body: body.success ? undefined : body.error.flatten().fieldErrors,
          params: params.success ? undefined : params.error.flatten().fieldErrors
        }
      });
    }

    const cropId = "cropId" in body.data
      ? await resolveCropIdForTenant(tenant.tenantId, body.data.cropId)
      : null;
    if (cropId === undefined) {
      return reply.code(404).send({
        error: "Crop not found",
        message: "Crop yang dipilih tidak tersedia untuk tenant ini."
      });
    }

    const updateValues = toPlotUpdateValues(body.data, cropId);
    if (Object.keys(updateValues).length === 0) {
      return reply.code(400).send({
        error: "Empty update",
        message: "Minimal satu field zona/area harus dikirim."
      });
    }

    const result = await db
      .updateTable("plots")
      .set(updateValues)
      .where("id", "=", params.data.plotId)
      .where("tenant_id", "=", tenant.tenantId)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      return reply.code(404).send({
        error: "Plot not found",
        message: "Zona/area tidak tersedia untuk tenant ini."
      });
    }

    const row = await selectPlotForTenant(params.data.plotId, tenant.tenantId);

    return row ? toPlotDto(row) : reply.code(404).send({
      error: "Plot not found"
    });
  });

  app.delete<{ Params: { plotId: string } }>("/plots/:plotId", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = plotParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({
        error: "Invalid route params",
        issues: params.error.flatten().fieldErrors
      });
    }

    const device = await db
      .selectFrom("devices")
      .select("id")
      .where("tenant_id", "=", tenant.tenantId)
      .where("plot_id", "=", params.data.plotId)
      .executeTakeFirst();

    if (device) {
      return reply.code(409).send({
        error: "Plot has devices",
        message: "Hapus atau pindahkan perangkat pada zona ini sebelum menghapus area."
      });
    }

    const result = await db
      .deleteFrom("plots")
      .where("id", "=", params.data.plotId)
      .where("tenant_id", "=", tenant.tenantId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      return reply.code(404).send({
        error: "Plot not found",
        message: "Zona/area tidak tersedia untuk tenant ini."
      });
    }

    return reply.code(204).send();
  });
};

async function selectPlotsForTenant(tenantId: string): Promise<PlotRow[]> {
  return db
    .selectFrom("plots")
    .leftJoin("master_crops", (join) => join
      .onRef("master_crops.id", "=", "plots.crop_id")
      .on("master_crops.tenant_id", "=", tenantId))
    .select([
      "plots.area_hectares",
      "plots.bmkg_adm4_code",
      "plots.created_at",
      "plots.crop_id",
      "plots.id",
      "plots.name",
      "plots.polygon_geojson",
      "plots.updated_at",
      "master_crops.name as crop_name"
    ])
    .where("plots.tenant_id", "=", tenantId)
    .orderBy("plots.created_at", "desc")
    .execute();
}

async function selectPlotForTenant(plotId: string, tenantId: string): Promise<PlotRow | undefined> {
  return db
    .selectFrom("plots")
    .leftJoin("master_crops", (join) => join
      .onRef("master_crops.id", "=", "plots.crop_id")
      .on("master_crops.tenant_id", "=", tenantId))
    .select([
      "plots.area_hectares",
      "plots.bmkg_adm4_code",
      "plots.created_at",
      "plots.crop_id",
      "plots.id",
      "plots.name",
      "plots.polygon_geojson",
      "plots.updated_at",
      "master_crops.name as crop_name"
    ])
    .where("plots.id", "=", plotId)
    .where("plots.tenant_id", "=", tenantId)
    .executeTakeFirst();
}

async function resolveCropIdForTenant(tenantId: string, cropId: string | null | undefined): Promise<string | null | undefined> {
  const normalizedCropId = normalizeNullableString(cropId);
  if (!normalizedCropId) {
    return null;
  }

  const crop = await db
    .selectFrom("master_crops")
    .select("id")
    .where("id", "=", normalizedCropId)
    .where("tenant_id", "=", tenantId)
    .executeTakeFirst();

  return crop?.id;
}

function toPlotUpdateValues(plot: UpdatePlotPayload, resolvedCropId: string | null) {
  const values: Record<string, unknown> = {};

  if ("areaHectares" in plot) values.area_hectares = plot.areaHectares ?? null;
  if ("bmkgAdm4Code" in plot) values.bmkg_adm4_code = normalizeNullableString(plot.bmkgAdm4Code);
  if ("cropId" in plot) values.crop_id = resolvedCropId;
  if ("name" in plot && plot.name) values.name = plot.name;
  if ("polygonGeojson" in plot) values.polygon_geojson = JSON.stringify(normalizePolygon(plot.polygonGeojson));

  return values;
}

function toPlotDto(row: PlotRow) {
  const areaHectares = row.area_hectares === null ? null : Number(row.area_hectares);

  return {
    areaHectares: Number.isFinite(areaHectares) ? areaHectares : null,
    areaLabel: areaHectares === null || !Number.isFinite(areaHectares) ? "-" : `${areaHectares} ha`,
    bmkgAdm4Code: row.bmkg_adm4_code,
    createdAt: serializeDate(row.created_at),
    cropId: row.crop_id,
    cropName: row.crop_name,
    id: row.id,
    name: row.name,
    polygonGeojson: parseJson(row.polygon_geojson),
    regionLabel: row.bmkg_adm4_code ? `ADM4 ${row.bmkg_adm4_code}` : "BMKG belum diatur",
    updatedAt: serializeDate(row.updated_at)
  };
}

function normalizePolygon(value: unknown): JsonValue {
  return isJsonValue(value)
    ? value
    : {
        coordinates: [],
        type: "Polygon"
      };
}

function parseJson(value: JsonValue | string): JsonValue {
  if (typeof value !== "string") {
    return value;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isJsonValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || ["boolean", "number", "string"].includes(typeof value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
