import Link from "next/link";

import { ActivityChanges } from "@/components/activity-changes";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { STALLED_AFTER_DAYS } from "@/lib/overview";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/lifecycle";
import type { ProjectOverview } from "@/server/overview";
import type { listActivity } from "@/server/tasks";

type Activity = Awaited<ReturnType<typeof listActivity>>;

const BAR_STYLES: Record<Exclude<TaskStatus, "cancelled">, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-brand",
  blocked: "bg-amber-500",
  todo: "bg-muted-foreground/30",
};

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="flex items-baseline justify-between gap-2 border-b px-5 py-3 text-sm font-medium">
        {title}
        {action}
      </h2>
      <div className="px-5 py-3">{children}</div>
    </section>
  );
}

function TaskLink({
  projectId,
  taskId,
  title,
}: {
  projectId: string;
  taskId: string;
  title: string;
}) {
  return (
    <Link
      href={`/projects/${projectId}/tasks/${taskId}`}
      className="font-medium underline-offset-4 hover:underline"
    >
      {title}
    </Link>
  );
}

export function OverviewView({
  projectId,
  overview,
  activity,
  userNames,
}: {
  projectId: string;
  overview: ProjectOverview;
  activity: Activity;
  userNames: Map<string, string>;
}) {
  const { counts, open } = overview;
  const segments = (
    ["done", "in_progress", "blocked", "todo"] as const
  ).filter((s) => counts[s] > 0);
  const hasAttention =
    overview.overdue.length > 0 ||
    overview.pendingBlockers.length > 0 ||
    overview.stalled.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card title="Progress">
        {open + counts.done === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No tasks yet — create one or send a journal update.
          </p>
        ) : (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="text-2xl font-semibold tabular-nums">
                {overview.donePct ?? 0}
                <span className="text-sm font-normal text-muted-foreground">
                  % done
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                {counts.done} done · {counts.in_progress + counts.todo} active ·{" "}
                {counts.blocked} blocked
                {counts.cancelled > 0
                  ? ` · ${counts.cancelled} cancelled`
                  : ""}
              </span>
            </div>
            <div
              className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${overview.donePct ?? 0}% of tasks done`}
            >
              {segments.map((s) => (
                <div
                  key={s}
                  className={BAR_STYLES[s]}
                  style={{
                    width: `${(counts[s] / (open + counts.done)) * 100}%`,
                  }}
                  title={`${TASK_STATUS_LABELS[s]}: ${counts[s]}`}
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Blocked work">
          {overview.blocked.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Nothing is blocked right now.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {overview.blocked.map((t) => (
                <li key={t.id}>
                  <div className="flex items-center gap-2">
                    <TaskLink
                      projectId={projectId}
                      taskId={t.id}
                      title={t.title}
                    />
                    <PriorityBadge priority={t.priority} />
                  </div>
                  {t.reason ? (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Reason: </span>“
                      {t.reason}”
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      No reason recorded.
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.assigneeName ?? "Unassigned"} · marked blocked by{" "}
                    {t.blockedByName} · {formatDateTime(t.blockedAt)}
                    {t.reasonActorName && t.reasonActorName !== t.blockedByName
                      ? ` · reason from ${t.reasonActorName}`
                      : ""}
                  </p>
                  {t.journalEntryId || t.reasonJournalEntryId ? (
                    <Link
                      href={`/journal#entry-${t.reasonJournalEntryId ?? t.journalEntryId}`}
                      className="mt-0.5 inline-block text-xs text-brand underline-offset-2 hover:underline"
                    >
                      via journal
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Needs attention">
          {!hasAttention ? (
            <p className="py-2 text-sm text-muted-foreground">
              Nothing overdue and no risks detected.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {overview.overdue.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Overdue
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {overview.overdue.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0">
                          <TaskLink
                            projectId={projectId}
                            taskId={t.id}
                            title={t.title}
                          />
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t.assigneeName ?? "unassigned"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-red-600 dark:text-red-400">
                          {t.daysOverdue}d overdue · due{" "}
                          {formatDate(t.dueDate!)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {overview.pendingBlockers.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Reported in journal, not yet applied
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {overview.pendingBlockers.map((b, i) => (
                      <li key={`${b.entryId}-${i}`} className="text-sm">
                        <Link
                          href={`/journal#entry-${b.entryId}`}
                          className="text-brand underline-offset-2 hover:underline"
                        >
                          {b.authorName} reported
                        </Link>
                        {b.taskTitle ? (
                          <>
                            {" "}
                            a blocker on{" "}
                            <TaskLink
                              projectId={projectId}
                              taskId={b.taskId!}
                              title={b.taskTitle}
                            />
                          </>
                        ) : (
                          " a blocker"
                        )}
                        : “{b.description}”
                        {b.waitingOn ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — waiting on {b.waitingOn}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {overview.stalled.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Possible stalls
                    <Badge variant="outline" className="font-normal normal-case">
                      inferred — not reported
                    </Badge>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {overview.stalled.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0">
                          <TaskLink
                            projectId={projectId}
                            taskId={t.id}
                            title={t.title}
                          />
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t.assigneeName ?? "unassigned"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          no updates in {t.daysStale}d
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    In progress with no recorded change for over{" "}
                    {STALLED_AFTER_DAYS} days. A guess from timestamps, not a
                    reported blocker.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Upcoming priorities">
          {overview.upcoming.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No high-priority or due-soon open tasks.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {overview.upcoming.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <TaskLink
                      projectId={projectId}
                      taskId={t.id}
                      title={t.title}
                    />
                    <StatusBadge status={t.status} />
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <span className="w-20 text-right text-xs text-muted-foreground">
                      {t.dueDate
                        ? t.daysUntilDue === 0
                          ? "due today"
                          : t.daysUntilDue != null
                            ? `due in ${t.daysUntilDue}d`
                            : formatDate(t.dueDate)
                        : "no due date"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent activity"
          action={
            <Link
              href={`/projects/${projectId}?view=activity`}
              className="text-xs font-normal text-brand underline-offset-2 hover:underline"
            >
              View all
            </Link>
          }
        >
          {activity.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No activity yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {activity.slice(0, 8).map((event) => (
                <li key={event.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{event.actorName}</span>
                    {event.source === "journal" && event.journalEntryId ? (
                      <Link
                        href={`/journal#entry-${event.journalEntryId}`}
                        className="text-xs text-brand underline-offset-2 hover:underline"
                      >
                        via journal
                      </Link>
                    ) : null}
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
        </Card>
      </div>
    </div>
  );
}
