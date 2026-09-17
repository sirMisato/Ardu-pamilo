import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import type { TenantUser, TenantUserStatus, TenantUserUpdate } from "../db/schema.js";
import type { LocaleCode } from "../i18n/locale.js";
import { apiMessage, fieldLabels } from "../i18n/messages.js";
import { requireTenantContext, verifyTenant, verifyTenantAdmin } from "../middleware/verifyTenant.js";

const tenantUserStatusSchema = z.enum(["active", "inactive"]);
const tenantUserRoleSchema = z.literal("tenant_user");

const createTenantUserSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(160),
  password: z.string().min(8).max(255),
  role: tenantUserRoleSchema.optional().default("tenant_user"),
  status: tenantUserStatusSchema.optional().default("active")
});

const updateTenantUserSchema = z.object({
  email: z.string().trim().email().max(255).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  password: z.string().min(8).max(255).optional(),
  role: tenantUserRoleSchema.optional(),
  status: tenantUserStatusSchema.optional()
});

const tenantUserParamsSchema = z.object({
  userId: z.string().trim().min(1).max(36)
});

type CreateTenantUserBody = z.infer<typeof createTenantUserSchema>;
type UpdateTenantUserBody = z.infer<typeof updateTenantUserSchema>;

export const tenantUserRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);
  app.addHook("preHandler", verifyTenantAdmin);

  app.get("/tenant-users", async (request) => {
    const tenant = requireTenantContext(request);
    const rows = await db
      .selectFrom("tenant_users")
      .selectAll()
      .where("tenant_id", "=", tenant.tenantId)
      .orderBy("created_at", "desc")
      .execute();

    return rows.map(toTenantUserDto);
  });

  app.post<{ Body: CreateTenantUserBody }>("/tenant-users", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const parsed = createTenantUserSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid tenant user payload",
        fieldLabels: fieldLabels(request.locale, tenantUserFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidTenantUserPayload")
      });
    }

    const body = parsed.data;
    if (await emailBelongsToTenantOwner(body.email)) {
      return reply.code(409).send({
        error: "Email already exists",
        message: tenantUserMessage(request.locale, "ownerEmailExists")
      });
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);

    try {
      await db
        .insertInto("tenant_users")
        .values({
          email: body.email,
          id: userId,
          name: body.name,
          password_hash: passwordHash,
          role: body.role,
          status: body.status,
          tenant_id: tenant.tenantId
        })
        .execute();
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return reply.code(409).send({
          error: "User already exists",
          message: tenantUserMessage(request.locale, "userEmailExists")
        });
      }

      throw error;
    }

    const user = await selectTenantUserForTenant(userId, tenant.tenantId);

    return reply.code(201).send(user ? toTenantUserDto(user) : {
      id: userId
    });
  });

  app.put<{ Body: UpdateTenantUserBody; Params: { userId: string } }>("/tenant-users/:userId", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = tenantUserParamsSchema.safeParse(request.params);
    const body = updateTenantUserSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: "Invalid tenant user update",
        fieldLabels: fieldLabels(request.locale, tenantUserFieldLabels),
        issues: {
          body: body.success ? undefined : body.error.flatten().fieldErrors,
          params: params.success ? undefined : params.error.flatten().fieldErrors
        },
        message: apiMessage(request.locale, "invalidTenantUserUpdate")
      });
    }

    if (body.data.email && await emailBelongsToTenantOwner(body.data.email)) {
      return reply.code(409).send({
        error: "Email already exists",
        message: tenantUserMessage(request.locale, "ownerEmailExists")
      });
    }

    const updateValues = await toTenantUserUpdateValues(body.data);
    if (Object.keys(updateValues).length === 0) {
      return reply.code(400).send({
        error: "Empty update",
        message: tenantUserMessage(request.locale, "emptyUpdate")
      });
    }

    try {
      const result = await db
        .updateTable("tenant_users")
        .set(updateValues)
        .where("id", "=", params.data.userId)
        .where("tenant_id", "=", tenant.tenantId)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        return reply.code(404).send({
          error: "Tenant user not found",
          message: tenantUserMessage(request.locale, "notFound")
        });
      }
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return reply.code(409).send({
          error: "User already exists",
          message: tenantUserMessage(request.locale, "userEmailExists")
        });
      }

      throw error;
    }

    const user = await selectTenantUserForTenant(params.data.userId, tenant.tenantId);

    return user ? toTenantUserDto(user) : reply.code(404).send({
      error: "Tenant user not found"
    });
  });

  app.delete<{ Params: { userId: string } }>("/tenant-users/:userId", async (request, reply) => {
    const tenant = requireTenantContext(request);
    const params = tenantUserParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({
        error: "Invalid route params",
        fieldLabels: fieldLabels(request.locale, tenantUserFieldLabels),
        issues: params.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidRouteParams")
      });
    }

    const result = await db
      .deleteFrom("tenant_users")
      .where("id", "=", params.data.userId)
      .where("tenant_id", "=", tenant.tenantId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      return reply.code(404).send({
        error: "Tenant user not found",
        message: tenantUserMessage(request.locale, "notFound")
      });
    }

    return reply.code(204).send();
  });
};

async function selectTenantUserForTenant(userId: string, tenantId: string): Promise<TenantUser | undefined> {
  return db
    .selectFrom("tenant_users")
    .selectAll()
    .where("id", "=", userId)
    .where("tenant_id", "=", tenantId)
    .executeTakeFirst();
}

async function emailBelongsToTenantOwner(email: string): Promise<boolean> {
  const tenant = await db
    .selectFrom("tenants")
    .select("id")
    .where("owner_email", "=", email)
    .executeTakeFirst();

  return Boolean(tenant);
}

async function toTenantUserUpdateValues(body: UpdateTenantUserBody): Promise<TenantUserUpdate> {
  const values: TenantUserUpdate = {};

  if ("email" in body) values.email = body.email;
  if ("name" in body) values.name = body.name;
  if ("role" in body) values.role = body.role;
  if ("status" in body) values.status = body.status;
  if ("password" in body && body.password) values.password_hash = await bcrypt.hash(body.password, 12);

  return values;
}

function toTenantUserDto(user: TenantUser) {
  return {
    createdAt: serializeDate(user.created_at),
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status as TenantUserStatus,
    updatedAt: serializeDate(user.updated_at)
  };
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

const tenantUserFieldLabels = {
  email: { en: "Email", id: "Email" },
  name: { en: "Name", id: "Nama" },
  password: { en: "Password", id: "Password" },
  role: { en: "Role", id: "Role" },
  status: { en: "Status", id: "Status" },
  userId: { en: "User ID", id: "ID User" }
};

function tenantUserMessage(locale: LocaleCode, key: "emptyUpdate" | "notFound" | "ownerEmailExists" | "userEmailExists"): string {
  const messages: Record<LocaleCode, Record<typeof key, string>> = {
    en: {
      emptyUpdate: "Send at least one tenant user field.",
      notFound: "Tenant user was not found.",
      ownerEmailExists: "This email is already used as the tenant owner.",
      userEmailExists: "This tenant user email is already registered."
    },
    id: {
      emptyUpdate: "Minimal satu field user tenant harus dikirim.",
      notFound: "User tenant tidak ditemukan.",
      ownerEmailExists: "Email sudah digunakan sebagai owner tenant.",
      userEmailExists: "Email user tenant sudah terdaftar."
    }
  };

  return messages[locale][key];
}
