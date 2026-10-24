import { connection } from "next/server";

import { checkDatabase } from "@/db/health";

export async function GET() {
  await connection();
  const database = await checkDatabase();
  if (database.ok) {
    return Response.json({ status: "ok", database }, { status: 200 });
  }
  return Response.json({ status: "error", database }, { status: 503 });
}
