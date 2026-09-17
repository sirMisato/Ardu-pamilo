import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { CropStatus, JsonValue, MasterCrop } from "../db/schema.js";
import { apiMessage, fieldLabels } from "../i18n/messages.js";
import { requireTenantContext, verifyTenant, verifyTenantAdmin } from "../middleware/verifyTenant.js";

const cropStatusSchema = z.enum(["active", "draft", "archived"]);
const plantingDateSchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Planting date must use the format YYYY-MM-DD.").nullable()
).optional();
const thresholdValueSchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.number().finite().nullable()
).optional();
const cropPayloadSchema = z.object({
  description: z.string().max(3000).optional().nullable(),
  latinName: z.string().trim().max(160).optional().nullable(),
  name: z.string().trim().min(1).max(120),
  plantingDate: plantingDateSchema,
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

  app.get<{ Params: { cropId: string } }>("/crops/:cropId", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = cropParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({
        error: "Invalid route params",
        fieldLabels: fieldLabels(request.locale, cropFieldLabels),
        issues: params.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidRouteParams")
      });
    }

    const crop = await selectCropForTenant(params.data.cropId, tenant.tenantId);

    if (!crop) {
      return reply.code(404).send({
        error: "Crop not found",
        message: apiMessage(request.locale, "cropNotFound")
      });
    }

    return toCropDto(crop);
  });

  app.post<{ Body: CropPayload }>("/crops", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = cropPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid crop payload",
        fieldLabels: fieldLabels(request.locale, cropFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidCropPayload")
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

  app.put<{ Body: UpdateCropPayload; Params: { cropId: string } }>("/crops/:cropId", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = cropParamsSchema.safeParse(request.params);
    const body = updateCropPayloadSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: "Invalid crop update",
        fieldLabels: fieldLabels(request.locale, cropFieldLabels),
        issues: {
          body: body.success ? undefined : body.error.flatten().fieldErrors,
          params: params.success ? undefined : params.error.flatten().fieldErrors
        },
        message: apiMessage(request.locale, "invalidCropUpdate")
      });
    }

    const updateValues = toCropUpdateValues(body.data);
    if (Object.keys(updateValues).length === 0) {
      return reply.code(400).send({
        error: "Empty update",
        message: apiMessage(request.locale, "cropEmptyUpdate")
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
        message: apiMessage(request.locale, "cropNotFound")
      });
    }

    const crop = await selectCropForTenant(params.data.cropId, tenant.tenantId);

    return crop ? toCropDto(crop) : reply.code(404).send({
      error: "Crop not found"
    });
  });

  app.delete<{ Params: { cropId: string } }>("/crops/:cropId", { preHandler: verifyTenantAdmin }, async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = cropParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({
        error: "Invalid route params",
        fieldLabels: fieldLabels(request.locale, cropFieldLabels),
        issues: params.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidRouteParams")
      });
    }

    const result = await db
      .deleteFrom("master_crops")
      .where("id", "=", params.data.cropId)
      .where("tenant_id", "=", tenant.tenantId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      return reply.code(404).send({
        error: "Crop not found",
        message: apiMessage(request.locale, "cropNotFound")
      });
    }

    return reply.code(204).send();
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
    planting_date: crop.plantingDate ?? null,
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
  if ("plantingDate" in crop) values.planting_date = crop.plantingDate ?? null;
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
    plantingDate: crop.planting_date ? serializeDateOnly(crop.planting_date) : null,
    plantingPeriodDays: crop.planting_period_days,
    status: crop.status as CropStatus,
    thresholdSource: crop.threshold_source,
    thresholds: {
      moisture: { max: crop.moisture_max, min: crop.moisture_min, unit: "%" },
      nitrogen: { max: crop.nitrogen_max, min: crop.nitrogen_min, unit: "mg/Kg" },
      ph: { max: crop.ph_max, min: crop.ph_min, unit: "range" },
      phosphorus: { max: crop.phosphorus_max, min: crop.phosphorus_min, unit: "mg/Kg" },
      potassium: { max: crop.potassium_max, min: crop.potassium_min, unit: "mg/Kg" }
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

function serializeDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

const cropFieldLabels = {
  cropId: { en: "Crop ID", id: "ID Tanaman" },
  description: { en: "Description", id: "Deskripsi" },
  latinName: { en: "Scientific Name", id: "Nama Ilmiah" },
  name: { en: "Name", id: "Nama" },
  plantingDate: { en: "Planting Date", id: "Tanggal Tanam" },
  plantingPeriodDays: { en: "Cultivation Duration", id: "Durasi Budidaya" },
  status: { en: "Status", id: "Status" },
  thresholdSource: { en: "Threshold Source", id: "Sumber Ambang Batas" },
  thresholds: { en: "Thresholds", id: "Ambang Batas" },
  varieties: { en: "Varieties", id: "Varietas" }
};
