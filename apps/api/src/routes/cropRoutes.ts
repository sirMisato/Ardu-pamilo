import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { CropStatus, JsonValue, MasterCrop } from "../db/schema.js";
import { requireTenantContext, verifyTenant } from "../middleware/verifyTenant.js";

const cropStatusSchema = z.enum(["active", "draft", "archived"]);
const thresholdValueSchema = z.number().finite().nullable().optional();
const cropPayloadSchema = z.object({
  description: z.string().max(3000).optional().nullable(),
  latinName: z.string().trim().max(160).optional().nullable(),
  name: z.string().trim().min(1).max(120),
  plantingPeriodDays: z.number().int().positive().optional().nullable(),
  status: cropStatusSchema.optional().default("draft"),
  thresholdSource: z.string().trim().max(255).optional().nullable(),
  thresholds: z.object({
    moisture: z.object({ max: thresholdValueSchema, min: thresholdValueSchema }).optional(),
    nitrogen: z.object({ max: thresholdValueSchema, min: thresholdValueSchema }).optional(),
    ph: z.object({ max: thresholdValueSchema, min: thresholdValueSchema }).optional(),
    phosphorus: z.object({ max: thresholdValueSchema, min: thresholdValueSchema }).optional(),
    potassium: z.object({ max: thresholdValueSchema, min: thresholdValueSchema }).optional()
  }).optional(),
  varieties: z.array(z.string().trim().min(1).max(120)).optional()
});

const updateCropPayloadSchema = cropPayloadSchema.partial();
const cropParamsSchema = z.object({
  cropId: z.string().trim().min(1).max(36)
});

type CropPayload = z.infer<typeof cropPayloadSchema>;
type UpdateCropPayload = z.infer<typeof updateCropPayloadSchema>;

export const cropRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.get("/crops", async (request) => {
    const tenant = requireTenantContext(request);
    const rows = await db
      .selectFrom("master_crops")
      .selectAll()
      .where("tenant_id", "=", tenant.tenantId)
      .orderBy("name", "asc")
      .execute();

    return rows.map(toCropDto);
  });

  app.post<{ Body: CropPayload }>("/crops", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = cropPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid crop payload",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const cropId = randomUUID();
    const values = toCropInsertValues(parsed.data, cropId, tenant.tenantId);

    await db
      .insertInto("master_crops")
      .values(values)
      .execute();

    const crop = await selectCropForTenant(cropId, tenant.tenantId);

    return reply.code(201).send(crop ? toCropDto(crop) : {
      id: cropId
    });
  });

  app.put<{ Body: UpdateCropPayload; Params: { cropId: string } }>("/crops/:cropId", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = cropParamsSchema.safeParse(request.params);
    const body = updateCropPayloadSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: "Invalid crop update",
        issues: {
          body: body.success ? undefined : body.error.flatten().fieldErrors,
          params: params.success ? undefined : params.error.flatten().fieldErrors
        }
      });
    }

    const updateValues = toCropUpdateValues(body.data);
    if (Object.keys(updateValues).length === 0) {
      return reply.code(400).send({
        error: "Empty update",
        message: "At least one crop field must be supplied."
      });
    }

    const result = await db
      .updateTable("master_crops")
      .set(updateValues)
      .where("id", "=", params.data.cropId)
      .where("tenant_id", "=", tenant.tenantId)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      return reply.code(404).send({
        error: "Crop not found",
        message: "The crop type does not exist for this tenant."
      });
    }

    const crop = await selectCropForTenant(params.data.cropId, tenant.tenantId);

    return crop ? toCropDto(crop) : reply.code(404).send({
      error: "Crop not found"
    });
  });
};

function toCropInsertValues(crop: CropPayload, cropId: string, tenantId: string) {
  const thresholds = crop.thresholds ?? {};

  return {
    description: crop.description ?? null,
    id: cropId,
    latin_name: crop.latinName ?? null,
    moisture_max: thresholds.moisture?.max ?? null,
    moisture_min: thresholds.moisture?.min ?? null,
    name: crop.name,
    nitrogen_max: thresholds.nitrogen?.max ?? null,
    nitrogen_min: thresholds.nitrogen?.min ?? null,
    ph_max: thresholds.ph?.max ?? null,
    ph_min: thresholds.ph?.min ?? null,
    phosphorus_max: thresholds.phosphorus?.max ?? null,
    phosphorus_min: thresholds.phosphorus?.min ?? null,
    planting_period_days: crop.plantingPeriodDays ?? null,
    potassium_max: thresholds.potassium?.max ?? null,
    potassium_min: thresholds.potassium?.min ?? null,
    status: crop.status,
    tenant_id: tenantId,
    threshold_source: crop.thresholdSource ?? null,
    varieties_json: JSON.stringify(crop.varieties ?? [])
  };
}

function toCropUpdateValues(crop: UpdateCropPayload) {
  const values: Record<string, unknown> = {};

  if ("description" in crop) values.description = crop.description ?? null;
  if ("latinName" in crop) values.latin_name = crop.latinName ?? null;
  if ("name" in crop && crop.name) values.name = crop.name;
  if ("plantingPeriodDays" in crop) values.planting_period_days = crop.plantingPeriodDays ?? null;
  if ("status" in crop && crop.status) values.status = crop.status;
  if ("thresholdSource" in crop) values.threshold_source = crop.thresholdSource ?? null;
  if ("varieties" in crop) values.varieties_json = JSON.stringify(crop.varieties ?? []);

  const thresholds = crop.thresholds;
  if (thresholds?.ph) {
    values.ph_min = thresholds.ph.min ?? null;
    values.ph_max = thresholds.ph.max ?? null;
  }
  if (thresholds?.moisture) {
    values.moisture_min = thresholds.moisture.min ?? null;
    values.moisture_max = thresholds.moisture.max ?? null;
  }
  if (thresholds?.nitrogen) {
    values.nitrogen_min = thresholds.nitrogen.min ?? null;
    values.nitrogen_max = thresholds.nitrogen.max ?? null;
  }
  if (thresholds?.phosphorus) {
    values.phosphorus_min = thresholds.phosphorus.min ?? null;
    values.phosphorus_max = thresholds.phosphorus.max ?? null;
  }
  if (thresholds?.potassium) {
    values.potassium_min = thresholds.potassium.min ?? null;
    values.potassium_max = thresholds.potassium.max ?? null;
  }

  return values;
}

async function selectCropForTenant(cropId: string, tenantId: string): Promise<MasterCrop | undefined> {
  return db
    .selectFrom("master_crops")
    .selectAll()
    .where("id", "=", cropId)
    .where("tenant_id", "=", tenantId)
    .executeTakeFirst();
}

function toCropDto(crop: MasterCrop) {
  return {
    createdAt: serializeDate(crop.created_at),
    description: crop.description,
    id: crop.id,
    latinName: crop.latin_name,
    name: crop.name,
    plantingPeriodDays: crop.planting_period_days,
    status: crop.status as CropStatus,
    thresholdSource: crop.threshold_source,
    thresholds: {
      moisture: { max: crop.moisture_max, min: crop.moisture_min, unit: "%" },
      nitrogen: { max: crop.nitrogen_max, min: crop.nitrogen_min, unit: "ppm" },
      ph: { max: crop.ph_max, min: crop.ph_min, unit: "range" },
      phosphorus: { max: crop.phosphorus_max, min: crop.phosphorus_min, unit: "ppm" },
      potassium: { max: crop.potassium_max, min: crop.potassium_min, unit: "ppm" }
    },
    updatedAt: serializeDate(crop.updated_at),
    varieties: parseJsonArray(crop.varieties_json)
  };
}

function parseJsonArray(value: JsonValue | string | null): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
