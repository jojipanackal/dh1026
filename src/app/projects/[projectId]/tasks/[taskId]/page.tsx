import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { ActivityChanges } from "@/components/activity-changes";
import { EmptyState } from "@/components/states/empty-state";
import { EditTaskForm } from "@/app/projects/[projectId]/tasks/[taskId]/edit-task-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { TASK_STATUS_LABELS } from "@/lib/tasks/lifecycle";
import { getCurrentUser } from "@/server/current-user";
import { AppError } from "@/server/errors";
import { getProjectForMember } from "@/server/projects";
import { getTaskForMember, listActivity } from "@/server/tasks";

// This page is fully request-time (membership check + notFound), so it
// produces no static shell; instant=false opts out of the empty-shell
// validation. Note: under cacheComponents the streamed 404 UI still
// carries a 200 status (Next.js streaming semantics).
export const instant = false;

export default async function TaskPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  await connection();
  const { projectId, taskId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        title="No demo user selected"
        message="Pick a demo user in the sidebar to view this task."
      />
    );
  }

  let task, assigneeName, members;
  try {
    const [taskData, projectData] = await Promise.all([
      getTaskForMember(taskId, user.id),
      getProjectForMember(projectId, user.id),
    ]);
    task = taskData.task;
    assigneeName = taskData.assigneeName;
    members = projectData.members;
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  if (task.projectId !== projectId) notFound();

  const activity = await listActivity(projectId, user.id, { taskId });
  const userNames = new Map(members.map((m) => [m.userId, m.name]));

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link
          href={`/projects/${projectId}`}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to project
        </Link>
      </p>
      <PageHeader
        title={task.title}
        description={
          task.description ?? undefined
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{TASK_STATUS_LABELS[task.status]}</Badge>
        <Badge variant="outline">{task.priority}</Badge>
        <span className="text-muted-foreground">
          Assignee: {assigneeName ?? "Unassigned"}
        </span>
        {task.completedAt ? (
          <span className="text-muted-foreground">
            Completed {formatDateTime(task.completedAt)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Edit task</CardTitle>
          </CardHeader>
          <CardContent>
            <EditTaskForm
              projectId={projectId}
              task={{
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigneeId: task.assigneeId,
                dueDate: task.dueDate,
                estimateHours: task.estimateHours,
              }}
              members={members}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task history</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {activity.map((event) => (
                  <li key={event.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        <span className="font-medium">{event.actorName}</span>{" "}
                        <span className="text-muted-foreground">
                          {event.type}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                    <ActivityChanges
                      changes={event.changes}
                      userNames={userNames}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
