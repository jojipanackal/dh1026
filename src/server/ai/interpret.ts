import "server-only";

import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { LanguageModel } from "ai";

import { aiInterpretation, type AiInterpretation } from "@/lib/journal/interpretation-schema";
import { buildJournalPrompt, JOURNAL_SYSTEM_PROMPT, type JournalPromptContext } from "@/lib/journal/prompt";
import { AppError } from "@/server/errors";

export async function interpretJournal(
  { body, context }: { body: string; context: JournalPromptContext },
  { model }: { model: LanguageModel },
): Promise<AiInterpretation> {
  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: aiInterpretation }),
      system: JOURNAL_SYSTEM_PROMPT,
      prompt: buildJournalPrompt(context, body),
      temperature: 0,
      abortSignal: AbortSignal.timeout(45_000),
    });
    return output;
  } catch (error) {
    // Operator-visible failure line: error names/codes only — never the
    // journal body, prompt, response text or the API key.
    const e = error as { name?: string; statusCode?: number; cause?: { name?: string } };
    console.error(
      `journal interpret failed: name=${e?.name ?? "unknown"} statusCode=${e?.statusCode ?? "n/a"} cause=${e?.cause?.name ?? "n/a"}`,
    );
    if (error instanceof NoObjectGeneratedError) {
      throw new AppError(
        "VALIDATION",
        "The AI response could not be understood. Try again or rephrase.",
      );
    }
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new AppError("VALIDATION", "The AI took too long to respond.");
    }
    throw new AppError(
      "VALIDATION",
      "The AI request failed. Check the provider configuration and try again.",
    );
  }
}
