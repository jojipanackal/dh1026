import { existsSync } from "node:fs";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { users } from "@/db/schema";

// @next/env's loadEnvConfig deliberately skips .env.local when
// NODE_ENV=test, so load it via Node's env-file support instead.
// process.loadEnvFile does not override variables that are already set,
// so a CI-provided TEST_DATABASE_URL is preserved.
function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = `${process.cwd()}/${file}`;
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

let migrated: Promise<void> | undefined;

// Applies migrations to the test database once per worker and points
// DATABASE_URL at it before any service code reads it. Lazily-initialized
// pools make this safe.
export function ensureTestDb() {
  migrated ??= (async () => {
    loadLocalEnv();
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) {
      throw new Error(
        "TEST_DATABASE_URL is not set. Integration tests need a dedicated test database (see .env.example).",
      );
    }
    if (testUrl === process.env.DATABASE_URL) {
      throw new Error(
        "TEST_DATABASE_URL must differ from DATABASE_URL — refusing to run integration tests against the development database.",
      );
    }
    process.env.DATABASE_URL = testUrl;
    const pool = new Pool({ connectionString: testUrl });
    try {
      await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    } finally {
      await pool.end();
    }
  })();
  return migrated;
}

export async function truncateAll() {
  const { db } = await import("@/db");
  await db.execute(sql`
    truncate table activity_events, tasks, project_memberships, projects, users
    restart identity cascade
  `);
}

export async function insertUser(name: string, email: string) {
  const { db } = await import("@/db");
  const [user] = await db.insert(users).values({ name, email }).returning();
  return user;
}
