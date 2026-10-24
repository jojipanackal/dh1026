import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { isUuid } from "@/lib/ids";
import { AppError } from "@/server/errors";

export const USER_COOKIE = "pr_user_id";

export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get(USER_COOKIE)?.value;
  if (!id || !isUuid(id)) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("FORBIDDEN", "Select a demo user first");
  }
  return user;
}
