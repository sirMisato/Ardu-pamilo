import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { Tenant, TenantLicenseStatus, TenantUpdate } from "../db/schema.js";
import { verifySuperAdmin } from "../middleware/verifySuperAdmin.js";

const tenantStatusSchema = z.enum(["trial", "active", "suspended", "revoked"]);

const createTenantSchema = z.object({
  accountName: z.string().trim().min(1).max(160),
  licenseExpiresAt: z.string().datetime().optional().nullable(),
  licenseStatus: tenantStatusSchema.optional().default("trial"),
  maxDevices: z.number().int().min(1).max(10000).optional().default(3),
  maxPlots: z.number().int().min(1).max(10000).optional().default(1),
  ownerEmail: z.string().trim().email().max(255),
  password: z.string().min(8).max(255),
  tenantId: z.string().trim().min(1).max(36).optional()
});

const updateTenantSchema = z.object({
  accountName: z.string().trim().min(1).max(160).optional(),
  licenseExpiresAt: z.string().datetime().optional().nullable(),
  licenseStatus: tenantStatusSchema.optional(),
  maxDevices: z.number().int().min(1).max(10000).optional(),
  maxPlots: z.number().int().min(1).max(10000).optional(),
  ownerEmail: z.string().trim().email().max(255).optional(),
  password: z.string().min(8).max(255).optional()
});

const tenantParamsSchema = z.object({
  tenantId: z.string().trim().min(1).max(36)
});

type CreateTenantBody = z.infer<typeof createTenantSchema>;
type UpdateTenantBody = z.infer<typeof updateTenantSchema>;

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifySuperAdmin);

  app.get("/overview", async () => {
    const tenants = await db
      .selectFrom("tenants")
      .select(["id", "license_status"])
      .execute();

    const activeLicenses = tenants.filter((tenant) => tenant.license_status === "active" || tenant.license_status === "trial").length;

    return {
      activeLicenses,
      licenseBreakdown: {
        active: countByStatus(tenants, "active"),
        revoked: countByStatus(tenants, "revoked"),
        suspended: countByStatus(tenants, "suspended"),
        trial: countByStatus(tenants, "trial")
      },
      systemHealth: {
        api: "nominal",
        database: "connected",
        mqttIngestor: "local opt-in"
      },
      totalTenants: tenants.length
    };
  });

  app.get("/tenants", async () => {
    const tenants = await db
      .selectFrom("tenants")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return tenants.map(toTenantAdminDto);
  });

  app.post<{ Body: CreateTenantBody }>("/tenants", async (request, reply) => {
    const parsed = createTenantSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid tenant payload",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const body = parsed.data;
    const tenantId = body.tenantId ?? randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);

    try {
      await db
        .insertInto("tenants")
        .values({
          account_name: body.accountName,
          id: tenantId,
          license_expires_at: body.licenseExpiresAt ? new Date(body.licenseExpiresAt) : null,
          license_status: body.licenseStatus,
          max_devices: body.maxDevices,
          max_plots: body.maxPlots,
          owner_email: body.ownerEmail,
          password_hash: passwordHash
        })
        .execute();
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return reply.code(409).send({
          error: "Tenant already exists",
          message: "Owner email atau tenant ID sudah terdaftar."
        });
      }

      throw error;
    }

    const tenant = await selectTenant(tenantId);

    return reply.code(201).send(tenant ? toTenantAdminDto(tenant) : {
      id: tenantId
    });
  });

  app.put<{ Body: UpdateTenantBody; Params: { tenantId: string } }>("/tenants/:tenantId", async (request, reply) => {
    const params = tenantParamsSchema.safeParse(request.params);
    const body = updateTenantSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: "Invalid tenant update",
        issues: {
          body: body.success ? undefined : body.error.flatten().fieldErrors,
          params: params.success ? undefined : params.error.flatten().fieldErrors
        }
      });
    }

    const updateValues = await toTenantUpdateValues(body.data);
    if (Object.keys(updateValues).length === 0) {
      return reply.code(400).send({
        error: "Empty update",
        message: "At least one tenant field must be supplied."
      });
    }

    try {
      const result = await db
        .updateTable("tenants")
        .set(updateValues)
        .where("id", "=", params.data.tenantId)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        return reply.code(404).send({
          error: "Tenant not found",
          message: "Tenant license tidak ditemukan."
        });
      }
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return reply.code(409).send({
          error: "Tenant already exists",
          message: "Owner email sudah digunakan tenant lain."
        });
      }

      throw error;
    }

    const tenant = await selectTenant(params.data.tenantId);

    return tenant ? toTenantAdminDto(tenant) : reply.code(404).send({
      error: "Tenant not found"
    });
  });

  app.post<{ Params: { tenantId: string } }>("/tenants/:tenantId/revoke", async (request, reply) => {
    return revokeTenant(request.params, reply);
  });

  app.delete<{ Params: { tenantId: string } }>("/tenants/:tenantId", async (request, reply) => {
    return revokeTenant(request.params, reply);
  });
};

async function revokeTenant(params: { tenantId: string }, reply: FastifyReply) {
  const parsed = tenantParamsSchema.safeParse(params);

  if (!parsed.success) {
    return reply.code(400).send({
      error: "Invalid route params",
      issues: parsed.error.flatten().fieldErrors
    });
  }

  const result = await db
    .updateTable("tenants")
    .set({
      license_status: "revoked"
    })
    .where("id", "=", parsed.data.tenantId)
    .executeTakeFirst();

  if (result.numUpdatedRows === 0n) {
    return reply.code(404).send({
      error: "Tenant not found",
      message: "Tenant license tidak ditemukan."
    });
  }

  const tenant = await selectTenant(parsed.data.tenantId);

  return tenant ? toTenantAdminDto(tenant) : reply.code(404).send({
    error: "Tenant not found"
  });
}

async function selectTenant(tenantId: string): Promise<Tenant | undefined> {
  return db
    .selectFrom("tenants")
    .selectAll()
    .where("id", "=", tenantId)
    .executeTakeFirst();
}

async function toTenantUpdateValues(body: UpdateTenantBody): Promise<TenantUpdate> {
  const values: TenantUpdate = {};

  if ("accountName" in body) values.account_name = body.accountName;
  if ("licenseExpiresAt" in body) values.license_expires_at = body.licenseExpiresAt ? new Date(body.licenseExpiresAt) : null;
  if ("licenseStatus" in body) values.license_status = body.licenseStatus;
  if ("maxDevices" in body) values.max_devices = body.maxDevices;
  if ("maxPlots" in body) values.max_plots = body.maxPlots;
  if ("ownerEmail" in body) values.owner_email = body.ownerEmail;
  if ("password" in body && body.password) values.password_hash = await bcrypt.hash(body.password, 12);

  return values;
}

function toTenantAdminDto(tenant: Tenant) {
  return {
    accountName: tenant.account_name,
    createdAt: serializeDate(tenant.created_at),
    id: tenant.id,
    licenseExpiresAt: tenant.license_expires_at ? serializeDate(tenant.license_expires_at) : null,
    licenseStatus: tenant.license_status,
    maxDevices: tenant.max_devices,
    maxPlots: tenant.max_plots,
    ownerEmail: tenant.owner_email,
    updatedAt: serializeDate(tenant.updated_at)
  };
}

function countByStatus(rows: Array<{ license_status: TenantLicenseStatus }>, status: TenantLicenseStatus): number {
  return rows.filter((row) => row.license_status === status).length;
}

function isDuplicateEntryError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
