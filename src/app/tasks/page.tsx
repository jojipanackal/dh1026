import Link from "next/link";
import { connection } from "next/server";

import { GlobalNewTaskDialog } from "@/app/tasks/new-task-dialog";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { isOverdue, todayIst } from "@/lib/dates";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/lifecycle";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/validation";
import { getCurrentUser } from "@/server/current-user";
import { listMemberProjects } from "@/server/journal";
import { listTasksForUser } from "@/server/tasks";

export const instant = false;

const STATUS_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value: value as TaskStatus,
    label,
  })),
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validStatus(value: string | undefined): TaskStatus | undefined {
  return value && value !== "all" && value in TASK_STATUS_LABELS
    ? (value as TaskStatus)
    : undefined;
}

function validPriority(value: string | undefined): TaskPriority | undefined {
  return value && value !== "all" && (TASK_PRIORITIES as readonly string[]).includes(value)
    ? (value as TaskPriority)
    : undefined;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-end justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</span>
      </CardContent>
    </Card>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <PageHeader title="Tasks" description="The shared execution queue across your projects." />
        <EmptyState
          title="No demo user selected"
          message="Pick a demo user in the sidebar to see the team task queue."
        />
      </>
    );
  }

  const query = await searchParams;
  const { projectRows, membersByProject } = await listMemberProjects(user.id);
  if (projectRows.length === 0) {
    return (
      <>
        <PageHeader title="Tasks" description="The shared execution queue across your projects." />
        <EmptyState
          title="No projects yet"
          message="Create a project or open Agent to capture the work you were asked to do."
        />
      </>
    );
  }

  const memberIds = new Set(
    Object.values(membersByProject)
      .flat()
      .map((member) => member.id),
  );
  const requestedAssignee = first(query.assignee);
  const assigneeId =
    requestedAssignee === "unassigned"
      ? null
      : requestedAssignee && memberIds.has(requestedAssignee)
        ? requestedAssignee
        : undefined;
  const requestedProject = first(query.project);
  const projectId = projectRows.some((project) => project.id === requestedProject)
    ? requestedProject
    : undefined;
  const scope = first(query.scope) === "mine" ? "mine" : "all";
  const status = validStatus(first(query.status));
  const priority = validPriority(first(query.priority));
  const search = first(query.q)?.trim() || undefined;

  const tasks = await listTasksForUser(user.id, {
    scope,
    status,
    priority,
    assigneeId,
    projectId,
    search,
  });
  const today = todayIst();
  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const dueTasks = tasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate <= today &&
      task.status !== "done" &&
      task.status !== "cancelled",
  );

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="One execution queue for what is moving, blocked, due, or waiting on someone."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/journal">Ask Agent</Link>
            </Button>
            <GlobalNewTaskDialog
              projects={projectRows}
              membersByProject={membersByProject}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open" value={openTasks.length} />
        <StatCard label="In progress" value={inProgressTasks.length} tone="text-brand" />
        <StatCard label="Blocked" value={blockedTasks.length} tone="text-amber-500" />
        <StatCard label="Due / overdue" value={dueTasks.length} tone="text-red-500" />
      </div>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Execution queue</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} · sorted by movement, priority, and due date
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1 text-xs">
            <ScopeLink active={scope === "all"} label="All work" query={query} scope="all" />
            <ScopeLink active={scope === "mine"} label="My work" query={query} scope="mine" />
          </div>
        </div>

        <form method="get" className="grid gap-2 border-b bg-muted/20 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.5fr)_repeat(4,minmax(8rem,1fr))_auto]">
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search tasks…"
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
          <FilterSelect name="project" defaultValue={projectId ?? ""} label="Project">
            <option value="">All projects</option>
            {projectRows.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="status" defaultValue={status ?? "all"} label="Status">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="priority" defaultValue={priority ?? "all"} label="Priority">
            <option value="all">All priorities</option>
            {TASK_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </FilterSelect>
          <FilterSelect name="assignee" defaultValue={requestedAssignee ?? ""} label="Assignee">
            <option value="">Everyone</option>
            <option value="unassigned">Unassigned</option>
            {[...memberIds].map((id) => {
              const member = Object.values(membersByProject).flat().find((item) => item.id === id);
              return member ? <option key={id} value={id}>{member.name}</option> : null;
            })}
          </FilterSelect>
          <input type="hidden" name="scope" value={scope} />
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit" size="sm">Filter</Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/tasks">Reset</Link>
            </Button>
          </div>
        </form>

        {tasks.length === 0 ? (
          <div className="px-5 py-14">
            <EmptyState
              title="No tasks match"
              message="Clear a filter or ask Agent to capture the next piece of work."
            />
          </div>
        ) : (
          <TaskTable tasks={tasks} />
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  name,
  defaultValue,
  label,
  children,
}: {
  name: string;
  defaultValue: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        aria-label={label}
        className="h-9 min-w-0 rounded-lg border bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
      >
        {children}
      </select>
    </label>
  );
}

function ScopeLink({
  active,
  label,
  query,
  scope,
}: {
  active: boolean;
  label: string;
  query: Record<string, string | string[] | undefined>;
  scope: "all" | "mine";
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "scope" || value === undefined) continue;
    params.set(key, Array.isArray(value) ? value[0] ?? "" : value);
  }
  params.set("scope", scope);
  return (
    <Link
      href={`/tasks?${params.toString()}`}
      className={`rounded-md px-2.5 py-1.5 transition-colors ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}

function TaskTable({ tasks }: { tasks: Awaited<ReturnType<typeof listTasksForUser>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-5 py-3 font-medium">Task</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Assignee</th>
            <th className="px-3 py-3 font-medium">Priority</th>
            <th className="px-3 py-3 font-medium">Due</th>
            <th className="px-5 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const overdue =
              isOverdue(task.dueDate, new Date()) &&
              task.status !== "done" &&
              task.status !== "cancelled";
            return (
              <tr key={task.id} className="group border-b last:border-0 hover:bg-muted/20">
                <td className="max-w-[28rem] px-5 py-3">
                  <Link href={`/projects/${task.projectId}/tasks/${task.id}`} className="block font-medium underline-offset-4 group-hover:text-brand group-hover:underline">
                    {task.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Link href={`/projects/${task.projectId}`} className="hover:text-foreground hover:underline">{task.projectName}</Link>
                    {task.estimateHours != null ? <><span>·</span><span>{task.estimateHours}h</span></> : null}
                    {task.dependency ? <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">Waiting on {task.dependency.blockingUserName ?? task.dependency.waitingOn ?? "dependency"}</Badge> : null}
                  </div>
                </td>
                <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-xs font-medium text-brand">{task.assigneeName?.charAt(0).toUpperCase() ?? "?"}</span>
                    {task.assigneeName ?? "Unassigned"}
                  </span>
                </td>
                <td className="px-3 py-3"><PriorityBadge priority={task.priority} /></td>
                <td className={`px-3 py-3 whitespace-nowrap ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`}>
                  {task.dueDate ? formatDate(task.dueDate) : "—"}
                  {overdue ? <span className="ml-1 text-xs">overdue</span> : null}
                </td>
                <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDateTime(task.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
