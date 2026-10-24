import { describe, expect, it } from "vitest";

import { aiInterpretation } from "@/lib/journal/interpretation-schema";
import { buildJournalPrompt } from "@/lib/journal/prompt";
import { defaultSelection, resolveInterpretation } from "@/lib/journal/resolve";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";
const MEMBER = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const P1 = "55555555-5555-4555-8555-555555555555";
const P2 = "66666666-6666-4666-8666-666666666666";

const ctx = {
  projects: [{ id: P1, name: "Alpha" }],
  tasks: [
    { id: T1, title: "Print badges", status: "todo" as const, priority: "medium", assigneeId: null, projectId: P1 },
    { id: T2, title: "Order lanyards", status: "done" as const, priority: "low", assigneeId: MEMBER, projectId: P1 },
  ],
  membersByProject: { [P1]: [MEMBER] },
};

const ctxTwoProjects = {
  projects: [
    { id: P1, name: "Alpha" },
    { id: P2, name: "Beta" },
  ],
  tasks: [
    { id: T1, title: "Print badges", status: "todo" as const, priority: "medium", assigneeId: null, projectId: P1 },
    { id: T2, title: "Order lanyards", status: "done" as const, priority: "low", assigneeId: MEMBER, projectId: P1 },
  ],
  membersByProject: { [P1]: [MEMBER], [P2]: [OTHER] },
};

const newTask = {
  projectId: P1,
  description: null,
  status: "todo" as const,
  priority: "low" as const,
  assigneeId: MEMBER,
  dueDate: "2026-11-05",
  estimateHours: 4,
  reason: "r",
  confidence: "high" as const,
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
        newTasks: [{ ...newTask, title: "t", assigneeId: OTHER }],
      },
      ctx,
    );
    // OTHER is not a member of P1 in either case
    expect(r.taskUpdates).toHaveLength(0); // assignee nulled => no-op => dropped
    expect(r.newTasks[0].assigneeId).toBeNull();
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("keeps an assignee who belongs to the task's project", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          {
            taskId: T1,
            status: null,
            priority: null,
            assigneeId: MEMBER,
            reason: "r",
            confidence: "high",
          },
        ],
      },
      ctx,
    );
    expect(r.taskUpdates[0].assigneeId).toBe(MEMBER);
    expect(r.taskUpdates[0].projectId).toBe(P1);
  });

  it("validates assignees against the item's own project, not the author's", () => {
    // OTHER is a member of P2 only; assigning them to a P1 task is dropped.
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
          { ...newTask, projectId: P2, title: "Beta work", assigneeId: OTHER },
        ],
      },
      ctxTwoProjects,
    );
    expect(r.taskUpdates).toHaveLength(0);
    expect(r.newTasks[0].assigneeId).toBe(OTHER); // valid: OTHER is in P2
    expect(r.issues).toContain(
      "Set an assignee to unassigned because they are not a member of that project",
    );
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
          { ...newTask, title: "print  badges!" },
          { ...newTask, title: "Print all badges" },
          { ...newTask, title: "Buy projector bulbs" },
        ],
      },
      ctx,
    );
    expect(r.newTasks[0].possibleDuplicateOf?.id).toBe(T1); // exact normalised
    expect(r.newTasks[0].possibleDuplicateOf?.projectId).toBe(P1);
    expect(r.newTasks[1].possibleDuplicateOf?.id).toBe(T1); // jaccard >= 0.6
    expect(r.newTasks[2].possibleDuplicateOf).toBeNull();
  });

  it("auto-assigns the single member project when projectId is null", () => {
    const r = resolveInterpretation(
      { ...base, newTasks: [{ ...newTask, projectId: null, title: "Fresh" }] },
      ctx,
    );
    expect(r.newTasks[0].projectId).toBe(P1);
    expect(r.newTasks[0].projectName).toBe("Alpha");
    expect(r.newTasks[0].needsClarification).toBe(false);
  });

  it("marks a new task as needing clarification with several projects and no projectId", () => {
    const r = resolveInterpretation(
      { ...base, newTasks: [{ ...newTask, projectId: null, title: "Fresh" }] },
      ctxTwoProjects,
    );
    expect(r.newTasks[0].projectId).toBeNull();
    expect(r.newTasks[0].projectName).toBeNull();
    expect(r.newTasks[0].needsClarification).toBe(true);
  });

  it("clears an invalid projectId, then applies the same resolution rules", () => {
    const bogus = "99999999-9999-4999-8999-999999999999";
    const one = resolveInterpretation(
      { ...base, newTasks: [{ ...newTask, projectId: bogus, title: "Fresh" }] },
      ctx,
    );
    // invalid -> null -> single project auto-assign
    expect(one.newTasks[0].projectId).toBe(P1);
    expect(one.issues).toContain(
      "Cleared the project of a new task because it is not one of your projects",
    );
    const two = resolveInterpretation(
      { ...base, newTasks: [{ ...newTask, projectId: bogus, title: "Fresh" }] },
      ctxTwoProjects,
    );
    // invalid -> null -> ambiguous
    expect(two.newTasks[0].projectId).toBeNull();
    expect(two.newTasks[0].needsClarification).toBe(true);
  });

  it("drops the assignee when the new task's project is unresolved", () => {
    const r = resolveInterpretation(
      {
        ...base,
        newTasks: [
          { ...newTask, projectId: null, title: "Fresh", assigneeId: MEMBER },
        ],
      },
      ctxTwoProjects,
    );
    expect(r.newTasks[0].assigneeId).toBeNull();
    expect(r.issues).toContain(
      "Set an assignee to unassigned because the task's project is unclear",
    );
  });

  it("asks for owner, estimate, and target date before new work is ready", () => {
    const r = resolveInterpretation(
      {
        ...base,
        newTasks: [
          {
            ...newTask,
            title: "Unplanned work",
            assigneeId: null,
            dueDate: null,
            estimateHours: null,
          },
        ],
      },
      ctx,
    );
    expect(r.newTasks[0].needsClarification).toBe(true);
    expect(r.newTasks[0].clarificationQuestions).toEqual([
      'How many hours should I plan for "Unplanned work"?',
      'What target date should I use for "Unplanned work"?',
      'Who owns "Unplanned work"?',
    ]);
    expect(defaultSelection(r).newTasks).toEqual([]);
  });

  it("nulls unknown blocker taskIds", () => {
    const r = resolveInterpretation(
      { ...base, blockers: [{ taskId: OTHER, description: "stuck", waitingOn: null }] },
      ctx,
    );
    expect(r.blockers[0].taskId).toBeNull();
    expect(r.blockers[0].taskTitle).toBeNull();
    expect(r.blockers[0].projectId).toBeNull();
  });

  it("carries the linked task's project on blockers", () => {
    const r = resolveInterpretation(
      { ...base, blockers: [{ taskId: T1, description: "stuck", waitingOn: null }] },
      ctx,
    );
    expect(r.blockers[0].projectId).toBe(P1);
  });
});

describe("defaultSelection", () => {
  it("checks valid medium+ items, skips low/dup/error/unlinked/unclear", () => {
    const r = resolveInterpretation(
      {
        ...base,
        taskUpdates: [
          { taskId: T1, status: "in_progress", priority: null, assigneeId: null, reason: "r", confidence: "medium" },
          { taskId: T1, status: "done", priority: null, assigneeId: null, reason: "r", confidence: "low" },
          { taskId: T2, status: "blocked", priority: null, assigneeId: null, reason: "r", confidence: "high" },
        ],
        newTasks: [
          { ...newTask, title: "Print badges" },
          { ...newTask, title: "Fresh idea", confidence: "medium" },
          { ...newTask, projectId: null, title: "Unclear project" },
        ],
        blockers: [
          { taskId: T1, description: "stuck", waitingOn: null },
          { taskId: null, description: "vague", waitingOn: null },
        ],
      },
      ctxTwoProjects,
    );
    const sel = defaultSelection(r);
    expect(sel.taskUpdates).toEqual([0]); // low-confidence and error skipped
    expect(sel.newTasks).toEqual([1]); // duplicate and unclear skipped
    expect(sel.blockers).toEqual([0]); // unlinked skipped
  });
});

describe("buildJournalPrompt", () => {
  const promptCtx = {
    projects: [{ id: P1, name: "Alpha" }],
    authorName: "A",
    today: "2026-10-24",
    membersByProject: { [P1]: [{ id: MEMBER, name: "Asha" }] },
    tasks: [
      {
        id: T1,
        title: "X",
        status: "todo",
        priority: "low",
        assigneeName: null,
        projectName: "Alpha",
      },
    ],
  };

  it("includes ids and delimiters", () => {
    const p = buildJournalPrompt(promptCtx, "body text");
    expect(p).toContain(MEMBER);
    expect(p).toContain(T1);
    expect(p).toContain("<<<JOURNAL");
    expect(p).toContain("body text");
    expect(p).toContain("JOURNAL>>>");
  });

  it("renders projects and per-project members", () => {
    const p = buildJournalPrompt(promptCtx, "b");
    expect(p).toContain(`${P1} | Alpha`);
    expect(p).toContain("Alpha:");
    expect(p).toContain(`${MEMBER} | Asha`);
    expect(p).toContain(`project=Alpha`);
  });

  it("renders the RECENT block only when recent is non-empty", () => {
    const ctx0 = { ...promptCtx, tasks: [], membersByProject: {} };
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

  it("allows null projectId on new tasks", () => {
    const r = aiInterpretation.safeParse({
      ...base,
      newTasks: [{ ...newTask, projectId: null, title: "t" }],
    });
    expect(r.success).toBe(true);
  });
});
