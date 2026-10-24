import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { activityEvents, taskDependencies, tasks } from "@/db/schema";
import { isUuid } from "@/lib/ids";
import { AppError } from "@/server/errors";
import { getMembership } from "@/server/projects";
import { applyTaskUpdate } from "@/server/tasks";

export async function resolveTaskDependency(
  userId: string,
  projectId: string,
  dependencyId: string,
) {
  if (!isUuid(projectId) || !isUuid(dependencyId)) {
    throw new AppError("NOT_FOUND", "Dependency not found");
  }
  if (!(await getMembership(projectId, userId))) {
    throw new AppError("NOT_FOUND", "Dependency not found");
  }

  return db.transaction(async (tx) => {
    const [dependency] = await tx
      .select({
        id: taskDependencies.id,
        blockedTaskId: taskDependencies.blockedTaskId,
        status: taskDependencies.status,
        projectId: tasks.projectId,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.blockedTaskId))
      .where(
        and(
          eq(taskDependencies.id, dependencyId),
          eq(tasks.projectId, projectId),
        ),
      )
      .limit(1)
      .for("update");
    if (!dependency) {
      throw new AppError("NOT_FOUND", "Dependency not found");
    }
    if (dependency.status === "resolved") return dependency;

    const [resolved] = await tx
      .update(taskDependencies)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(taskDependencies.id, dependency.id))
      .returning();

    await applyTaskUpdate(
      tx,
      userId,
      dependency.blockedTaskId,
      (before) => ({
        title: before.title,
        description: before.description,
        status: before.status === "blocked" ? "in_progress" : before.status,
        priority: before.priority,
        assigneeId: before.assigneeId,
        dueDate: before.dueDate,
        estimateHours: before.estimateHours,
      }),
    );
    await tx.insert(activityEvents).values({
      projectId: dependency.projectId,
      taskId: dependency.blockedTaskId,
      actorId: userId,
      type: "task.updated",
      changes: {
        dependencyStatus: { from: "open", to: "resolved" },
      },
      source: "manual",
      journalEntryId: null,
    });
    return resolved;
  });
}
