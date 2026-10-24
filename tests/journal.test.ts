import { describe, expect, it } from "vitest";

import { aiInterpretation } from "@/lib/journal/interpretation-schema";
import { buildJournalPrompt } from "@/lib/journal/prompt";
import { defaultSelection, resolveInterpretation } from "@/lib/journal/resolve";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";
const MEMBER = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";

const ctx = {
  tasks: [
    { id: T1, title: "Print badges", status: "todo" as const, priority: "medium", assigneeId: null },
    { id: T2, title: "Order lanyards", status: "done" as const, priority: "low", assigneeId: MEMBER },
  ],
  memberIds: [MEMBER],
};

const base = {
  summary: "s",
  taskUpdates: [],
  newTasks: [],
  blockers: [],
  decisions: [],
  clarifications: [],
};

describe("resolveInterpretation", () => {
  it("drops updates for unknown tasks with an issue", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: OTHER,
            status: "done",
            priority: null,
            assigneeId: null,
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    expect(r.taskUpdates).toHaveLength(0);
    expect(r.issues).toEqual(["Dropped an update for an unknown task"]);
  });

  it("nulls non-member assignees with an issue", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: T1,
            status: null,
            priority: null,
            assigneeId: OTHER,
            reason: "r",
            confidence: "high",
          },
        ],
        newTasks: [
          {
            title: "t",
            description: null,
            status: "todo",
            priority: "low",
            assigneeId: OTHER,
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    // assignee nulled => update changes nothing => dropped
    expect(r.taskUpdates).toHaveLength(0);
    expect(r.newTasks[0].assigneeId).toBeNull();
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("flags an invalid transition", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: T2,
            status: "blocked",
            priority: null,
            assigneeId: null,
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    expect(r.taskUpdates[0].transitionError).toContain("Cannot move");
    expect(r.taskUpdates[0].fromStatus).toBe("done");
  });

  it("normalises values equal to the current state, then drops", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: T2,
            status: "done", // already done
            priority: "low", // already low
            assigneeId: MEMBER, // already assigned to MEMBER
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    expect(r.taskUpdates).toHaveLength(0);
    expect(r.issues).toEqual(['Dropped a no-op update for "Order lanyards"']);
  });

  it("keeps only the actually-changed fields", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: T2,
            status: "done", // unchanged
            priority: "urgent", // changed
            assigneeId: null,
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    expect(r.taskUpdates[0].status).toBeNull();
    expect(r.taskUpdates[0].priority).toBe("urgent");
    expect(r.taskUpdates[0].fromStatus).toBe("done");
    expect(r.taskUpdates[0].fromPriority).toBe("low");
    expect(r.taskUpdates[0].fromAssigneeId).toBe(MEMBER);
  });

  it("drops a no-op update", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: T1,
            status: null,
            priority: null,
            assigneeId: null,
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    expect(r.taskUpdates).toHaveLength(0);
  });

  it("detects exact and near duplicates; leaves non-duplicates", () => {
    const r = resolveInterpretation(
      {
        ...base,
        newTasks: [
          { title: "print  badges!", description: null, status: "todo", priority: "low", assigneeId: null, reason: "r", confidence: "high" },
          { title: "Print all badges", description: null, status: "todo", priority: "low", assigneeId: null, reason: "r", confidence: "high" },
          { title: "Buy projector bulbs", description: null, status: "todo", priority: "low", assigneeId: null, reason: "r", confidence: "high" },
        ],
      },
      ctx,
    );
    expect(r.newTasks[0].possibleDuplicateOf?.id).toBe(T1); // exact normalised
    expect(r.newTasks[1].possibleDuplicateOf?.id).toBe(T1); // jaccard >= 0.6
    expect(r.newTasks[2].possibleDuplicateOf).toBeNull();
  });

  it("nulls unknown blocker taskIds", () => {
    const r = resolveInterpretation(
      { ...base, blockers: [{ taskId: OTHER, description: "stuck", waitingOn: null }] },
      ctx,
    );
    expect(r.blockers[0].taskId).toBeNull();
    expect(r.blockers[0].taskTitle).toBeNull();
  });
});

describe("defaultSelection", () => {
  it("checks valid medium+ items, skips low/dup/error/unlinked", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          { taskId: T1, status: "in_progress", priority: null, assigneeId: null, reason: "r", confidence: "medium" },
          { taskId: T1, status: "done", priority: null, assigneeId: null, reason: "r", confidence: "low" },
          { taskId: T2, status: "blocked", priority: null, assigneeId: null, reason: "r", confidence: "high" },
        ],
        newTasks: [
          { title: "Print badges", description: null, status: "todo", priority: "low", assigneeId: null, reason: "r", confidence: "high" },
          { title: "Fresh idea", description: null, status: "todo", priority: "low", assigneeId: null, reason: "r", confidence: "medium" },
        ],
        blockers: [
          { taskId: T1, description: "stuck", waitingOn: null },
          { taskId: null, description: "vague", waitingOn: null },
        ],
      },
      ctx,
    );
    const sel = defaultSelection(r);
    expect(sel.taskUpdates).toEqual([0]); // low-confidence and error skipped
    expect(sel.newTasks).toEqual([1]); // duplicate skipped
    expect(sel.blockers).toEqual([0]); // unlinked skipped
  });
});

describe("buildJournalPrompt", () => {
  it("includes ids and delimiters", () => {
    const p = buildJournalPrompt(
      {
        projectName: "P",
        authorName: "A",
        today: "2026-10-24",
        members: [{ id: MEMBER, name: "Asha" }],
        tasks: [{ id: T1, title: "X", status: "todo", priority: "low", assigneeName: null }],
      },
      "body text",
    );
    expect(p).toContain(MEMBER);
    expect(p).toContain(T1);
    expect(p).toContain("<<<JOURNAL");
    expect(p).toContain("body text");
    expect(p).toContain("JOURNAL>>>");
  });

  it("renders the RECENT block only when recent is non-empty", () => {
    const ctx0 = {
      projectName: "P",
      authorName: "A",
      today: "2026-10-24",
      members: [],
      tasks: [],
    };
    expect(buildJournalPrompt(ctx0, "b")).not.toContain("RECENT");
    const withRecent = buildJournalPrompt(
      { ...ctx0, recent: [{ body: "earlier", summary: "s", clarifications: ["q?"] }] },
      "b",
    );
    expect(withRecent).toContain("RECENT CONVERSATION");
    expect(withRecent).toContain("earlier");
  });
});

describe("aiInterpretation", () => {
  it("parses a sample", () => {
    const r = aiInterpretation.safeParse(base);
    expect(r.success).toBe(true);
  });
});
