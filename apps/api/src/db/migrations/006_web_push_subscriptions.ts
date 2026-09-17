import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("web_push_subscriptions")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
    .addColumn("user_id", "varchar(255)", (column) => column.notNull())
    .addColumn("endpoint", "text", (column) => column.notNull())
    .addColumn("endpoint_hash", "char(64)", (column) => column.notNull().unique())
    .addColumn("p256dh_key", "text", (column) => column.notNull())
    .addColumn("auth_key", "text", (column) => column.notNull())
    .addColumn("user_agent", "varchar(512)")
    .addColumn("locale", "varchar(8)", (column) => column.notNull().defaultTo("id"))
    .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`))
    .addColumn("last_seen_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createIndexIfMissing(db, "web_push_subscriptions_tenant_idx", "web_push_subscriptions", ["tenant_id"]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("web_push_subscriptions").ifExists().execute();
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
