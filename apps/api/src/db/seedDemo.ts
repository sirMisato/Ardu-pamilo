import bcrypt from "bcryptjs";
import type { Transaction } from "kysely";
import { env } from "../config/env.js";
import { closeDatabase, db } from "./client.js";
import type { Database } from "./schema.js";

if (!env.demoTenant.enabled) {
  if (env.demoTenant.resetData) {
    await closeDatabase();
    throw new Error("DEMO_TENANT_ENABLED=true is required when DEMO_TENANT_RESET_DATA=true.");
  }

  console.log("Demo tenant seeding is disabled.");
  await closeDatabase();
  process.exit(0);
}

if (!env.demoTenant.password) {
  await closeDatabase();
  throw new Error("DEMO_TENANT_PASSWORD is required when DEMO_TENANT_ENABLED=true.");
}

const passwordHash = await bcrypt.hash(env.demoTenant.password, 12);

await db.transaction().execute(async (trx) => {
  if (env.demoTenant.resetData) {
    await resetTenantApplicationData(trx);
  }

  const existingTenant = await trx
    .selectFrom("tenants")
    .select(["id"])
    .where("id", "=", env.demoTenant.id)
    .executeTakeFirst();

  if (existingTenant) {
    await trx
      .updateTable("tenants")
      .set({
        account_name: env.demoTenant.name,
        license_expires_at: null,
        license_status: "active",
        max_devices: 10,
        max_plots: 5,
        owner_email: env.demoTenant.email,
        password_hash: passwordHash
      })
      .where("id", "=", env.demoTenant.id)
      .execute();
  } else {
    await trx
      .insertInto("tenants")
      .values({
        account_name: env.demoTenant.name,
        id: env.demoTenant.id,
        license_expires_at: null,
        license_status: "active",
        max_devices: 10,
        max_plots: 5,
        owner_email: env.demoTenant.email,
        password_hash: passwordHash
      })
      .execute();
  }

  const existingSettings = await trx
    .selectFrom("tenant_settings")
    .select(["tenant_id"])
    .where("tenant_id", "=", env.demoTenant.id)
    .executeTakeFirst();

  if (!existingSettings) {
    await trx
      .insertInto("tenant_settings")
      .values({
        display_preferences_json: JSON.stringify({
          compactMode: false,
          darkMode: true
        }),
        notification_preferences_json: JSON.stringify({
          emailAlerts: true,
          smsAlerts: false,
          thresholdAlerts: true,
          webAlerts: true
        }),
        tenant_id: env.demoTenant.id
      })
      .execute();
  } else {
    await trx
      .updateTable("tenant_settings")
      .set({
        display_preferences_json: JSON.stringify({
          compactMode: false,
          darkMode: true
        }),
        notification_preferences_json: JSON.stringify({
          emailAlerts: true,
          smsAlerts: false,
          thresholdAlerts: true,
          webAlerts: true
        })
      })
      .where("tenant_id", "=", env.demoTenant.id)
      .execute();
  }
});

console.log(`${env.demoTenant.resetData ? "Tenant application data reset. " : ""}Demo tenant login ready without farm data: ${env.demoTenant.email}`);

if (env.superAdmin.email && env.superAdmin.passwordHash) {
  console.log(`Super admin login is configured: ${env.superAdmin.email}`);
} else {
  console.warn("Super admin login is not configured. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD_HASH.");
}

await closeDatabase();

async function resetTenantApplicationData(trx: Transaction<Database>): Promise<void> {
  await trx.deleteFrom("telemetry_data").execute();
  await trx.deleteFrom("devices").execute();
  await trx.deleteFrom("plots").execute();
  await trx.deleteFrom("master_crops").execute();
  await trx.deleteFrom("tenant_settings").execute();
  await trx.deleteFrom("tenant_users").execute();
  await trx.deleteFrom("tenants").execute();
}
