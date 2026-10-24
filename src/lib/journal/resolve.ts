import { isUuid } from "@/lib/ids";
import {
  canTransition,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";
import { z } from "zod";

import type { AiInterpretation } from "./interpretation-schema";
import {
  aiBlocker,
  aiDecision,
  aiNewTask,
  aiTaskUpdate,
} from "./interpretation-schema";

type AiBlocker = z.infer<typeof aiBlocker>;
type AiDecision = z.infer<typeof aiDecision>;
type AiNewTask = z.infer<typeof aiNewTask>;
type AiTaskUpdate = z.infer<typeof aiTaskUpdate>;

export type ResolvedTaskUpdate = AiTaskUpdate & {
  taskTitle: string;
  fromStatus: TaskStatus;
  fromPriority: string | null;
  fromAssigneeId: string | null;
  transitionError: string | null;
};

export type ResolvedNewTask = AiNewTask & {
  possibleDuplicateOf: { id: string; title: string } | null;
};

export type ResolvedBlocker = AiBlocker & {
  taskTitle: string | null;
};

export type Resolved = {
  summary: string;
  taskUpdates: ResolvedTaskUpdate[];
  newTasks: ResolvedNewTask[];
  blockers: ResolvedBlocker[];
  decisions: AiDecision[];
  clarifications: string[];
  issues: string[];
};

type Ctx = {
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    priority?: string;
    assigneeId?: string | null;
  }[];
  memberIds: string[];
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function resolveInterpretation(
  raw: AiInterpretation,
  ctx: Ctx,
): Resolved {
  const issues: string[] = [];
  const taskById = new Map(ctx.tasks.map((t) => [t.id, t]));
  const members = new Set(ctx.memberIds);
  const cleanAssignee = (id: string | null) => {
    if (id && members.has(id)) return id;
    if (id) {
      issues.push("Set an assignee to unassigned because they are not a project member");
    }
    return null;
  };

  const taskUpdates: ResolvedTaskUpdate[] = [];
  for (const u of raw.taskUpdates) {
    const task = taskById.get(u.taskId);
    if (!task) {
      issues.push("Dropped an update for an unknown task");
      continue;
    }
    // Normalise values that equal the task's current state to "unchanged".
    const status = u.status === task.status ? null : u.status;
    const priority = u.priority === task.priority ? null : u.priority;
    let assigneeId = cleanAssignee(u.assigneeId);
    if (assigneeId === task.assigneeId) assigneeId = null;
    if (status === null && priority === null && assigneeId === null) {
      issues.push(`Dropped a no-op update for "${task.title}"`);
      continue;
    }
    let transitionError: string | null = null;
    if (status !== null && !canTransition(task.status, status)) {
      transitionError = `Cannot move a task from ${TASK_STATUS_LABELS[task.status].toLowerCase()} to ${TASK_STATUS_LABELS[status].toLowerCase()}; reopen it to To do first`;
    }
    taskUpdates.push({
      ...u,
      status,
      priority,
      assigneeId,
      taskTitle: task.title,
      fromStatus: task.status,
      fromPriority: task.priority ?? null,
      fromAssigneeId: task.assigneeId ?? null,
      transitionError,
    });
  }

  const existingTasks = ctx.tasks.filter((t) => t.status !== "cancelled");
  const newTasks: ResolvedNewTask[] = [];
  for (const n of raw.newTasks) {
    const title = n.title.trim().slice(0, 200);
    if (!title) {
      issues.push("Dropped a new task with an empty title");
      continue;
    }
    const norm = normalizeTitle(title);
    let best: { id: string; title: string; score: number } | null = null;
    for (const t of existingTasks) {
      const tn = normalizeTitle(t.title);
      const score = norm === tn ? 1 : jaccard(norm, tn);
      if (score >= 0.6 && (!best || score > best.score)) {
        best = { id: t.id, title: t.title, score };
      }
    }
    newTasks.push({
      ...n,
      title,
      assigneeId: cleanAssignee(n.assigneeId),
      possibleDuplicateOf: best ? { id: best.id, title: best.title } : null,
    });
  }

  const blockers: ResolvedBlocker[] = raw.blockers.map((b) => {
    const task = b.taskId ? taskById.get(b.taskId) : undefined;
    return { ...b, taskId: task?.id ?? null, taskTitle: task?.title ?? null };
  });

  const decisions: AiDecision[] = raw.decisions.map((d) => ({
    ...d,
    relatedTaskId: d.relatedTaskId && taskById.has(d.relatedTaskId) ? d.relatedTaskId : null,
  }));

  return {
    summary: raw.summary,
    taskUpdates,
    newTasks,
    blockers,
    decisions,
    clarifications: raw.clarifications,
    issues,
  };
}

export type Selection = {
  taskUpdates: number[];
  newTasks: number[];
  blockers: number[];
};

export function defaultSelection(resolved: Resolved): Selection {
  return {
    taskUpdates: resolved.taskUpdates
      .map((u, i) => ({ u, i }))
      .filter(({ u }) => u.confidence !== "low" && !u.transitionError)
      .map(({ i }) => i),
    newTasks: resolved.newTasks
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.confidence !== "low" && !n.possibleDuplicateOf)
      .map(({ i }) => i),
    blockers: resolved.blockers
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.taskId !== null)
      .map(({ i }) => i),
  };
}

export { isUuid };
