import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";

import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { listTaskEdgesForUser, listTasksForUser } from "@/server/tasks";

type GraphTask = Awaited<ReturnType<typeof listTasksForUser>>[number];
type GraphEdge = Awaited<ReturnType<typeof listTaskEdgesForUser>>[number];

export function TaskGraph({
  tasks,
  edges,
}: {
  tasks: GraphTask[];
  edges: GraphEdge[];
}) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const renderedEdges = edges.filter(
    (edge) => edge.blockingTaskId && taskById.has(edge.blockingTaskId),
  );
  const connected = new Set<string>();
  for (const edge of renderedEdges) {
    connected.add(edge.blockedTaskId);
    if (edge.blockingTaskId) connected.add(edge.blockingTaskId);
  }
  const independentTasks = tasks.filter((task) => !connected.has(task.id));

  return (
    <section aria-label="Task dependency graph" className="rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-brand" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Dependency graph</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Every arrow is a recorded handoff. The task on the right cannot move until the task on the left moves.
          </p>
        </div>
        <Badge variant="outline">
          {renderedEdges.length} connection{renderedEdges.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {renderedEdges.length > 0 ? (
        <div className="flex flex-col gap-3 p-5">
          {renderedEdges.map((edge) => {
            const blockingTask = taskById.get(edge.blockingTaskId!);
            const blockedTask = taskById.get(edge.blockedTaskId);
            if (!blockingTask || !blockedTask) return null;
            return (
              <div
                key={`${edge.blockingTaskId}-${edge.blockedTaskId}`}
                className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)]"
              >
                <GraphTaskNode task={blockingTask} />
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <span className="hidden md:inline">unblocks</span>
                  <ArrowRight className="size-4 text-brand" aria-hidden="true" />
                </div>
                <GraphTaskNode
                  task={blockedTask}
                  waitingOn={edge.blockingUserName ?? edge.waitingOn}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No connected dependencies match the current filters.
        </p>
      )}

      {independentTasks.length > 0 ? (
        <div className="border-t px-5 py-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Independent work
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {independentTasks.map((task) => <GraphTaskNode key={task.id} task={task} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GraphTaskNode({
  task,
  waitingOn,
}: {
  task: GraphTask;
  waitingOn?: string | null;
}) {
  return (
    <Link
      href={`/projects/${task.projectId}/tasks/${task.id}`}
      className="group min-w-0 rounded-lg border bg-background px-3.5 py-3 transition-colors hover:border-brand/50 hover:bg-brand/5"
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:text-brand">
            {task.title}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {task.projectName} · {task.assigneeName ?? "Unassigned"}
          </span>
        </span>
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <PriorityBadge priority={task.priority} />
        {task.dueDate ? <span>Due {formatDate(task.dueDate)}</span> : null}
        {waitingOn ? (
          <span className="text-amber-600 dark:text-amber-400">Waiting on {waitingOn}</span>
        ) : null}
      </div>
    </Link>
  );
}
