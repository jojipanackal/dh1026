import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { ActivityChanges } from "@/components/activity-changes";
import { EmptyState } from "@/components/states/empty-state";
import { KeyValueList } from "@/components/key-value-list";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { AddMemberForm } from "@/app/projects/[projectId]/add-member-form";
import { NewTaskForm } from "@/app/projects/[projectId]/new-task-form";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  TASK_STATUSES,
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
        message="Pick a demo user in the top bar to view this project."
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

  const filters: { label: string; value?: TaskStatus }[] = [
    { label: "All" },
    { label: "To do", value: "todo" },
    { label: "In progress", value: "in_progress" },
    { label: "Blocked", value: "blocked" },
    { label: "Done", value: "done" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
      />

      <div className="grid min-w-0 gap-10 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
            {filters.map((f) => {
              const active = statusFilter === f.value;
              return (
                <Link
                  key={f.label}
                  href={
                    f.value
                      ? `/projects/${projectId}?status=${f.value}`
                      : `/projects/${projectId}`
                  }
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-brand text-brand-foreground",
                  )}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {taskList.length === 0 ? (
            <EmptyState
              title="No tasks"
              message={
                statusFilter
                  ? "No tasks match this filter."
                  : "No tasks yet — create the first one below."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskList.map((task) => (
                    <TableRow key={task.id} className="h-13">
                      <TableCell>
                        <Link
                          href={`/projects/${projectId}/tasks/${task.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {task.assigneeName ?? "unassigned"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {task.dueDate ? formatDate(task.dueDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {task.estimateHours != null
                          ? `${task.estimateHours} h`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">New task</CardTitle>
            </CardHeader>
            <CardContent>
              <NewTaskForm projectId={projectId} members={members} />
            </CardContent>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border bg-card px-5 py-4">
            <KeyValueList
              items={[
                { label: "Your role", value: role },
                { label: "Members", value: members.length },
                { label: "Tasks", value: taskList.length },
                {
                  label: "Created",
                  value: formatDateTime(project.createdAt),
                },
              ]}
            />
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-5 py-3 text-sm font-medium">Members</h2>
            <ul className="flex flex-col px-5 py-3">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-3 border-b py-2.5 last:border-0"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.name}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {m.email}
                    </span>
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {m.role}
                  </Badge>
                </li>
              ))}
            </ul>
            {role === "owner" ? (
              <>
                <Separator />
                <div className="px-5 py-4">
                  <AddMemberForm
                    projectId={projectId}
                    candidates={candidates}
                  />
                </div>
              </>
            ) : null}
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-5 py-3 text-sm font-medium">
              Recent activity
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
