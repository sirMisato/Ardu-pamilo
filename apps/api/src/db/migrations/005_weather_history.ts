import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("weather_history")
    .ifNotExists()
    .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
    .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
    .addColumn("plot_id", "varchar(36)", (column) => column.references("plots.id").onDelete("set null"))
    .addColumn("adm4_code", "varchar(32)", (column) => column.notNull())
    .addColumn("source", "varchar(255)", (column) => column.notNull())
    .addColumn("forecast_url", "varchar(1000)", (column) => column.notNull())
    .addColumn("current_condition", "varchar(160)", (column) => column.notNull())
    .addColumn("current_temperature_c", sql`decimal(6, 2)`)
    .addColumn("humidity_percent", sql`decimal(6, 2)`)
    .addColumn("rainfall_mm", sql`decimal(8, 2)`)
    .addColumn("wind_speed", sql`decimal(8, 2)`)
    .addColumn("wind_direction", "varchar(32)")
    .addColumn("cloud_cover_percent", sql`decimal(6, 2)`)
    .addColumn("observed_at", "timestamp", (column) => column.notNull())
    .addColumn("fetched_at", "timestamp", (column) => column.notNull())
    .addColumn("location_json", "json", (column) => column.notNull())
    .addColumn("current_json", "json", (column) => column.notNull())
    .addColumn("daily_json", "json", (column) => column.notNull())
    .addColumn("hourly_json", "json", (column) => column.notNull())
    .addColumn("is_mock", sql`boolean`, (column) => column.notNull().defaultTo(false))
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createIndexIfMissing(db, "weather_history_tenant_observed_idx", "weather_history", ["tenant_id", "observed_at"]);
  await createIndexIfMissing(db, "weather_history_tenant_adm4_observed_idx", "weather_history", ["tenant_id", "adm4_code", "observed_at"]);
  await createIndexIfMissing(db, "weather_history_tenant_plot_observed_idx", "weather_history", ["tenant_id", "plot_id", "observed_at"]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("weather_history").ifExists().execute();
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
