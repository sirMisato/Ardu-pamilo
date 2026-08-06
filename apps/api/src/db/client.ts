import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { env } from "../config/env.js";
import type { Database } from "./schema.js";

const pool = createPool({
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: env.database.ssl ? {} : undefined,
  timezone: "Z",
  uri: env.database.url
});

export const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool
  })
});

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
