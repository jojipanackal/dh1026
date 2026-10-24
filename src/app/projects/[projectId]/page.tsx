import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { ActivityChanges } from "@/components/activity-changes";
import { EmptyState } from "@/components/states/empty-state";
import { AddMemberForm } from "@/app/projects/[projectId]/add-member-form";
import { NewTaskForm } from "@/app/projects/[projectId]/new-task-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";
import { getCurrentUser } from "@/server/current-user";
import { AppError } from "@/server/errors";
import {
  getProjectForMember,
  listUsersNotInProject,
} from "@/server/projects";
import { listActivity, listTasks } from "@/server/tasks";

// This page is fully request-time (membership check + notFound), so it
// produces no static shell; instant=false opts out of the empty-shell
// validation. Note: under cacheComponents the streamed 404 UI still
// carries a 200 status (Next.js streaming semantics).
export const instant = false;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await connection();
  const [{ projectId }, { status: statusParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        title="No demo user selected"
        message="Pick a demo user in the sidebar to view this project."
      />
    );
  }

  const statusFilter: TaskStatus | undefined = TASK_STATUSES.includes(
    statusParam as TaskStatus,
  )
    ? (statusParam as TaskStatus)
    : undefined;

  let data;
  try {
    data = await getProjectForMember(projectId, user.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { project, members, role } = data;

  const [taskList, activity, candidates] = await Promise.all([
    listTasks(projectId, user.id, { status: statusFilter }),
    listActivity(projectId, user.id, { limit: 20 }),
    role === "owner" ? listUsersNotInProject(projectId) : Promise.resolve([]),
  ]);

  const userNames = new Map(members.map((m) => [m.userId, m.name]));

  return (
    <div>
      <PageHeader title={project.name} description={project.description ?? undefined} />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={statusFilter === undefined ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href={`/projects/${projectId}`}>All</Link>
        </Button>
        {TASK_STATUSES.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/projects/${projectId}?status=${status}`}>
              {TASK_STATUS_LABELS[status]}
            </Link>
          </Button>
        ))}
      </div>

      {taskList.length === 0 ? (
        <EmptyState
          title="No tasks"
          message={
            statusFilter
              ? `No tasks with status "${TASK_STATUS_LABELS[statusFilter]}".`
              : "No tasks yet — create the first one below."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Estimate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskList.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </TableCell>
                <TableCell>{task.priority}</TableCell>
                <TableCell>{task.assigneeName ?? "Unassigned"}</TableCell>
                <TableCell>
                  {task.dueDate ? formatDate(task.dueDate) : "—"}
                </TableCell>
                <TableCell>
                  {task.estimateHours != null ? `${task.estimateHours} h` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New task</CardTitle>
          </CardHeader>
          <CardContent>
            <NewTaskForm projectId={projectId} members={members} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-1 text-sm">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between">
                    <span>{m.name}</span>
                    <Badge variant="outline">{m.role}</Badge>
                  </li>
                ))}
              </ul>
              {role === "owner" ? (
                <>
                  <Separator />
                  <AddMemberForm projectId={projectId} candidates={candidates} />
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
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
    </div>
  );
}
