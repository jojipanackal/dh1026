import { isUuid } from "@/lib/ids";
import {
  canTransition,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";
import { z } from "zod";

import type { AiInterpretation } from "./interpretation-schema";
import type { TaskAnswer } from "./answers";
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
  // The task's own project: where the update is applied and who can be
  // assigned to it.
  projectId: string;
  fromStatus: TaskStatus;
  fromPriority: string | null;
  fromAssigneeId: string | null;
  transitionError: string | null;
};

export type ResolvedNewTask = AiNewTask & {
  // The member project this task will be created in, or null when the model
  // could not tell and there is more than one candidate.
  projectName: string | null;
  needsClarification: boolean;
  possibleDuplicateOf: { id: string; title: string; projectId: string } | null;
};

export type ResolvedBlocker = AiBlocker & {
  taskTitle: string | null;
  // The linked task's project; null when the blocker is not linked.
  projectId: string | null;
};

export type Resolved = {
  summary: string;
  answer?: TaskAnswer | null;
  taskUpdates: ResolvedTaskUpdate[];
  newTasks: ResolvedNewTask[];
  blockers: ResolvedBlocker[];
  decisions: AiDecision[];
  clarifications: string[];
  issues: string[];
};

type Ctx = {
  // Projects the author is a member of; new tasks may target only these.
  projects: { id: string; name: string }[];
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    priority?: string;
    assigneeId?: string | null;
    projectId: string;
  }[];
  // Member user ids, keyed by project id.
  membersByProject: Record<string, string[]>;
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
  answer: TaskAnswer | null = null,
): Resolved {
  const issues: string[] = [];
  const projectById = new Map(ctx.projects.map((p) => [p.id, p]));
  const taskById = new Map(ctx.tasks.map((t) => [t.id, t]));
  const cleanAssignee = (id: string | null, projectId: string) => {
    const members = ctx.membersByProject[projectId] ?? [];
    if (id && members.includes(id)) return id;
    if (id) {
      issues.push("Set an assignee to unassigned because they are not a member of that project");
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
    let assigneeId = cleanAssignee(u.assigneeId, task.projectId);
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
      projectId: task.projectId,
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
    let best: { id: string; title: string; projectId: string; score: number } | null = null;
    for (const t of existingTasks) {
      const tn = normalizeTitle(t.title);
      const score = norm === tn ? 1 : jaccard(norm, tn);
      if (score >= 0.6 && (!best || score > best.score)) {
        best = { id: t.id, title: t.title, projectId: t.projectId, score };
      }
    }

    // Resolve which member project the task belongs to. An id the model
    // invented is dropped; an explicit null auto-assigns only when there is
    // exactly one candidate, otherwise the author must answer a
    // clarification question before the item can be applied.
    let projectId = n.projectId;
    if (projectId && !projectById.has(projectId)) {
      issues.push(`Cleared the project of a new task because it is not one of your projects`);
      projectId = null;
    }
    let needsClarification = false;
    if (!projectId) {
      if (ctx.projects.length === 1) {
        projectId = ctx.projects[0].id;
      } else {
        needsClarification = true;
      }
    }
    let assigneeId: string | null = null;
    if (projectId) {
      assigneeId = cleanAssignee(n.assigneeId, projectId);
    } else if (n.assigneeId) {
      issues.push("Set an assignee to unassigned because the task's project is unclear");
    }

    newTasks.push({
      ...n,
      title,
      projectId,
      projectName: projectId ? (projectById.get(projectId)?.name ?? null) : null,
      assigneeId,
      needsClarification,
      possibleDuplicateOf: best
        ? { id: best.id, title: best.title, projectId: best.projectId }
        : null,
    });
  }

  const blockers: ResolvedBlocker[] = raw.blockers.map((b) => {
    const task = b.taskId ? taskById.get(b.taskId) : undefined;
    return {
      ...b,
      taskId: task?.id ?? null,
      taskTitle: task?.title ?? null,
      projectId: task?.projectId ?? null,
    };
  });

  const decisions: AiDecision[] = raw.decisions.map((d) => ({
    ...d,
    relatedTaskId: d.relatedTaskId && taskById.has(d.relatedTaskId) ? d.relatedTaskId : null,
  }));

  return {
    summary: raw.summary,
    answer,
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
      .filter(
        ({ n }) =>
          n.confidence !== "low" &&
          !n.possibleDuplicateOf &&
          !n.needsClarification,
      )
      .map(({ i }) => i),
    blockers: resolved.blockers
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.taskId !== null)
      .map(({ i }) => i),
  };
}

export { isUuid };
