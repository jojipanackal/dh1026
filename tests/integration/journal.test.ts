import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { activityEvents, journalEntries, tasks } from "@/db/schema";
import type { AiInterpretation } from "@/lib/journal/interpretation-schema";
async function expectAppError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.unreachable(`expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}
import {
  addProjectMember,
  createProject,
} from "@/server/projects";
import { ensureTestDb, insertUser, truncateAll } from "./helpers";
import {
  applyJournalEntry,
  dismissJournalEntry,
  getJournalEntryForMember,
  submitJournalEntry,
} from "@/server/journal";
import { createTask, moveTask } from "@/server/tasks";
import { AppError } from "@/server/errors";

const CONFIG = { ok: true as const, apiKey: "test", model: "mock-model" };
const key = () => crypto.randomUUID();

function interp(raw: AiInterpretation): { interpret: () => Promise<AiInterpretation>; getConfig: () => typeof CONFIG } {
  return { interpret: async () => raw, getConfig: () => CONFIG };
}

const empty: AiInterpretation = {
  summary: "s",
  taskUpdates: [],
  newTasks: [],
  blockers: [],
  decisions: [],
  clarifications: [],
};

async function fixture() {
  const owner = await insertUser("Own", "o@example.com");
  const project = await createProject(owner.id, { name: "P" });
  return { owner, project };
}

beforeAll(ensureTestDb);

afterEach(async () => {
  await truncateAll();
});

describe("journal", () => {
  it("submit -> ready with resolved interpretation stored", async () => {
    const { owner, project } = await fixture();
    const t = await createTask(owner.id, project.id, {
      title: "Task A", description: null, priority: "medium",
      assigneeId: null, dueDate: null, estimateHours: null,
    });
    const raw: AiInterpretation = {
      ...empty,
      taskUpdates: [
        { taskId: t.id, status: "in_progress", priority: null, assigneeId: null, reason: "r", confidence: "high" },
      ],
    };
    const entry = await submitJournalEntry(
      owner.id,
      { projectId: project.id, body: "working on it", submissionKey: key() },
      interp(raw),
    );
    const [row] = await db.select().from(journalEntries).where(eq(journalEntries.id, entry.id));
    expect(row.status).toBe("ready");
    const interp2 = row.interpretation as { taskUpdates: { taskTitle: string }[] };
    expect(interp2.taskUpdates[0].taskTitle).toBe("Task A");
    expect(row.model).toBe("mock-model");
  });

  it("invalid AI output -> failed with safe message, nothing changed", async () => {
    const { owner, project } = await fixture();
    const entry = await submitJournalEntry(
      owner.id,
      { projectId: project.id, body: "b", submissionKey: key() },
      {
        getConfig: () => CONFIG,
        interpret: async () => {
          throw new AppError("VALIDATION", "The AI response could not be understood. Try again or rephrase.");
        },
      },
    );
    const [row] = await db.select().from(journalEntries).where(eq(journalEntries.id, entry.id));
    expect(row.status).toBe("failed");
    expect(row.interpretationError).toContain("could not be understood");
    const all = await db.select().from(activityEvents);
    expect(all.filter((e) => e.type.startsWith("task."))).toHaveLength(0);
  });

  it("no API key -> failed with config message", async () => {
    const { owner, project } = await fixture();
    const entry = await submitJournalEntry(
      owner.id,
      { projectId: project.id, body: "b", submissionKey: key() },
      { getConfig: () => ({ ok: false as const, error: "AI is not configured: set OPENAI_API_KEY in .env.local" }) },
    );
    const [row] = await db.select().from(journalEntries).where(eq(journalEntries.id, entry.id));
    expect(row.status).toBe("failed");
    expect(row.interpretationError).toContain("OPENAI_API_KEY");
  });

  it("same submissionKey twice gives one entry", async () => {
    const { owner, project } = await fixture();
    const k = key();
    const a = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: k }, interp(empty));
    const b = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: k }, interp(empty));
    expect(b.id).toBe(a.id);
    expect(await db.select().from(journalEntries)).toHaveLength(1);
  });

  it("apply: updates task, creates task, events are journal-sourced", async () => {
    const { owner, project } = await fixture();
    const member = await insertUser("M", "m@example.com");
    await addProjectMember(owner.id, project.id, { userId: member.id, role: "member" });
    const t = await createTask(owner.id, project.id, {
      title: "Task A", description: null, priority: "medium",
      assigneeId: null, dueDate: null, estimateHours: null,
    });
    const raw: AiInterpretation = {
      ...empty,
      taskUpdates: [
        { taskId: t.id, status: "in_progress", priority: null, assigneeId: member.id, reason: "r", confidence: "high" },
      ],
      newTasks: [
        { title: "New thing", description: null, status: "todo", priority: "high", assigneeId: null, reason: "r", confidence: "high" },
      ],
      blockers: [{ taskId: t.id, description: "waiting on vendor", waitingOn: "vendor" }],
    };
    const entry = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: key() }, interp(raw));
    // blocker forces status blocked; keep the update selection too (merged)
    await applyJournalEntry(owner.id, entry.id, {
      taskUpdates: [{ index: 0, status: "in_progress", priority: null, assigneeId: member.id }],
      newTasks: [{ index: 0, title: "New thing", status: "todo", priority: "high", assigneeId: null }],
      blockers: [{ index: 0 }],
    });
    const [row] = await db.select().from(tasks).where(eq(tasks.id, t.id));
    expect(row.status).toBe("blocked"); // blocker wins the merge
    expect(row.assigneeId).toBe(member.id);
    const events = await db.select().from(activityEvents).where(eq(activityEvents.projectId, project.id));
    const journalEvents = events.filter((e) => e.source === "journal");
    expect(journalEvents.length).toBeGreaterThanOrEqual(2);
    expect(journalEvents.every((e) => e.journalEntryId === entry.id)).toBe(true);
    const [entryRow] = await db.select().from(journalEntries).where(eq(journalEntries.id, entry.id));
    expect(entryRow.status).toBe("applied");
    const applied = entryRow.appliedChanges as { createdTaskIds: string[] };
    expect(applied.createdTaskIds).toHaveLength(1);
    const blockedEvent = journalEvents.find((e) => e.taskId === t.id);
    expect(blockedEvent?.changes).toMatchObject({
      blockedReason: { from: null, to: "waiting on vendor" },
    });
  });

  it("apply twice -> CONFLICT", async () => {
    const { owner, project } = await fixture();
    const entry = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: key() }, interp(empty));
    const sel = { taskUpdates: [], newTasks: [], blockers: [] };
    await applyJournalEntry(owner.id, entry.id, sel);
    await expectAppError(applyJournalEntry(owner.id, entry.id, sel), "CONFLICT");
  });

  it("apply when a selected task moved to done: VALIDATION, nothing applied", async () => {
    const { owner, project } = await fixture();
    const t = await createTask(owner.id, project.id, {
      title: "Task A", description: null, priority: "medium",
      assigneeId: null, dueDate: null, estimateHours: null,
    });
    const raw: AiInterpretation = {
      ...empty,
      taskUpdates: [{ taskId: t.id, status: "in_progress", priority: null, assigneeId: null, reason: "r", confidence: "high" }],
      newTasks: [{ title: "Also new", description: null, status: "todo", priority: "medium", assigneeId: null, reason: "r", confidence: "high" }],
    };
    const entry = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: key() }, interp(raw));
    await moveTask(owner.id, t.id, "done"); // race: now the stored transition is invalid
    await expectAppError(
      applyJournalEntry(owner.id, entry.id, {
        taskUpdates: [{ index: 0, status: "in_progress", priority: null, assigneeId: null }],
        newTasks: [{ index: 0, title: "Also new", status: "todo", priority: "medium", assigneeId: null }],
        blockers: [],
      }),
      "VALIDATION",
    );
    // whole transaction rolled back: no new task, entry not applied
    const all = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
    expect(all).toHaveLength(1);
    const [entryRow] = await db.select().from(journalEntries).where(eq(journalEntries.id, entry.id));
    expect(entryRow.status).toBe("ready");
  });

  it("non-member cannot get or apply", async () => {
    const { owner, project } = await fixture();
    const outsider = await insertUser("X", "x@example.com");
    const entry = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: key() }, interp(empty));
    await expectAppError(getJournalEntryForMember(entry.id, outsider.id), "NOT_FOUND");
    await expectAppError(
      applyJournalEntry(outsider.id, entry.id, { taskUpdates: [], newTasks: [], blockers: [] }),
      "NOT_FOUND",
    );
  });

  it("selection index out of range -> VALIDATION", async () => {
    const { owner, project } = await fixture();
    const entry = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: key() }, interp(empty));
    await expectAppError(
      applyJournalEntry(owner.id, entry.id, {
        taskUpdates: [{ index: 5, status: "done", priority: null, assigneeId: null }],
        newTasks: [], blockers: [],
      }),
      "VALIDATION",
    );
  });

  it("blocker on an already-blocked task records blockedReason", async () => {
    const { owner, project } = await fixture();
    const t = await createTask(owner.id, project.id, {
      title: "Blocked task", description: null, priority: "medium",
      assigneeId: null, dueDate: null, estimateHours: null,
      status: "blocked",
    });
    const raw: AiInterpretation = {
      ...empty,
      blockers: [{ taskId: t.id, description: "waiting on vendor", waitingOn: null }],
    };
    const entry = await submitJournalEntry(
      owner.id,
      { projectId: project.id, body: "b", submissionKey: key() },
      interp(raw),
    );
    await applyJournalEntry(owner.id, entry.id, {
      taskUpdates: [], newTasks: [], blockers: [{ index: 0 }],
    });
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.taskId, t.id));
    const journalEvent = events.find((e) => e.source === "journal");
    expect(journalEvent?.changes).toEqual({
      blockedReason: { from: null, to: "waiting on vendor" },
    });
    const [row] = await db.select().from(tasks).where(eq(tasks.id, t.id));
    expect(row.status).toBe("blocked");
  });

  it("dismiss sets dismissed", async () => {
    const { owner, project } = await fixture();
    const entry = await submitJournalEntry(owner.id, { projectId: project.id, body: "b", submissionKey: key() }, interp(empty));
    const updated = await dismissJournalEntry(owner.id, entry.id);
    expect(updated.status).toBe("dismissed");
  });
});
