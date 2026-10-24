"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { isUuid } from "@/lib/ids";
import { USER_COOKIE } from "@/server/current-user";

export async function setDemoUser(userId: string) {
  const store = await cookies();
  if (!isUuid(userId)) {
    store.delete(USER_COOKIE);
    return;
  }
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    store.delete(USER_COOKIE);
    return;
  }
  store.set(USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
