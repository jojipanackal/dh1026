import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export async function listAllUsers() {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(asc(users.name));
}
