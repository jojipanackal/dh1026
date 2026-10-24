import { describe, expect, it } from "vitest";

import {
  dayDiff,
  isStalled,
  latestBlockerInfo,
  staleDays,
  STALLED_AFTER_DAYS,
  type ActivityEventLike,
} from "@/lib/overview";

function event(
  changes: Record<string, { from: unknown; to: unknown }>,
  daysAgo: number,
  extra: Partial<ActivityEventLike> = {},
): ActivityEventLike {
  return {
    createdAt: new Date(Date.now() - daysAgo * 86_400_000),
    actorName: extra.actorName ?? "Asha",
    source: extra.source ?? "manual",
    journalEntryId: extra.journalEntryId ?? null,
    changes,
  };
}

describe("latestBlockerInfo", () => {
  it("returns null when the task was never blocked", () => {
    const events = [
      event({ status: { from: "todo", to: "in_progress" } }, 2),
      event({ title: { from: null, to: "T" } }, 3),
    ];
    expect(latestBlockerInfo(events)).toBeNull();
  });

  it("reads the reason merged into the status-change event", () => {
    const events = [
      event(
        {
          status: { from: "in_progress", to: "blocked" },
          blockedReason: { from: null, to: "waiting on Rahul" },
        },
        1,
        { source: "journal", journalEntryId: "e1" },
      ),
    ];
    const info = latestBlockerInfo(events);
    expect(info?.reason).toBe("waiting on Rahul");
    expect(info?.source).toBe("journal");
    expect(info?.journalEntryId).toBe("e1");
  });

  it("reads a standalone reason event newer than the block", () => {
    const events = [
      event(
        { blockedReason: { from: null, to: "second reason" } },
        0,
        { actorName: "Priya", source: "journal", journalEntryId: "e2" },
      ),
      event({ status: { from: "todo", to: "blocked" } }, 3, {
        actorName: "Asha",
      }),
    ];
    const info = latestBlockerInfo(events);
    expect(info?.reason).toBe("second reason");
    expect(info?.reasonActorName).toBe("Priya");
    expect(info?.reasonJournalEntryId).toBe("e2");
    expect(info?.blockedByName).toBe("Asha");
  });

  it("ignores a reason from a previous block cycle", () => {
    const events = [
      // Re-blocked manually one day ago with no reason.
      event({ status: { from: "todo", to: "blocked" } }, 1),
      event({ status: { from: "blocked", to: "todo" } }, 2),
      // Old journal reason from the first time it was blocked.
      event(
        {
          status: { from: "todo", to: "blocked" },
          blockedReason: { from: null, to: "stale reason" },
        },
        5,
        { source: "journal", journalEntryId: "old" },
      ),
    ];
    const info = latestBlockerInfo(events);
    expect(info?.reason).toBeNull();
    expect(info?.reasonJournalEntryId).toBeNull();
    expect(info?.source).toBe("manual");
  });

  it("keeps the reason when the block and reason share one event", () => {
    const events = [
      event(
        {
          status: { from: "in_progress", to: "blocked" },
          blockedReason: { from: null, to: "r" },
        },
        2,
      ),
      event({ blockedReason: { from: null, to: "older" } }, 6),
    ];
    expect(latestBlockerInfo(events)?.reason).toBe("r");
  });
});

describe("dayDiff", () => {
  it("is negative for past dates, zero for today, positive for future", () => {
    expect(dayDiff("2026-10-20", "2026-10-25")).toBe(-5);
    expect(dayDiff("2026-10-25", "2026-10-25")).toBe(0);
    expect(dayDiff("2026-10-30", "2026-10-25")).toBe(5);
  });
});

describe("isStalled / staleDays", () => {
  const now = new Date("2026-10-25T12:00:00Z");

  it("flags in-progress tasks untouched past the threshold", () => {
    const old = new Date(now.getTime() - (STALLED_AFTER_DAYS + 1) * 86_400_000);
    const fresh = new Date(now.getTime() - 86_400_000);
    expect(isStalled(old, now)).toBe(true);
    expect(isStalled(fresh, now)).toBe(false);
  });

  it("does not flag exactly at the threshold boundary", () => {
    const edge = new Date(now.getTime() - STALLED_AFTER_DAYS * 86_400_000);
    expect(isStalled(edge, now)).toBe(false);
  });

  it("staleDays floors whole days", () => {
    const twoAndHalf = new Date(now.getTime() - 2.6 * 86_400_000);
    expect(staleDays(twoAndHalf, now)).toBe(2);
  });
});
