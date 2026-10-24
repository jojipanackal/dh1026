import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
import { answerTaskQuestion } from "@/lib/journal/answers";
import { isUuid } from "@/lib/ids";
import { resolveInterpretation, type Resolved } from "@/lib/journal/resolve";
import type { JournalPromptContext } from "@/lib/journal/prompt";
import type { TaskStatus } from "@/lib/tasks/lifecycle";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/validation";
import { interpretJournal } from "@/server/ai/interpret";
import { AppError } from "@/server/errors";
import { applyTaskUpdate, createTask } from "@/server/tasks";

const submitSchema = z.object({
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
  // Idempotent insert: retrying the same submission key returns the entry.
  const [entry] = await db
    .insert(journalEntries)
    .values({
      projectId: null,
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

// Every project the user belongs to, with each project's members. Shared by
// the interpretation context and the journal page's assignee pickers.
async function listMemberProjects(userId: string) {
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(eq(projectMemberships.userId, userId))
    .orderBy(projects.createdAt);
  const membersByProject: Record<string, { id: string; name: string }[]> = {};
  for (const p of projectRows) membersByProject[p.id] = [];
  if (projectRows.length > 0) {
    const memberRows = await db
      .select({
        projectId: projectMemberships.projectId,
        id: users.id,
        name: users.name,
      })
      .from(projectMemberships)
      .innerJoin(users, eq(users.id, projectMemberships.userId))
      .where(
        inArray(
          projectMemberships.projectId,
          projectRows.map((p) => p.id),
        ),
      );
    for (const m of memberRows) {
      membersByProject[m.projectId].push({ id: m.id, name: m.name });
    }
  }
  return { projectRows, membersByProject };
}

export { listMemberProjects };

export async function interpretEntry(
  userId: string,
  entryId: string,
  deps: InterpretDeps = {},
) {
  if (!isUuid(entryId)) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const entry = await getEntry(entryId);
  if (!entry || entry.authorId !== userId) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  if (entry.status !== "pending" && entry.status !== "failed") {
    return entry;
  }

  const fail = async (message: string) => {
    const [updated] = await db
      .update(journalEntries)
      .set({ status: "failed", interpretationError: message })
      .where(eq(journalEntries.id, entry.id))
      .returning();
    return updated;
  };

  const [author] = await db
    .select()
    .from(users)
    .where(eq(users.id, entry.authorId));
  const { projectRows, membersByProject } = await listMemberProjects(userId);
  const projectIds = projectRows.map((p) => p.id);
  const taskRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            assigneeName: users.name,
            assigneeId: tasks.assigneeId,
            projectId: tasks.projectId,
            projectName: projects.name,
            dueDate: tasks.dueDate,
            updatedAt: tasks.updatedAt,
          })
          .from(tasks)
          .innerJoin(projects, eq(projects.id, tasks.projectId))
          .leftJoin(users, eq(users.id, tasks.assigneeId))
          .where(
            and(
              inArray(tasks.projectId, projectIds),
              sql`${tasks.status} <> 'cancelled'`,
            ),
          )
          .orderBy(desc(tasks.updatedAt))
          .limit(150);
  // Up to 6 earlier entries by this author, oldest first, so the model can
  // resolve references like "yes, assign it to Priya".
  const recentRows = await db
    .select({
      body: journalEntries.body,
      interpretation: journalEntries.interpretation,
    })
    .from(journalEntries)
    .where(
      and(
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
    projects: projectRows,
    authorName: author.name,
    today: todayIst(),
    tasks: taskRows,
    membersByProject,
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

  const taskAnswer = answerTaskQuestion(entry.body, {
    authorId: userId,
    authorName: author.name,
    tasks: taskRows.map((task) => ({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectName: task.projectName,
      status: task.status as TaskStatus,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
    })),
    membersByProject,
  });

  if (taskAnswer) {
    const [updated] = await db
      .update(journalEntries)
      .set({
        status: "ready",
        interpretation: resolveInterpretation(
          {
            summary: taskAnswer.summary,
            taskUpdates: [],
            newTasks: [],
            blockers: [],
            decisions: [],
            clarifications: [],
          },
          {
            projects: projectRows,
            tasks: taskRows.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status as TaskStatus,
              priority: task.priority,
              assigneeId: task.assigneeId,
              projectId: task.projectId,
            })),
            membersByProject: Object.fromEntries(
              Object.entries(membersByProject).map(([projectId, members]) => [
                projectId,
                members.map((member) => member.id),
              ]),
            ),
          },
          taskAnswer,
        ),
        interpretationError: null,
        model: "task-query",
        interpretedAt: new Date(),
      })
      .where(eq(journalEntries.id, entry.id))
      .returning();
    return updated;
  }

  const config = (deps.getConfig ?? getAiConfig)();
  const interpret = deps.interpret ?? interpretJournal;
  if (!config.ok) {
    return fail(config.error);
  }

  try {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const openai = createOpenAI({ apiKey: config.apiKey });
    const raw = await interpret(
      { body: entry.body, context },
      { model: openai(config.model) },
    );
    const resolved = resolveInterpretation(raw, {
      projects: projectRows,
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        projectId: t.projectId,
      })),
      membersByProject: Object.fromEntries(
        Object.entries(membersByProject).map(([projectId, members]) => [
          projectId,
          members.map((m) => m.id),
        ]),
      ),
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

// Entries are the author's private thread; only the author can read them.
export async function getJournalEntryForMember(entryId: string, userId: string) {
  if (!isUuid(entryId)) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const entry = await getEntry(entryId);
  if (!entry || entry.authorId !== userId) {
    throw new AppError("NOT_FOUND", "Journal entry not found");
  }
  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, entry.authorId));
  return { entry, authorName: author.name };
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
    if (!entry || entry.authorId !== userId) {
      throw new AppError("NOT_FOUND", "Journal entry not found");
    }
    if (entry.status === "applied") {
      throw new AppError("CONFLICT", "This entry was already applied");
    }
    if (entry.status !== "ready") {
      throw new AppError("VALIDATION", "This entry is not ready to apply");
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
      if (base.needsClarification || !base.projectId) {
        throw new AppError(
          "VALIDATION",
          `New task "${base.title}": its project is unclear — answer the clarification question first`,
        );
      }
      return { sel, base: base as typeof base & { projectId: string } };
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

    // Items can target different projects; membership is checked per item
    // against the project the item actually lands in.
    const memberOf = new Set<string>();
    const checkMember = async (projectId: string, label: string) => {
      if (memberOf.has(projectId)) return;
      const [membership] = await tx
        .select({ projectId: projectMemberships.projectId })
        .from(projectMemberships)
        .where(
          and(
            eq(projectMemberships.projectId, projectId),
            eq(projectMemberships.userId, userId),
          ),
        )
        .limit(1);
      if (!membership) {
        throw new AppError(
          "VALIDATION",
          `${label}: you are not a member of that project`,
        );
      }
      memberOf.add(projectId);
    };

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
        await checkMember(b.projectId, `Task "${update.label}"`);
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
              projectId: b.projectId,
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
        await checkMember(base.projectId, `New task "${sel.title}"`);
        const created = await createTask(
          userId,
          base.projectId,
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
  if (!entry || entry.authorId !== userId) {
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

// The private chat thread: all of this author's entries, oldest first.
export async function listJournalThread(userId: string, limit = 50) {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.authorId, userId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(limit);
  return rows.reverse();
}

// Project id per task id, used to link applied journal changes back to
// their tasks (tasks from several projects can appear in one entry).
export async function listTaskProjectMap(taskIds: string[]) {
  if (taskIds.length === 0) return {};
  const rows = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(inArray(tasks.id, taskIds));
  return Object.fromEntries(rows.map((r) => [r.id, r.projectId]));
}
