#!/usr/bin/env node
/**
 * Runs Drizzle migrations on the SQLite database at startup.
 * Call with: node scripts/migrate.mjs
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(rootDir, "data", "app.db");
const MIGRATIONS_FOLDER = path.join(rootDir, "drizzle");

const dir = path.dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

console.log(`Running migrations on: ${DB_PATH}`);
migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
console.log("Migrations complete.");
sqlite.close();
