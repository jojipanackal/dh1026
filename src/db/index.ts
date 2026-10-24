import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
  db?: NodePgDatabase<typeof schema>;
};

export function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: getServerEnv().DATABASE_URL,
    });
  }
  return globalForDb.pool;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.db) {
    globalForDb.db = drizzle({ client: getPool(), schema });
  }
  return globalForDb.db;
}

// Lazily forwards to the real client so importing this module does not
// require DATABASE_URL (e.g. during `next build`).
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});
