import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { closeDatabase, db } from "./client.js";

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    import: (filePath) => import(pathToFileURL(filePath).href),
    migrationFolder: migrationsDirectory,
    path
  })
});

const { error, results } = await migrator.migrateToLatest();

for (const result of results ?? []) {
  console.log(`${result.status}: ${result.migrationName}`);
}

await closeDatabase();

if (error) {
  console.error("Migration failed");
  console.error(error);
  process.exit(1);
}

console.log(`Migrations complete from ${pathToFileURL(migrationsDirectory).href}`);
