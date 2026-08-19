import { sql, type Kysely } from "kysely";

const timestamps = {
  createdAt: (table: ReturnType<Kysely<unknown>["schema"]["createTable"]>) => table
    .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`))
};

export async function up(db: Kysely<unknown>): Promise<void> {
  await timestamps.createdAt(
    db.schema
      .createTable("tenant_users")
      .ifNotExists()
      .addColumn("id", "varchar(36)", (column) => column.primaryKey())
      .addColumn("tenant_id", "varchar(36)", (column) => column.notNull().references("tenants.id").onDelete("cascade"))
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("email", "varchar(255)", (column) => column.notNull())
      .addColumn("password_hash", "varchar(255)", (column) => column.notNull())
      .addColumn("role", sql`enum('tenant_user')`, (column) => column.notNull().defaultTo("tenant_user"))
      .addColumn("status", sql`enum('active', 'inactive')`, (column) => column.notNull().defaultTo("active"))
      .addUniqueConstraint("tenant_users_email_unique", ["email"])
      .addUniqueConstraint("tenant_users_tenant_email_unique", ["tenant_id", "email"])
  ).execute();

  await createIndexIfMissing(db, "tenant_users_tenant_idx", "tenant_users", ["tenant_id"]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("tenant_users").ifExists().execute();
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
