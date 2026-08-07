import bcrypt from "bcryptjs";
import { closeDatabase, db } from "./client.js";
import { env } from "../config/env.js";

const demoCropId = "demo-crop-padi";
const demoPlotId = "demo-plot-01";
const demoDeviceId = "demo-device-01";
const demoDeviceUid = "SensorNode01";

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

  const existingCrop = await trx
    .selectFrom("master_crops")
    .select(["id"])
    .where("id", "=", demoCropId)
    .where("tenant_id", "=", env.demoTenant.id)
    .executeTakeFirst();

  if (!existingCrop) {
    await trx
      .insertInto("master_crops")
      .values({
        description: "Dummy crop untuk smoke test tenant PAMILO.",
        id: demoCropId,
        latin_name: "Oryza sativa",
        moisture_max: 80,
        moisture_min: 45,
        name: "Padi Demo",
        nitrogen_max: 120,
        nitrogen_min: 40,
        ph_max: 7.5,
        ph_min: 5.5,
        phosphorus_max: 60,
        phosphorus_min: 20,
        planting_period_days: 110,
        potassium_max: 120,
        potassium_min: 40,
        status: "active",
        tenant_id: env.demoTenant.id,
        threshold_source: "Demo smoke test seed",
        varieties_json: JSON.stringify(["IR64", "Ciherang"])
      })
      .execute();
  }

  const existingPlot = await trx
    .selectFrom("plots")
    .select(["id"])
    .where("id", "=", demoPlotId)
    .where("tenant_id", "=", env.demoTenant.id)
    .executeTakeFirst();

  if (!existingPlot) {
    await trx
      .insertInto("plots")
      .values({
        area_hectares: 1.8,
        bmkg_adm4_code: "31.71.01.1001",
        crop_id: demoCropId,
        id: demoPlotId,
        name: "Demo Plot Utama",
        polygon_geojson: JSON.stringify({
          coordinates: [[
            [106.8215, -6.1818],
            [106.8242, -6.1816],
            [106.8245, -6.1842],
            [106.8218, -6.1844],
            [106.8215, -6.1818]
          ]],
          type: "Polygon"
        }),
        tenant_id: env.demoTenant.id
      })
      .execute();
  }

  const existingDevice = await trx
    .selectFrom("devices")
    .select(["id"])
    .where("id", "=", demoDeviceId)
    .where("tenant_id", "=", env.demoTenant.id)
    .executeTakeFirst();

  if (!existingDevice) {
    await trx
      .insertInto("devices")
      .values({
        device_uid: demoDeviceUid,
        display_name: "SensorNode01",
        id: demoDeviceId,
        last_seen_at: new Date(),
        metadata_json: JSON.stringify({
          firmware: "demo-1.0.0",
          model: "ESP32 Soil Node"
        }),
        mqtt_username: "pamilo_ingestor",
        plot_id: demoPlotId,
        status: "online",
        telemetry_topic: `pamilo/v1/tenants/${env.demoTenant.id}/devices/${demoDeviceUid}/telemetry`,
        tenant_id: env.demoTenant.id
      })
      .execute();
  }

  const existingTelemetry = await trx
    .selectFrom("telemetry_data")
    .select(["id"])
    .where("tenant_id", "=", env.demoTenant.id)
    .where("device_id", "=", demoDeviceId)
    .limit(1)
    .executeTakeFirst();

  if (!existingTelemetry) {
    const receivedAt = new Date();
    await trx
      .insertInto("telemetry_data")
      .values({
        device_id: demoDeviceId,
        metric_keys_json: JSON.stringify(["metrics.moisture", "metrics.nitrogen", "metrics.ph", "metrics.temperature"]),
        payload_json: JSON.stringify({
          metrics: {
            moisture: 63,
            nitrogen: 78,
            ph: 6.4,
            temperature: 29.5
          },
          timestamp: receivedAt.toISOString()
        }),
        received_at: receivedAt,
        tenant_id: env.demoTenant.id,
        topic: `pamilo/v1/tenants/${env.demoTenant.id}/devices/${demoDeviceUid}/telemetry`
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
  }
});

console.log(`Demo tenant seeded: ${env.demoTenant.email}`);

await closeDatabase();
