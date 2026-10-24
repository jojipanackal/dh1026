import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "postgres:" || protocol === "postgresql:";
      } catch {
        return false;
      }
    }, "DATABASE_URL must be a postgres:// or postgresql:// URL"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse({ DATABASE_URL: source.DATABASE_URL });
  if (!result.success) {
    const issue = result.error.issues[0];
    const name =
      issue && issue.path.length > 0 ? String(issue.path[0]) : "environment";
    throw new Error(
      `Invalid server environment: ${name} — ${issue?.message ?? "unknown error"}`,
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = parseServerEnv(process.env);
  }
  return cached;
}
