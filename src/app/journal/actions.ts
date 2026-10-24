"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AppError } from "@/server/errors";
import { requireCurrentUser } from "@/server/current-user";
import {
  applyJournalEntry,
  dismissJournalEntry,
  interpretEntry,
  submitJournalEntry,
  type ApplySelection,
} from "@/server/journal";

export type JournalFormState = { error?: string };

function toState(error: unknown): JournalFormState {
  if (error instanceof AppError) return { error: error.message };
  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? "Invalid input" };
  }
  throw error;
}

export async function submitJournalAction(
  _prev: JournalFormState & { entryId?: string },
  formData: FormData,
): Promise<JournalFormState & { entryId?: string }> {
  try {
    const user = await requireCurrentUser();
    const entry = await submitJournalEntry(user.id, {
      body: String(formData.get("body") ?? ""),
      submissionKey: String(formData.get("submissionKey") ?? ""),
    });
    revalidatePath("/journal");
    return { entryId: entry.id };
  } catch (error) {
    return toState(error);
  }
}

export async function interpretJournalAction(
  entryId: string,
): Promise<JournalFormState> {
  try {
    const user = await requireCurrentUser();
    await interpretEntry(user.id, entryId);
    revalidatePath("/journal");
    return {};
  } catch (error) {
    return toState(error);
  }
}

export async function applyJournalAction(
  entryId: string,
  selection: ApplySelection,
): Promise<JournalFormState> {
  try {
    const user = await requireCurrentUser();
    await applyJournalEntry(user.id, entryId, selection);
    revalidatePath("/journal");
    return {};
  } catch (error) {
    return toState(error);
  }
}

export async function dismissJournalAction(
  entryId: string,
): Promise<JournalFormState> {
  try {
    const user = await requireCurrentUser();
    await dismissJournalEntry(user.id, entryId);
    revalidatePath("/journal");
    return {};
  } catch (error) {
    return toState(error);
  }
}
