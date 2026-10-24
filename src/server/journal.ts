import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  activityEvents,
  journalEntries,
  projectMemberships,
  projects,
  tasks,
  users,
} from "@/db/schema";
import { getAiConfig } from "@/lib/env";
import { isUuid } from "@/lib/ids";
import { resolveInterpretation, type Resolved } from "@/lib/journal/resolve";
import type { JournalPromptContext } from "@/lib/journal/prompt";
import type { TaskStatus } from "@/lib/tasks/lifecycle";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/validation";
import { interpretJournal } from "@/server/ai/interpret";
import { AppError } from "@/server/errors";
import { getMembership } from "@/server/projects";
import { applyTaskUpdate, createTask } from "@/server/tasks";

const submitSchema = z.object({
  projectId: z.uuid(),
  body: z.string().trim().min(1, "Write something first").max(5000),
  submissionKey: z.uuid(),
});

type InterpretDeps = {
  interpret?: typeof interpretJournal;
  getConfig?: typeof getAiConfig;
};

export async function submitJournalEntry(
  userId: string,
  input: z.input<typeof submitSchema>,
  deps: InterpretDeps = {},
) {
  const parsed = submitSchema.parse(input);
  const membership = await getMembership(parsed.projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  // Idempotent insert: retrying the same submission key returns the entry.
  const [entry] = await db
    .insert(journalEntries)
    .values({
      projectId: parsed.projectId,
      authorId: userId,
      body: parsed.body,
      submissionKey: parsed.submissionKey,
    })
    .onConflictDoNothing({
      target: [journalEntries.authorId, journalEntries.submissionKey],
    })
    .returning();
  if (entry) {
    await interpretEntry(userId, entry.id, deps);
    return entry;
  }
  const [existing] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.authorId, userId),
        eq(journalEntries.submissionKey, parsed.submissionKey),
      ),
    )
    .limit(1);
  return existing;
}

function todayIst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getEntry(entryId: string) {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, entryId))
    .limit(1);
  return entry ?? null;
}

export async function interpretEntry(
  userId: string,
  entryId: string,
  deps: InterpretDeps = {},
) {
  if (!isUuid(entryId)) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const entry = await getEntry(entryId);
  if (!entry) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const membership = await getMembership(entry.projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  if (entry.status !== "pending" && entry.status !== "failed") {
    return entry;
  }

  const config = (deps.getConfig ?? getAiConfig)();
  const interpret = deps.interpret ?? interpretJournal;

  const fail = async (message: string) => {
    const [updated] = await db
      .update(journalEntries)
      .set({ status: "failed", interpretationError: message })
      .where(eq(journalEntries.id, entry.id))
      .returning();
    return updated;
  };

  if (!config.ok) {
    return fail(config.error);
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, entry.projectId));
  const [author] = await db
    .select()
    .from(users)
    .where(eq(users.id, entry.authorId));
  const memberRows = await db
    .select({ id: users.id, name: users.name })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .where(eq(projectMemberships.projectId, entry.projectId));
  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      assigneeName: users.name,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(eq(tasks.projectId, entry.projectId), sql`${tasks.status} <> 'cancelled'`))
    .orderBy(desc(tasks.updatedAt))
    .limit(150);
  // Up to 6 earlier entries by this author in the same project, oldest
  // first, so the model can resolve references like "yes, assign it to Priya".
  const recentRows = await db
    .select({
      body: journalEntries.body,
      interpretation: journalEntries.interpretation,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.projectId, entry.projectId),
        eq(journalEntries.authorId, entry.authorId),
        sql`${journalEntries.createdAt} < ${entry.createdAt}`,
        // Dismissed entries were rejected by the author; feeding them back
        // would make the model skip proposals it "already made".
        sql`${journalEntries.status} <> 'dismissed'`,
      ),
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(6);
  recentRows.reverse();

  const context: JournalPromptContext = {
    projectName: project.name,
    authorName: author.name,
    today: todayIst(),
    members: memberRows,
    tasks: taskRows,
    recent: recentRows.map((r) => {
      const interp = r.interpretation as {
        summary?: string;
        clarifications?: string[];
      } | null;
      return {
        body: r.body,
        summary: interp?.summary ?? null,
        clarifications: interp?.clarifications ?? [],
      };
    }),
  };

  try {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const openai = createOpenAI({ apiKey: config.apiKey });
    const raw = await interpret(
      { body: entry.body, context },
      { model: openai(config.model) },
    );
    const resolved = resolveInterpretation(raw, {
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
      })),
      memberIds: memberRows.map((m) => m.id),
    });
    const [updated] = await db
      .update(journalEntries)
      .set({
        status: "ready",
        interpretation: resolved,
        interpretationError: null,
        model: config.model,
        interpretedAt: new Date(),
      })
      .where(eq(journalEntries.id, entry.id))
      .returning();
    return updated;
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "The AI request failed unexpectedly. Try again.";
    return fail(message);
  }
}

export async function getJournalEntryForMember(entryId: string, userId: string) {
  if (!isUuid(entryId)) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const entry = await getEntry(entryId);
  if (!entry) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const membership = await getMembership(entry.projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, entry.projectId));
  const [author] = await db.select({ name: users.name }).from(users).where(eq(users.id, entry.authorId));
  return { entry, projectName: project.name, authorName: author.name };
}

export async function listJournalEntries(
  userId: string,
  options: { projectId?: string; limit?: number } = {},
) {
  const conditions = [
    sql`${projectMemberships.userId} = ${userId}`,
  ];
  if (options.projectId) {
    if (!isUuid(options.projectId)) return [];
    conditions.push(eq(journalEntries.projectId, options.projectId));
  }
  return db
    .select({
      id: journalEntries.id,
      body: journalEntries.body,
      status: journalEntries.status,
      createdAt: journalEntries.createdAt,
      projectName: projects.name,
      authorName: users.name,
    })
    .from(journalEntries)
    .innerJoin(projects, eq(projects.id, journalEntries.projectId))
    .innerJoin(users, eq(users.id, journalEntries.authorId))
    .innerJoin(
      projectMemberships,
      eq(projectMemberships.projectId, journalEntries.projectId),
    )
    .where(and(...conditions))
    .orderBy(desc(journalEntries.createdAt))
    .limit(options.limit ?? 20);
}

const selectionSchema = z.object({
  taskUpdates: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      status: z.enum(["todo", "in_progress", "blocked", "done", "cancelled"]).nullable(),
      priority: z.enum(TASK_PRIORITIES).nullable(),
      assigneeId: z.uuid().nullable(),
    }),
  ),
  newTasks: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      title: z.string().trim().min(1).max(200),
      status: z.enum(["todo", "in_progress", "blocked"]),
      priority: z.enum(TASK_PRIORITIES),
      assigneeId: z.uuid().nullable(),
    }),
  ),
  blockers: z.array(z.object({ index: z.number().int().nonnegative() })),
});
export type ApplySelection = z.infer<typeof selectionSchema>;

export async function applyJournalEntry(
  userId: string,
  entryId: string,
  selectionInput: ApplySelection,
) {
  if (!isUuid(entryId)) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const selection = selectionSchema.parse(selectionInput);
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, entryId))
      .limit(1)
      .for("update");
    if (!entry) {
      throw new AppError("NOT_FOUND", "Journal entry not found");
    }
    if (entry.status === "applied") {
      throw new AppError("CONFLICT", "This entry was already applied");
    }
    if (entry.status !== "ready") {
      throw new AppError("VALIDATION", "This entry is not ready to apply");
    }
    const [membership] = await tx
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, entry.projectId),
          eq(projectMemberships.userId, userId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new AppError("NOT_FOUND", "Journal entry not found");
    }
    const resolved = entry.interpretation as Resolved | null;
    if (!resolved) {
      throw new AppError("VALIDATION", "This entry has no interpretation");
    }

    const item = (kind: string, index: number) => `"${kind}" #${index + 1}`;
    const taskUpdates = selection.taskUpdates.map((sel) => {
      const base = resolved.taskUpdates[sel.index];
      if (!base) {
        throw new AppError("VALIDATION", `Unknown task update ${item("task update", sel.index)}`);
      }
      return { sel, base };
    });
    const newTaskSels = selection.newTasks.map((sel) => {
      const base = resolved.newTasks[sel.index];
      if (!base) {
        throw new AppError("VALIDATION", `Unknown new task ${item("new task", sel.index)}`);
      }
      return { sel, base };
    });
    const blockerSels = selection.blockers.map((sel) => {
      const base = resolved.blockers[sel.index];
      if (!base) {
        throw new AppError("VALIDATION", `Unknown blocker ${item("blocker", sel.index)}`);
      }
      if (!base.taskId) {
        throw new AppError("VALIDATION", `Blocker ${item("blocker", sel.index)} is not linked to a task`);
      }
      return { sel, base };
    });

    // Merge "block this task" selections into the per-task updates so each
    // task is written at most once.
    const byTask = new Map<
      string,
      {
        status: TaskStatus | null;
        priority: TaskPriority | null;
        assigneeId: string | null;
        blockerDescription: string | null;
        label: string;
      }
    >();
    for (const { sel, base } of taskUpdates) {
      byTask.set(base.taskId, {
        status: sel.status,
        priority: sel.priority,
        assigneeId: sel.assigneeId,
        blockerDescription: null,
        label: base.taskTitle,
      });
    }
    for (const { base } of blockerSels) {
      const existing = byTask.get(base.taskId!);
      if (existing) {
        existing.status = "blocked";
        existing.blockerDescription = base.description;
      } else {
        byTask.set(base.taskId!, {
          status: "blocked",
          priority: null,
          assigneeId: null,
          blockerDescription: base.description,
          label: base.taskTitle ?? "task",
        });
      }
    }

    const updatedTaskIds: string[] = [];
    const createdTaskIds: string[] = [];

    for (const [taskId, update] of byTask) {
      try {
        const before = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1);
        if (before.length === 0) {
          throw new AppError("VALIDATION", `Task "${update.label}" no longer exists`);
        }
        const b = before[0];
        const updated = await applyTaskUpdate(
          tx,
          userId,
          taskId,
          () => ({
            title: b.title,
            description: b.description,
            status: update.status ?? b.status,
            priority: update.priority ?? b.priority,
            assigneeId: update.assigneeId ?? b.assigneeId,
            dueDate: b.dueDate,
            estimateHours: b.estimateHours,
          }),
          { source: "journal", journalEntryId: entry.id },
        );
        updatedTaskIds.push(taskId);
        if (update.blockerDescription) {
          const events = await tx
            .select({ id: activityEvents.id })
            .from(activityEvents)
            .where(
              and(
                eq(activityEvents.taskId, taskId),
                eq(activityEvents.journalEntryId, entry.id),
                eq(activityEvents.type, "task.updated"),
              ),
            )
            .limit(1);
          if (events.length === 0) {
            // The task was already blocked (or the update was otherwise a
            // no-op): still record the blocker as its own journal event.
            await tx.insert(activityEvents).values({
              projectId: entry.projectId,
              taskId,
              actorId: userId,
              type: "task.updated",
              changes: {
                blockedReason: { from: null, to: update.blockerDescription },
              },
              source: "journal",
              journalEntryId: entry.id,
            });
          } else {
            await tx
              .update(activityEvents)
              .set({
                changes: sql`${activityEvents.changes} || ${JSON.stringify({ blockedReason: { from: null, to: update.blockerDescription } })}::jsonb`,
              })
              .where(eq(activityEvents.id, events[0].id));
          }
        }
        void updated;
      } catch (error) {
        if (error instanceof AppError) {
          throw new AppError("VALIDATION", `${update.label}: ${error.message}`);
        }
        throw error;
      }
    }

    for (const { sel, base } of newTaskSels) {
      try {
        const created = await createTask(
          userId,
          entry.projectId,
          {
            title: sel.title,
            description: base.description,
            status: sel.status,
            priority: sel.priority,
            assigneeId: sel.assigneeId,
            dueDate: null,
            estimateHours: null,
          },
          { tx, source: "journal", journalEntryId: entry.id },
        );
        createdTaskIds.push(created.id);
      } catch (error) {
        if (error instanceof AppError) {
          throw new AppError("VALIDATION", `${sel.title}: ${error.message}`);
        }
        throw error;
      }
    }

    const [applied] = await tx
      .update(journalEntries)
      .set({
        status: "applied",
        appliedAt: new Date(),
        appliedChanges: { updatedTaskIds, createdTaskIds },
      })
      .where(eq(journalEntries.id, entry.id))
      .returning();
    return applied;
  });
}

export async function dismissJournalEntry(userId: string, entryId: string) {
  if (!isUuid(entryId)) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const entry = await getEntry(entryId);
  if (!entry) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const membership = await getMembership(entry.projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  if (entry.status !== "ready" && entry.status !== "failed") {
    throw new AppError("VALIDATION", "This entry cannot be dismissed");
  }
  const [updated] = await db
    .update(journalEntries)
    .set({ status: "dismissed" })
    .where(eq(journalEntries.id, entryId))
    .returning();
  return updated;
}

// The private chat thread: this author's entries in one project, oldest first.
export async function listJournalThread(
  userId: string,
  projectId: string,
  limit = 50,
) {
  if (!isUuid(projectId)) return [];
  const membership = await getMembership(projectId, userId);
  if (!membership) return [];
  return db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.projectId, projectId),
        eq(journalEntries.authorId, userId),
      ),
    )
    .orderBy(journalEntries.createdAt)
    .limit(limit);
}

// Latest entry per project for the rail's excerpt/time (own entries only).
export async function listLatestEntryPerProject(userId: string) {
  const rows = await db
    .select({
      projectId: journalEntries.projectId,
      body: journalEntries.body,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(eq(journalEntries.authorId, userId))
    .orderBy(desc(journalEntries.createdAt));
  const latest = new Map<string, { body: string; createdAt: Date }>();
  for (const r of rows) {
    if (!latest.has(r.projectId)) {
      latest.set(r.projectId, { body: r.body, createdAt: r.createdAt });
    }
  }
  return latest;
}

// The journal page's implicit selection when no projectId param is given:
// most recently journaled project, else the first project. Kept here so the
// sidebar Conversations rail marks the same project active by default.
export function pickDefaultProjectId(
  projectIds: string[],
  latest: Map<string, { createdAt: Date }>,
): string | undefined {
  return (
    projectIds
      .map((id) => ({ id, at: latest.get(id)?.createdAt }))
      .filter((p) => p.at)
      .sort((a, b) => (a.at! < b.at! ? 1 : -1))[0]?.id ?? projectIds[0]
  );
}
