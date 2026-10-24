import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import type { AiInterpretation } from "@/lib/journal/interpretation-schema";
import { todayIst } from "@/lib/dates";
import { STALLED_AFTER_DAYS } from "@/lib/overview";
import { AppError } from "@/server/errors";
import { applyJournalEntry, submitJournalEntry } from "@/server/journal";
import { getProjectOverview } from "@/server/overview";
import { createProject } from "@/server/projects";
import { createTask, moveTask } from "@/server/tasks";
import { ensureTestDb, insertUser, truncateAll } from "./helpers";

const CONFIG = { ok: true as const, apiKey: "test", model: "mock-model" };
const key = () => crypto.randomUUID();

function interp(raw: AiInterpretation) {
  return {
    interpret: async () => raw,
    getConfig: () => CONFIG,
  };
}

const empty: AiInterpretation = {
  summary: "s",
  taskUpdates: [],
  newTasks: [],
  blockers: [],
  decisions: [],
  clarifications: [],
};

const base = {
  description: null,
  priority: "medium" as const,
  assigneeId: null,
  dueDate: null,
  estimateHours: null,
};

async function fixture() {
  const owner = await insertUser("Own", "o@example.com");
  const project = await createProject(owner.id, { name: "P" });
  return { owner, project };
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.unreachable(`expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

beforeAll(ensureTestDb);
afterEach(truncateAll);

describe("getProjectOverview", () => {
  it("rejects non-members", async () => {
    const { project } = await fixture();
    const outsider = await insertUser("Out", "out@example.com");
    await expectAppError(
      getProjectOverview(project.id, outsider.id),
      "NOT_FOUND",
    );
    await expectAppError(
      getProjectOverview("not-a-uuid", outsider.id),
      "NOT_FOUND",
    );
  });

  it("counts statuses and computes donePct excluding cancelled", async () => {
    const { owner, project } = await fixture();
    await createTask(owner.id, project.id, { ...base, title: "a" });
    const b = await createTask(owner.id, project.id, { ...base, title: "b" });
    const c = await createTask(owner.id, project.id, { ...base, title: "c" });
    const d = await createTask(owner.id, project.id, { ...base, title: "d" });
    await moveTask(owner.id, b.id, "done");
    await moveTask(owner.id, c.id, "blocked");
    await moveTask(owner.id, d.id, "cancelled");

    const o = await getProjectOverview(project.id, owner.id);
    expect(o.counts).toEqual({
      todo: 1,
      in_progress: 0,
      blocked: 1,
      done: 1,
      cancelled: 1,
    });
    expect(o.open).toBe(2);
    expect(o.donePct).toBe(33);
  });

  it("shows the reported reason and journal link for a journal-applied blocker", async () => {
    const { owner, project } = await fixture();
    const t = await createTask(owner.id, project.id, {
      ...base,
      title: "Order lanyards",
    });
    const entry = await submitJournalEntry(
      owner.id,
      {
        projectId: project.id,
        body: "Lanyards are stuck waiting on Rahul",
        submissionKey: key(),
      },
      interp({
        ...empty,
        blockers: [
          { taskId: t.id, description: "waiting on Rahul", waitingOn: "Rahul" },
        ],
      }),
    );
    await applyJournalEntry(owner.id, entry.id, {
      taskUpdates: [],
      newTasks: [],
      blockers: [{ index: 0 }],
    });

    const o = await getProjectOverview(project.id, owner.id);
    expect(o.blocked).toHaveLength(1);
    const b = o.blocked[0];
    expect(b.title).toBe("Order lanyards");
    expect(b.reason).toBe("waiting on Rahul");
    expect(b.source).toBe("journal");
    expect(b.journalEntryId).toBe(entry.id);
    expect(b.blockedByName).toBe("Own");
  });

  it("shows no reason for a manually blocked task", async () => {
    const { owner, project } = await fixture();
    const t = await createTask(owner.id, project.id, { ...base, title: "T" });
    await moveTask(owner.id, t.id, "blocked");
    const o = await getProjectOverview(project.id, owner.id);
    expect(o.blocked[0].reason).toBeNull();
    expect(o.blocked[0].source).toBe("manual");
  });

  it("lists overdue open tasks but not done or future ones", async () => {
    const { owner, project } = await fixture();
    const now = new Date("2026-10-25T12:00:00Z"); // todayIst = 2026-10-25
    await createTask(owner.id, project.id, {
      ...base,
      title: "late",
      dueDate: "2026-10-23",
    });
    const done = await createTask(owner.id, project.id, {
      ...base,
      title: "done late",
      dueDate: "2026-10-20",
    });
    await moveTask(owner.id, done.id, "done");
    await createTask(owner.id, project.id, {
      ...base,
      title: "future",
      dueDate: "2026-11-30",
    });

    const o = await getProjectOverview(project.id, owner.id, now);
    expect(o.overdue.map((t) => t.title)).toEqual(["late"]);
    expect(o.overdue[0].daysOverdue).toBe(2);
  });

  it("lists high-priority and due-soon tasks under upcoming", async () => {
    const { owner, project } = await fixture();
    const now = new Date("2026-10-25T12:00:00Z");
    await createTask(owner.id, project.id, {
      ...base,
      title: "urgent no due",
      priority: "urgent",
    });
    await createTask(owner.id, project.id, {
      ...base,
      title: "medium due soon",
      dueDate: todayIst(now),
    });
    await createTask(owner.id, project.id, {
      ...base,
      title: "medium far",
      dueDate: "2027-01-01",
    });

    const o = await getProjectOverview(project.id, owner.id, now);
    const titles = o.upcoming.map((t) => t.title);
    expect(titles).toContain("urgent no due");
    expect(titles).toContain("medium due soon");
    expect(titles).not.toContain("medium far");
    const dueSoon = o.upcoming.find((t) => t.title === "medium due soon");
    expect(dueSoon?.daysUntilDue).toBe(0);
  });

  it("flags stale in-progress tasks as inferred stalls only", async () => {
    const { owner, project } = await fixture();
    const now = new Date("2026-10-25T12:00:00Z");
    const stale = await createTask(owner.id, project.id, {
      ...base,
      title: "stale",
      status: "in_progress",
    });
    await createTask(owner.id, project.id, {
      ...base,
      title: "fresh",
      status: "in_progress",
    });
    const old = new Date(
      now.getTime() - (STALLED_AFTER_DAYS + 2) * 86_400_000,
    );
    await db
      .update(tasks)
      .set({ updatedAt: old })
      .where(eq(tasks.id, stale.id));

    const o = await getProjectOverview(project.id, owner.id, now);
    expect(o.stalled.map((t) => t.title)).toEqual(["stale"]);
    expect(o.stalled[0].daysStale).toBe(STALLED_AFTER_DAYS + 2);
  });

  it("lists unapplied journal blockers as pending review", async () => {
    const { owner, project } = await fixture();
    await submitJournalEntry(
      owner.id,
      {
        projectId: project.id,
        body: "Vendor not responding",
        submissionKey: key(),
      },
      interp({
        ...empty,
        blockers: [
          {
            taskId: null,
            description: "vendor not responding",
            waitingOn: "vendor",
          },
        ],
      }),
    );

    const o = await getProjectOverview(project.id, owner.id);
    expect(o.pendingBlockers).toHaveLength(1);
    expect(o.pendingBlockers[0].description).toBe("vendor not responding");
    expect(o.pendingBlockers[0].waitingOn).toBe("vendor");
    expect(o.pendingBlockers[0].taskId).toBeNull();
    // Nothing applied yet, so no task is blocked.
    expect(o.blocked).toHaveLength(0);
  });

  it("returns empty sections for a project with no tasks", async () => {
    const { owner, project } = await fixture();
    const o = await getProjectOverview(project.id, owner.id);
    expect(o.open).toBe(0);
    expect(o.donePct).toBeNull();
    expect(o.blocked).toEqual([]);
    expect(o.overdue).toEqual([]);
    expect(o.upcoming).toEqual([]);
    expect(o.stalled).toEqual([]);
    expect(o.pendingBlockers).toEqual([]);
  });
});
