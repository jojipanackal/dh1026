import "server-only";

import { getPool } from "./index";

export type DatabaseHealth =
  | { ok: true; latencyMs: number }
  | { ok: false; error: string };

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  // Strip anything that looks like a connection string or credentials.
  return raw
    .replace(/postgres(ql)?:\/\/\S+/gi, "[redacted]")
    .replace(/password=\S+/gi, "password=[redacted]");
}

export async function checkDatabase(): Promise<DatabaseHealth> {
  try {
    const start = performance.now();
    await getPool().query("select 1");
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}
