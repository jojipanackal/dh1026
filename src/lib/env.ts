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
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional().default("gpt-4.1-mini"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_DEFAULT_USER_ID: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.uuid().optional(),
  ),
  TELEGRAM_ALLOWED_CHAT_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
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

export type AiConfig =
  | { ok: true; apiKey: string; model: string }
  | { ok: false; error: string };

export function getAiConfig(): AiConfig {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: "AI is not configured: set OPENAI_API_KEY in .env.local",
    };
  }
  return { ok: true, apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL };
}
