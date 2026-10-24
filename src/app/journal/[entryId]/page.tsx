import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { EmptyState } from "@/components/states/empty-state";
import { getCurrentUser } from "@/server/current-user";
import { AppError } from "@/server/errors";
import { getJournalEntryForMember } from "@/server/journal";

export const instant = false;

// Old per-entry URLs now just anchor into the single journal thread.
export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  await connection();
  const { entryId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        title="No demo user selected"
        message="Pick a demo user in the top bar to view this entry."
      />
    );
  }
  try {
    await getJournalEntryForMember(entryId, user.id);
    redirect(`/journal#entry-${entryId}`);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
