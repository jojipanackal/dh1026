import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityEvents,
  projectMemberships,
  tasks,
  users,
  type ActivityChanges,
} from "@/db/schema";
import { diffTask } from "@/lib/tasks/diff";
import {
  canTransition,
  completedAtFor,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/tasks/validation";
import { isUuid } from "@/lib/ids";
import { AppError } from "@/server/errors";
import { getMembership } from "@/server/projects";

const TASK_SORT_ORDER = sql`case ${tasks.status}
  when 'in_progress' then 0 when 'blocked' then 1 when 'todo' then 2
  when 'done' then 3 else 4 end`;

const PRIORITY_ORDER = sql`case ${tasks.priority}
  when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;

export type TaskListFilter = { status?: TaskStatus };

export async function listTasks(
  projectId: string,
  userId: string,
  filter: TaskListFilter = {},
) {
  if (!isUuid(projectId)) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const membership = await getMembership(projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const conditions = [eq(tasks.projectId, projectId)];
  if (filter.status) conditions.push(eq(tasks.status, filter.status));
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      dueDate: tasks.dueDate,
      estimateHours: tasks.estimateHours,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(...conditions))
    .orderBy(asc(TASK_SORT_ORDER), asc(PRIORITY_ORDER), asc(tasks.createdAt));
}

export async function getTaskForMember(taskId: string, userId: string) {
  if (!isUuid(taskId)) {
    throw new AppError("NOT_FOUND", "Task not found");
  }
  const [row] = await db
    .select({ task: tasks, assigneeName: users.name })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!row) {
    throw new AppError("NOT_FOUND", "Task not found");
  }
  const membership = await getMembership(row.task.projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Task not found");
  }
  return { task: row.task, assigneeName: row.assigneeName };
}

async function assertAssigneeIsMember(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  assigneeId: string | null | undefined,
) {
  if (!assigneeId) return;
  const [membership] = await tx
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, assigneeId),
      ),
    )
    .limit(1);
  if (!membership) {
    throw new AppError(
      "VALIDATION",
      "The assignee must be a member of this project",
    );
  }
}

export async function createTask(
  userId: string,
  projectId: string,
  input: CreateTaskInput,
) {
  if (!isUuid(projectId)) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  return db.transaction(async (tx) => {
    const [membership] = await tx
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new AppError("NOT_FOUND", "Project not found");
    }
    await assertAssigneeIsMember(tx, projectId, input.assigneeId);
    const [task] = await tx
      .insert(tasks)
      .values({
        projectId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ?? null,
        estimateHours: input.estimateHours ?? null,
        createdBy: userId,
      })
      .returning();
    await tx.insert(activityEvents).values({
      projectId,
      taskId: task.id,
      actorId: userId,
      type: "task.created",
      changes: {
        title: { from: null, to: task.title },
        status: { from: null, to: task.status },
        priority: { from: null, to: task.priority },
        assigneeId: { from: null, to: task.assigneeId },
        dueDate: { from: null, to: task.dueDate },
        estimateHours: { from: null, to: task.estimateHours },
      },
      source: "manual",
    });
    return task;
  });
}

const EDITABLE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "assigneeId",
  "dueDate",
  "estimateHours",
] as const;

export async function updateTask(userId: string, input: UpdateTaskInput) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .limit(1)
      .for("update");
    if (!before) {
      throw new AppError("NOT_FOUND", "Task not found");
    }
    const [membership] = await tx
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, before.projectId),
          eq(projectMemberships.userId, userId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new AppError("NOT_FOUND", "Task not found");
    }
    if (!canTransition(before.status, input.status)) {
      throw new AppError(
        "VALIDATION",
        `Cannot move a task from ${TASK_STATUS_LABELS[before.status].toLowerCase()} to ${TASK_STATUS_LABELS[input.status].toLowerCase()}; reopen it to To do first`,
      );
    }
    await assertAssigneeIsMember(tx, before.projectId, input.assigneeId);

    const now = new Date();
    const after = {
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      estimateHours: input.estimateHours ?? null,
    };
    const changes = diffTask(before, after, EDITABLE_FIELDS) as ActivityChanges;
    if (Object.keys(changes).length === 0) {
      return before;
    }
    const completedAt = completedAtFor(
      before.status,
      after.status,
      before.completedAt,
      now,
    );
    const [updated] = await tx
      .update(tasks)
      .set({ ...after, completedAt, updatedAt: now })
      .where(eq(tasks.id, input.taskId))
      .returning();
    await tx.insert(activityEvents).values({
      projectId: before.projectId,
      taskId: before.id,
      actorId: userId,
      type: "task.updated",
      changes,
      source: "manual",
    });
    return updated;
  });
}

export async function listActivity(
  projectId: string,
  userId: string,
  options: { taskId?: string; limit?: number } = {},
) {
  if (!isUuid(projectId)) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const membership = await getMembership(projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const conditions = [eq(activityEvents.projectId, projectId)];
  if (options.taskId) {
    conditions.push(eq(activityEvents.taskId, options.taskId));
  }
  return db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      changes: activityEvents.changes,
      source: activityEvents.source,
      taskId: activityEvents.taskId,
      createdAt: activityEvents.createdAt,
      actorName: users.name,
    })
    .from(activityEvents)
    .innerJoin(users, eq(users.id, activityEvents.actorId))
    .where(and(...conditions))
    .orderBy(desc(activityEvents.createdAt))
    .limit(options.limit ?? 20);
}
