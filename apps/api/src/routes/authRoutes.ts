import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import type { Tenant, TenantUser } from "../db/schema.js";
import type { LocaleCode } from "../i18n/locale.js";
import { apiMessage, fieldLabels } from "../i18n/messages.js";

const tenantLoginSchema = z.object({
  emailOrUsername: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(255),
  tenantId: z.string().trim().min(1).max(36).optional()
});

const adminLoginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(255)
});

type TenantLoginBody = z.infer<typeof tenantLoginSchema>;
type AdminLoginBody = z.infer<typeof adminLoginSchema>;

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: TenantLoginBody }>("/api/auth/login", async (request, reply) => {
    return handleTenantLogin(app, request.body, reply, request.locale);
  });

  app.post<{ Body: TenantLoginBody }>("/api/v1/auth/login", async (request, reply) => {
    return handleTenantLogin(app, request.body, reply, request.locale);
  });

  app.post<{ Body: AdminLoginBody }>("/api/auth/admin", async (request, reply) => {
    const parsed = adminLoginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid admin login payload",
        fieldLabels: fieldLabels(request.locale, authFieldLabels),
        issues: parsed.error.flatten().fieldErrors,
        message: apiMessage(request.locale, "invalidAdminLoginPayload")
      });
    }

    if (!env.superAdmin.email || !env.superAdmin.passwordHash) {
      return reply.code(503).send({
        error: "Super admin auth is not configured",
        message: apiMessage(request.locale, "adminAuthNotConfigured")
      });
    }

    const emailMatches = parsed.data.email.toLowerCase() === env.superAdmin.email.toLowerCase();
    const passwordMatches = await bcrypt.compare(parsed.data.password, env.superAdmin.passwordHash);

    if (!emailMatches || !passwordMatches) {
      return reply.code(401).send({
        error: "Invalid credentials",
        message: apiMessage(request.locale, "adminInvalidCredentials")
      });
    }

    const accessToken = app.jwt.sign(
      {
        role: "super_admin",
        sub: env.superAdmin.email,
        tenant_id: "platform"
      },
      {
        expiresIn: env.jwtExpiresIn
      }
    );

    return {
      accessToken,
      user: {
        email: env.superAdmin.email,
        role: "super_admin"
      }
    };
  });
};

async function handleTenantLogin(app: FastifyInstance, body: TenantLoginBody, reply: FastifyReply, locale: LocaleCode) {
  const parsed = tenantLoginSchema.safeParse(body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: "Invalid login payload",
      fieldLabels: fieldLabels(locale, authFieldLabels),
      issues: parsed.error.flatten().fieldErrors,
      message: apiMessage(locale, "invalidLoginPayload")
    });
  }

  const tenant = await findTenantForLogin(parsed.data);
  if (tenant && await bcrypt.compare(parsed.data.password, tenant.password_hash)) {
    const licenseError = validateTenantLicense(tenant, locale);
    if (licenseError) {
      return reply.code(403).send(licenseError);
    }

    const accessToken = app.jwt.sign(
      {
        role: "tenant_admin",
        sub: tenant.owner_email,
        tenant_id: tenant.id
      },
      {
        expiresIn: env.jwtExpiresIn
      }
    );

    return {
      accessToken,
      tenant: toTenantSessionDto(tenant, "tenant_admin"),
      user: {
        email: tenant.owner_email,
        role: "tenant_admin"
      }
    };
  }

  const tenantUserLogin = await findTenantUserForLogin(parsed.data);
  if (!tenantUserLogin || !(await bcrypt.compare(parsed.data.password, tenantUserLogin.user.password_hash))) {
    return reply.code(401).send({
      error: "Invalid credentials",
      message: apiMessage(locale, "loginInvalidCredentials")
    });
  }

  if (tenantUserLogin.user.status !== "active") {
    return reply.code(403).send({
      error: "User inactive",
      message: apiMessage(locale, "tenantUserInactive")
    });
  }

  const licenseError = validateTenantLicense(tenantUserLogin.tenant, locale);
  if (licenseError) {
    return reply.code(403).send(licenseError);
  }

  const accessToken = app.jwt.sign(
    {
      role: "tenant_user",
      sub: tenantUserLogin.user.email,
      tenant_id: tenantUserLogin.tenant.id
    },
    {
      expiresIn: env.jwtExpiresIn
    }
  );

  return {
    accessToken,
    tenant: toTenantSessionDto(tenantUserLogin.tenant, "tenant_user"),
    user: {
      email: tenantUserLogin.user.email,
      name: tenantUserLogin.user.name,
      role: "tenant_user"
    }
  };
}

async function findTenantForLogin(credentials: TenantLoginBody): Promise<Tenant | undefined> {
  let query = db
    .selectFrom("tenants")
    .selectAll()
    .where((expressionBuilder) => expressionBuilder.or([
      expressionBuilder("owner_email", "=", credentials.emailOrUsername),
      expressionBuilder("account_name", "=", credentials.emailOrUsername)
    ]));

  if (credentials.tenantId) {
    query = query.where("id", "=", credentials.tenantId);
  }

  return query.executeTakeFirst();
}

async function findTenantUserForLogin(credentials: TenantLoginBody): Promise<{ tenant: Tenant; user: TenantUser } | undefined> {
  let query = db
    .selectFrom("tenant_users")
    .selectAll()
    .where("email", "=", credentials.emailOrUsername);

  if (credentials.tenantId) {
    query = query.where("tenant_id", "=", credentials.tenantId);
  }

  const user = await query.executeTakeFirst();
  if (!user) {
    return undefined;
  }

  const tenant = await db
    .selectFrom("tenants")
    .selectAll()
    .where("id", "=", user.tenant_id)
    .executeTakeFirst();

  return tenant ? { tenant, user } : undefined;
}

function validateTenantLicense(tenant: Tenant, locale: LocaleCode): { error: string; message: string } | null {
  if (tenant.license_status === "revoked") {
    return {
      error: "License revoked",
      message: apiMessage(locale, "licenseRevoked")
    };
  }

  if (tenant.license_status === "suspended") {
    return {
      error: "License suspended",
      message: apiMessage(locale, "licenseSuspended")
    };
  }

  if (tenant.license_expires_at && new Date(tenant.license_expires_at).getTime() < Date.now()) {
    return {
      error: "License expired",
      message: apiMessage(locale, "licenseExpired")
    };
  }

  return null;
}

function toTenantSessionDto(tenant: Tenant, role: "tenant_admin" | "tenant_user") {
  return {
    accountName: tenant.account_name,
    id: tenant.id,
    licenseExpiresAt: tenant.license_expires_at ? serializeDate(tenant.license_expires_at) : null,
    licenseStatus: tenant.license_status,
    maxDevices: tenant.max_devices,
    maxPlots: tenant.max_plots,
    ownerEmail: tenant.owner_email,
    role
  };
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

const authFieldLabels = {
  email: { en: "Email", id: "Email" },
  emailOrUsername: { en: "Email or Username", id: "Email atau Username" },
  password: { en: "Password", id: "Kata Sandi" },
  tenantId: { en: "Tenant ID", id: "ID Tenant" }
};
