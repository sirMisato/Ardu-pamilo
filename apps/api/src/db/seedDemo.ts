import bcrypt from "bcryptjs";
import { closeDatabase, db } from "./client.js";
import { env } from "../config/env.js";

const demoCropId = "demo-crop-padi";
const demoPlotId = "demo-plot-01";
const demoDeviceId = "demo-device-01";

if (!env.demoTenant.enabled) {
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

  await trx
    .deleteFrom("telemetry_data")
    .where("tenant_id", "=", env.demoTenant.id)
    .where("device_id", "=", demoDeviceId)
    .execute();

  await trx
    .deleteFrom("devices")
    .where("tenant_id", "=", env.demoTenant.id)
    .where("id", "=", demoDeviceId)
    .execute();

  await trx
    .deleteFrom("plots")
    .where("tenant_id", "=", env.demoTenant.id)
    .where("id", "=", demoPlotId)
    .execute();

  await trx
    .deleteFrom("master_crops")
    .where("tenant_id", "=", env.demoTenant.id)
    .where("id", "=", demoCropId)
    .execute();

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
  }
});

console.log(`Demo tenant account ready without mock telemetry: ${env.demoTenant.email}`);

await closeDatabase();
