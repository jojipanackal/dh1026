import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { users } from "../src/db/schema";

loadEnvConfig(process.cwd());

const DEMO_USERS = [
  { name: "Asha Menon", email: "asha.menon@example.com" },
  { name: "Rahul Nair", email: "rahul.nair@example.com" },
  { name: "Priya Varghese", email: "priya.varghese@example.com" },
  { name: "Arjun Pillai", email: "arjun.pillai@example.com" },
  { name: "Meera Thomas", email: "meera.thomas@example.com" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await db.insert(users).values(DEMO_USERS).onConflictDoNothing({
    target: users.email,
  });
  const count = await db.$count(users);
  console.log(`Seed complete: ${count} users in database`);
  await pool.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
