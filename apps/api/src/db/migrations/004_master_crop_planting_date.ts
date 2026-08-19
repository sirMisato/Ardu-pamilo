import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("master_crops")
    .addColumn("planting_date", "date")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("master_crops")
    .dropColumn("planting_date")
    .execute();
}
