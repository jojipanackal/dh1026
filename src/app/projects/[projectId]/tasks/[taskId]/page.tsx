import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { ActivityChanges } from "@/components/activity-changes";
import { EmptyState } from "@/components/states/empty-state";
import { KeyValueList } from "@/components/key-value-list";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { EditTaskForm } from "@/app/projects/[projectId]/tasks/[taskId]/edit-task-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
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
        message="Pick a demo user in the top bar to view this task."
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
      <p className="mb-4 text-sm">
        <Link
          href={`/projects/${projectId}`}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to project
        </Link>
      </p>
      <PageHeader
        title={task.title}
        description={task.description ?? undefined}
        actions={
          <>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </>
        }
      />

      <div className="grid min-w-0 gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Edit task</CardTitle>
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
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border bg-card px-5 py-4">
            <KeyValueList
              items={[
                {
                  label: "Status",
                  value: TASK_STATUS_LABELS[task.status],
                },
                { label: "Priority", value: task.priority },
                {
                  label: "Assignee",
                  value: assigneeName ?? "Unassigned",
                },
                {
                  label: "Due",
                  value: task.dueDate ? formatDate(task.dueDate) : "—",
                },
                {
                  label: "Estimate",
                  value:
                    task.estimateHours != null
                      ? `${task.estimateHours} h`
                      : "—",
                },
                {
                  label: "Completed",
                  value: task.completedAt
                    ? formatDateTime(task.completedAt)
                    : "—",
                },
                {
                  label: "Created",
                  value: formatDateTime(task.createdAt),
                },
                {
                  label: "Updated",
                  value: formatDateTime(task.updatedAt),
                },
              ]}
            />
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-5 py-3 text-sm font-medium">
              Task history
            </h2>
            <div className="px-5 py-3">
              {activity.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3 text-sm">
                  {activity.map((event) => (
                    <li key={event.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{event.actorName}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {event.type}
                      </p>
                      <ActivityChanges
                        changes={event.changes}
                        userNames={userNames}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
