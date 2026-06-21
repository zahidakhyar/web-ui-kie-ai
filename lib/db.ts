import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from './schema';

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'app.db');

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __db: DbInstance | undefined;
}

function createDb(): DbInstance {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

export function getDb(): DbInstance {
  if (!global.__db) {
    global.__db = createDb();
  }
  return global.__db;
}

// Lazily-resolved proxy so callers can write `db.query...` directly
export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
