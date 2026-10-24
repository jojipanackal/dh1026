import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { ActivityChanges } from "@/components/activity-changes";
import { EmptyState } from "@/components/states/empty-state";
import { KeyValueList } from "@/components/key-value-list";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { AddMemberForm } from "@/app/projects/[projectId]/add-member-form";
import { FilterBar } from "@/app/projects/[projectId]/filter-bar";
import { NewTaskDialog } from "@/app/projects/[projectId]/new-task-dialog";
import { OverviewView } from "@/app/projects/[projectId]/overview-view";
import { TaskBoard } from "@/app/projects/[projectId]/task-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { parseTaskFilters } from "@/lib/tasks/filters";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/lifecycle";
import { getCurrentUser } from "@/server/current-user";
import { AppError } from "@/server/errors";
import { getProjectOverview } from "@/server/overview";
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

const VIEWS = ["overview", "board", "list", "activity", "members"] as const;
type View = (typeof VIEWS)[number];

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        title="No demo user selected"
        message="Pick a demo user in the top bar to view this project."
      />
    );
  }

  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const viewParam = str(query.view);
  const view: View = (VIEWS as readonly string[]).includes(viewParam ?? "")
    ? (viewParam as View)
    : "overview";

  let data;
  try {
    data = await getProjectForMember(projectId, user.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { project, members, role } = data;

  const memberIds = new Set(members.map((m) => m.userId));
  const filters = parseTaskFilters(
    {
      status: str(query.status),
      assignee: str(query.assignee),
      priority: str(query.priority),
    },
    memberIds,
  );

  const [taskList, activity, candidates, overview] = await Promise.all([
    view === "overview"
      ? Promise.resolve([])
      : listTasks(projectId, user.id, {
          status: view === "list" ? filters.status : undefined,
          assigneeId: filters.assignee,
          priority: filters.priority,
        }),
    listActivity(projectId, user.id, { limit: 20 }),
    role === "owner" ? listUsersNotInProject(projectId) : Promise.resolve([]),
    view === "overview"
      ? getProjectOverview(projectId, user.id)
      : Promise.resolve(null),
  ]);

  const userNames = new Map(members.map((m) => [m.userId, m.name]));
  const statusFilter = filters.status;

  const viewHref = (v: View) => {
    const p = new URLSearchParams();
    if (v !== "overview") p.set("view", v);
    for (const [k, val] of [
      ["assignee", str(query.assignee)],
      ["priority", str(query.priority)],
      ["status", str(query.status)],
    ] as const) {
      if (val) p.set(k, val);
    }
    const qs = p.toString();
    return `/projects/${projectId}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <>
            <MemberStack members={members} />
            <Button variant="outline" asChild>
              <Link href={`/journal?projectId=${projectId}`}>Journal</Link>
            </Button>
            <NewTaskDialog projectId={projectId} members={members} />
          </>
        }
      />

      <nav className="mb-6 flex gap-4 overflow-x-auto border-b">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={viewHref(v)}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2 text-sm whitespace-nowrap capitalize text-muted-foreground transition-colors hover:text-foreground",
              view === v && "border-foreground text-foreground",
            )}
          >
            {v}
          </Link>
        ))}
      </nav>

      {view === "board" || view === "list" ? (
        <div className="mb-5">
          <Suspense>
            <FilterBar members={members} />
          </Suspense>
        </div>
      ) : null}

      {view === "overview" && overview ? (
        <OverviewView
          projectId={projectId}
          overview={overview}
          activity={activity}
          userNames={userNames}
        />
      ) : null}

      {view === "board" ? (
        <div className="md:mr-[calc(-1*max(2.5rem,(100vw-1088px)/2))]">
          <TaskBoard
          projectId={projectId}
          tasks={taskList.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            assigneeId: t.assigneeId,
            assigneeName: t.assigneeName,
            dueDate: t.dueDate,
            estimateHours: t.estimateHours,
          }))}
          />
        </div>
      ) : null}

      {view === "list" ? <ListView projectId={projectId} taskList={taskList} statusFilter={statusFilter} /> : null}

      {view === "activity" ? (
        <section className="max-w-2xl rounded-lg border bg-card">
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
      ) : null}

      {view === "members" ? (
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <section className="rounded-lg border bg-card px-5 py-4">
            <KeyValueList
              items={[
                { label: "Your role", value: role },
                { label: "Members", value: members.length },
                { label: "Tasks", value: taskList.length },
                { label: "Created", value: formatDateTime(project.createdAt) },
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
        </div>
      ) : null}
    </div>
  );
}

function MemberStack({
  members,
}: {
  members: { userId: string; name: string }[];
}) {
  const shown = members.slice(0, 4);
  const rest = members.length - shown.length;
  return (
    <div
      className="flex -space-x-1.5"
      title={members.map((m) => m.name).join(", ")}
    >
      {shown.map((m) => (
        <span
          key={m.userId}
          className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium"
        >
          {m.name.charAt(0).toUpperCase()}
        </span>
      ))}
      {rest > 0 ? (
        <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

function ListView({
  projectId,
  taskList,
  statusFilter,
}: {
  projectId: string;
  taskList: Awaited<ReturnType<typeof listTasks>>;
  statusFilter?: TaskStatus;
}) {
  const filters: { label: string; value?: TaskStatus }[] = [
    { label: "All" },
    { label: "To do", value: "todo" },
    { label: "In progress", value: "in_progress" },
    { label: "Blocked", value: "blocked" },
    { label: "Done", value: "done" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
        {filters.map((f) => {
          const active = statusFilter === f.value;
          return (
            <Link
              key={f.label}
              href={
                f.value
                  ? `/projects/${projectId}?view=list&status=${f.value}`
                  : `/projects/${projectId}?view=list`
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
              ? `No tasks with status "${TASK_STATUS_LABELS[statusFilter]}".`
              : "No tasks yet — use New task to create one."
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
                    {task.estimateHours != null ? `${task.estimateHours} h` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
