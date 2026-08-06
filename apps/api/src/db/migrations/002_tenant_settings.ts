import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("tenant_settings")
    .ifNotExists()
    .addColumn("tenant_id", "varchar(36)", (column) => column.primaryKey().references("tenants.id").onDelete("cascade"))
    .addColumn("display_preferences_json", "json", (column) => column.notNull())
    .addColumn("notification_preferences_json", "json", (column) => column.notNull())
    .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("tenant_settings").ifExists().execute();
}
