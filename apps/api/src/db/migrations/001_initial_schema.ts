import { sql, type Kysely } from "kysely";

const timestamps = {
  createdAt: (table: ReturnType<Kysely<unknown>["schema"]["createTable"]>) => table
    .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`))
};

export async function up(db: Kysely<unknown>): Promise<void> {
  await timestamps.createdAt(
    db.schema
      .createTable("tenants")
      .ifNotExists()
      .addColumn("id", "varchar(36)", (column) => column.primaryKey())
      .addColumn("account_name", "varchar(160)", (column) => column.notNull())
      .addColumn("owner_email", "varchar(255)", (column) => column.notNull().unique())
      .addColumn("password_hash", "varchar(255)", (column) => column.notNull())
      .addColumn("license_status", sql`enum('trial', 'active', 'suspended', 'revoked')`, (column) => column.notNull().defaultTo("trial"))
      .addColumn("license_expires_at", "timestamp")
      .addColumn("max_plots", "integer", (column) => column.notNull().defaultTo(1))
      .addColumn("max_devices", "integer", (column) => column.notNull().defaultTo(3))
  ).execute();

  await timestamps.createdAt(
    db.schema
      .createTable("master_crops")
      .ifNotExists()
      .addColumn("id", "varchar(36)", (column) => column.primaryKey())
      .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
      .addColumn("name", "varchar(120)", (column) => column.notNull())
      .addColumn("latin_name", "varchar(160)")
      .addColumn("planting_period_days", "integer")
      .addColumn("varieties_json", "json")
      .addColumn("description", "text")
      .addColumn("status", sql`enum('active', 'draft', 'archived')`, (column) => column.notNull().defaultTo("draft"))
      .addColumn("ph_min", sql`decimal(5, 2)`)
      .addColumn("ph_max", sql`decimal(5, 2)`)
      .addColumn("moisture_min", sql`decimal(6, 2)`)
      .addColumn("moisture_max", sql`decimal(6, 2)`)
      .addColumn("nitrogen_min", sql`decimal(10, 2)`)
      .addColumn("nitrogen_max", sql`decimal(10, 2)`)
      .addColumn("phosphorus_min", sql`decimal(10, 2)`)
      .addColumn("phosphorus_max", sql`decimal(10, 2)`)
      .addColumn("potassium_min", sql`decimal(10, 2)`)
      .addColumn("potassium_max", sql`decimal(10, 2)`)
      .addColumn("threshold_source", "varchar(255)")
      .addUniqueConstraint("master_crops_tenant_name_unique", ["tenant_id", "name"])
  ).execute();

  await timestamps.createdAt(
    db.schema
      .createTable("plots")
      .ifNotExists()
      .addColumn("id", "varchar(36)", (column) => column.primaryKey())
      .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("area_hectares", sql`decimal(12, 4)`)
      .addColumn("crop_id", "varchar(36)", (column) => column.references("master_crops.id").onDelete("set null"))
      .addColumn("polygon_geojson", "json", (column) => column.notNull())
      .addColumn("bmkg_adm4_code", "varchar(32)")
      .addUniqueConstraint("plots_tenant_name_unique", ["tenant_id", "name"])
  ).execute();

  await timestamps.createdAt(
    db.schema
      .createTable("devices")
      .ifNotExists()
      .addColumn("id", "varchar(36)", (column) => column.primaryKey())
      .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
      .addColumn("plot_id", "varchar(36)", (column) => column.notNull().references("plots.id").onDelete("cascade"))
      .addColumn("device_uid", "varchar(120)", (column) => column.notNull())
      .addColumn("display_name", "varchar(160)", (column) => column.notNull())
      .addColumn("status", sql`enum('online', 'offline', 'maintenance')`, (column) => column.notNull().defaultTo("offline"))
      .addColumn("telemetry_topic", "varchar(255)", (column) => column.notNull())
      .addColumn("mqtt_username", "varchar(160)")
      .addColumn("last_seen_at", "timestamp")
      .addColumn("metadata_json", "json")
      .addUniqueConstraint("devices_tenant_device_uid_unique", ["tenant_id", "device_uid"])
      .addUniqueConstraint("devices_tenant_topic_unique", ["tenant_id", "telemetry_topic"])
  ).execute();

  await db.schema
    .createTable("telemetry_data")
    .ifNotExists()
    .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
    .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
    .addColumn("device_id", "varchar(36)", (column) => column.notNull().references("devices.id").onDelete("cascade"))
    .addColumn("topic", "varchar(255)", (column) => column.notNull())
    .addColumn("metric_keys_json", "json", (column) => column.notNull())
    .addColumn("payload_json", "json", (column) => column.notNull())
    .addColumn("received_at", "timestamp", (column) => column.notNull())
    .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createIndexIfMissing(db, "plots_tenant_id_idx", "plots", ["tenant_id"]);
  await createIndexIfMissing(db, "devices_tenant_plot_idx", "devices", ["tenant_id", "plot_id"]);
  await createIndexIfMissing(db, "telemetry_tenant_received_idx", "telemetry_data", ["tenant_id", "received_at"]);
  await createIndexIfMissing(db, "telemetry_device_received_idx", "telemetry_data", ["device_id", "received_at"]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("telemetry_data").ifExists().execute();
  await db.schema.dropTable("devices").ifExists().execute();
  await db.schema.dropTable("plots").ifExists().execute();
  await db.schema.dropTable("master_crops").ifExists().execute();
  await db.schema.dropTable("tenants").ifExists().execute();
}

async function createIndexIfMissing(
  db: Kysely<unknown>,
  indexName: string,
  tableName: string,
  columns: string[]
): Promise<void> {
  const existingIndex = await sql<{ index_exists: number }>`
    select 1 as index_exists
    from information_schema.statistics
    where table_schema = database()
      and table_name = ${tableName}
      and index_name = ${indexName}
    limit 1
  `.execute(db);

  if (existingIndex.rows.length > 0) return;

  await db.schema.createIndex(indexName).on(tableName).columns(columns).execute();
}
