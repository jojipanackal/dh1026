// Pure rules behind the project overview. Kept free of database and React
// imports so the logic is deterministic and unit-testable (TECH.md §13).

// An in-progress task with no recorded change for this many days is shown as
// a possible stall. This is an inference from task timestamps, not a reported
// fact, and the UI must label it as such.
export const STALLED_AFTER_DAYS = 4;

// Open (non-blocked) tasks due within this window appear under priorities.
export const DUE_SOON_DAYS = 7;

export type ActivityEventLike = {
  createdAt: Date;
  actorName: string;
  source: string;
  journalEntryId: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
};

export type BlockerInfo = {
  // The stated reason, if one was recorded. Reason and "marked blocked" can
  // come from different events (e.g. blocked manually, reason added later via
  // a journal entry), so both are reported separately.
  reason: string | null;
  reasonActorName: string | null;
  reasonJournalEntryId: string | null;
  blockedByName: string;
  blockedAt: Date;
  source: string;
  journalEntryId: string | null;
};

// Given a task's activity events newest-first, describe the most recent time
// it entered Blocked. A reason only counts if it was recorded at or after the
// latest block transition — an older reason belongs to a previous block cycle.
// Returns null if the task was never marked blocked.
export function latestBlockerInfo(
  events: ActivityEventLike[],
): BlockerInfo | null {
  const blockEvent = events.find((e) => e.changes.status?.to === "blocked");
  if (!blockEvent) return null;
  const reasonEvent = events.find(
    (e) =>
      typeof e.changes.blockedReason?.to === "string" &&
      e.createdAt >= blockEvent.createdAt,
  );
  return {
    reason: (reasonEvent?.changes.blockedReason?.to as string) ?? null,
    reasonActorName: reasonEvent?.actorName ?? null,
    reasonJournalEntryId: reasonEvent?.journalEntryId ?? null,
    blockedByName: blockEvent.actorName,
    blockedAt: blockEvent.createdAt,
    source: blockEvent.source,
    journalEntryId: blockEvent.journalEntryId,
  };
}

// Signed day difference between two YYYY-MM-DD dates: negative means dateStr
// is in the past relative to todayStr.
export function dayDiff(dateStr: string, todayStr: string): number {
  const a = Date.parse(`${dateStr}T00:00:00Z`);
  const b = Date.parse(`${todayStr}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

export function isStalled(updatedAt: Date, now: Date): boolean {
  return now.getTime() - updatedAt.getTime() > STALLED_AFTER_DAYS * 86_400_000;
}

export function staleDays(updatedAt: Date, now: Date): number {
  return Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000);
}
