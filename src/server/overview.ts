import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  activityEvents,
  journalEntries,
  tasks,
  users,
} from "@/db/schema";
import { todayIst } from "@/lib/dates";
import { isUuid } from "@/lib/ids";
import type { Resolved } from "@/lib/journal/resolve";
import {
  dayDiff,
  isStalled,
  latestBlockerInfo,
  staleDays,
  DUE_SOON_DAYS,
  type ActivityEventLike,
} from "@/lib/overview";
import type { TaskStatus } from "@/lib/tasks/lifecycle";
import { AppError } from "@/server/errors";
import { getMembership } from "@/server/projects";

export type OverviewTaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  assigneeName: string | null;
  dueDate: string | null;
  daysOverdue: number | null;
  daysUntilDue: number | null;
  daysStale: number | null;
};

export type OverviewBlockedItem = OverviewTaskItem & {
  reason: string | null;
  reasonActorName: string | null;
  reasonJournalEntryId: string | null;
  blockedByName: string;
  blockedAt: Date;
  source: string;
  journalEntryId: string | null;
};

export type PendingBlocker = {
  entryId: string;
  authorName: string;
  createdAt: Date;
  description: string;
  waitingOn: string | null;
  taskId: string | null;
  taskTitle: string | null;
};

export type ProjectOverview = {
  counts: Record<TaskStatus, number>;
  // Tasks that can still move forward (excludes cancelled).
  open: number;
  donePct: number | null;
  blocked: OverviewBlockedItem[];
  overdue: OverviewTaskItem[];
  upcoming: OverviewTaskItem[];
  stalled: OverviewTaskItem[];
  pendingBlockers: PendingBlocker[];
};

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function getProjectOverview(
  projectId: string,
  userId: string,
  now: Date = new Date(),
): Promise<ProjectOverview> {
  if (!isUuid(projectId)) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const membership = await getMembership(projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Project not found");
  }

  const [taskRows, readyEntries] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        assigneeName: users.name,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(eq(tasks.projectId, projectId)),
    db
      .select({
        id: journalEntries.id,
        interpretation: journalEntries.interpretation,
        createdAt: journalEntries.createdAt,
        authorName: users.name,
      })
      .from(journalEntries)
      .innerJoin(users, eq(users.id, journalEntries.authorId))
      .where(
        and(
          eq(journalEntries.projectId, projectId),
          eq(journalEntries.status, "ready"),
        ),
      )
      .orderBy(desc(journalEntries.createdAt))
      .limit(30),
  ]);

  const today = todayIst(now);
  const counts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
    cancelled: 0,
  };

  const blockedRows = taskRows.filter((t) => t.status === "blocked");

  // Latest history for the currently blocked tasks, so each block can show
  // who marked it and any reported reason.
  const eventsByTask = new Map<string, ActivityEventLike[]>();
  if (blockedRows.length > 0) {
    const events = await db
      .select({
        taskId: activityEvents.taskId,
        createdAt: activityEvents.createdAt,
        source: activityEvents.source,
        journalEntryId: activityEvents.journalEntryId,
        changes: activityEvents.changes,
        actorName: users.name,
      })
      .from(activityEvents)
      .innerJoin(users, eq(users.id, activityEvents.actorId))
      .where(
        and(
          eq(activityEvents.projectId, projectId),
          eq(activityEvents.type, "task.updated"),
          inArray(
            activityEvents.taskId,
            blockedRows.map((t) => t.id),
          ),
        ),
      )
      .orderBy(desc(activityEvents.createdAt));
    for (const e of events) {
      if (!e.taskId) continue;
      const list = eventsByTask.get(e.taskId) ?? [];
      list.push(e);
      eventsByTask.set(e.taskId, list);
    }
  }

  const item = (t: (typeof taskRows)[number]): OverviewTaskItem => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    assigneeName: t.assigneeName,
    dueDate: t.dueDate,
    daysOverdue: null,
    daysUntilDue: null,
    daysStale: null,
  });

  const blocked: OverviewBlockedItem[] = [];
  const overdue: OverviewTaskItem[] = [];
  const upcoming: OverviewTaskItem[] = [];
  const stalled: OverviewTaskItem[] = [];

  for (const t of taskRows) {
    counts[t.status] += 1;
    // Cancelled tasks count toward totals but are never "attention" items.
    if (t.status === "cancelled") continue;
    const diff = t.dueDate ? dayDiff(t.dueDate, today) : null;
    if (t.status === "blocked") {
      const info = latestBlockerInfo(eventsByTask.get(t.id) ?? []);
      blocked.push({
        ...item(t),
        reason: info?.reason ?? null,
        reasonActorName: info?.reasonActorName ?? null,
        reasonJournalEntryId: info?.reasonJournalEntryId ?? null,
        blockedByName: info?.blockedByName ?? "Unknown",
        blockedAt: info?.blockedAt ?? t.updatedAt,
        source: info?.source ?? "manual",
        journalEntryId: info?.journalEntryId ?? null,
      });
      if (diff !== null && diff < 0) {
        overdue.push({ ...item(t), daysOverdue: -diff });
      }
      continue;
    }
    if (t.status === "done") continue;

    // Remaining cases: todo and in_progress.
    if (diff !== null && diff < 0) {
      overdue.push({ ...item(t), daysOverdue: -diff });
    }
    const dueSoon = diff !== null && diff >= 0 && diff <= DUE_SOON_DAYS;
    if (t.priority === "urgent" || t.priority === "high" || dueSoon) {
      upcoming.push({
        ...item(t),
        daysUntilDue: dueSoon ? diff : null,
      });
    }
    if (t.status === "in_progress" && isStalled(t.updatedAt, now)) {
      stalled.push({ ...item(t), daysStale: staleDays(t.updatedAt, now) });
    }
  }

  blocked.sort((a, b) => (a.blockedAt < b.blockedAt ? 1 : -1));
  overdue.sort(
    (a, b) =>
      (a.dueDate ?? "") < (b.dueDate ?? "") ? -1 : (a.dueDate ?? "") > (b.dueDate ?? "") ? 1 : 0,
  );
  upcoming.sort(
    (a, b) =>
      (a.dueDate ?? "9999") < (b.dueDate ?? "9999")
        ? -1
        : (a.dueDate ?? "9999") > (b.dueDate ?? "9999")
          ? 1
          : (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
  );
  stalled.sort((a, b) => (b.daysStale ?? 0) - (a.daysStale ?? 0));

  // Blockers extracted into interpretations that the author has not applied
  // yet — reported, but not yet part of project state.
  const pendingBlockers: PendingBlocker[] = [];
  for (const entry of readyEntries) {
    const interp = entry.interpretation as Resolved | null;
    for (const b of interp?.blockers ?? []) {
      pendingBlockers.push({
        entryId: entry.id,
        authorName: entry.authorName,
        createdAt: entry.createdAt,
        description: b.description,
        waitingOn: b.waitingOn,
        taskId: b.taskId,
        taskTitle: b.taskTitle,
      });
    }
  }

  const open = counts.todo + counts.in_progress + counts.blocked;
  return {
    counts,
    open,
    donePct:
      open + counts.done === 0
        ? null
        : Math.round((counts.done / (open + counts.done)) * 100),
    blocked,
    overdue,
    upcoming: upcoming.slice(0, 10),
    stalled,
    pendingBlockers,
  };
}
