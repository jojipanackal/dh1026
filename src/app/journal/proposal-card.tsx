"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  applyJournalAction,
  dismissJournalAction,
} from "@/app/journal/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Resolved } from "@/lib/journal/resolve";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/validation";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = TASK_STATUSES;
const NEW_STATUS_OPTIONS = ["todo", "in_progress", "blocked"] as const;

type MemberOption = { id: string; name: string };

function MemberSelect({
  value,
  onChange,
  members,
  disabled,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  members: MemberOption[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onChange(v || null)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="h-7 w-32 text-xs">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProposalCard({
  entryId,
  projectId,
  resolved,
  members,
}: {
  entryId: string;
  projectId: string;
  resolved: Resolved;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);

  const [updates, setUpdates] = useState(() =>
    resolved.taskUpdates.map((u) => ({
      checked: u.confidence !== "low" && !u.transitionError,
      status: (u.status ?? u.fromStatus) as TaskStatus,
      priority: (u.priority ?? "medium") as TaskPriority,
      assigneeId: u.assigneeId,
    })),
  );
  const [news, setNews] = useState(() =>
    resolved.newTasks.map((n) => ({
      checked: n.confidence !== "low" && !n.possibleDuplicateOf,
      title: n.title,
      status: n.status as "todo" | "in_progress" | "blocked",
      priority: n.priority,
      assigneeId: n.assigneeId,
    })),
  );
  const [blockers, setBlockers] = useState(() =>
    resolved.blockers.map((b) => ({ checked: b.taskId !== null })),
  );

  const count =
    updates.filter((u) => u.checked).length +
    news.filter((n) => n.checked).length +
    blockers.filter((b) => b.checked).length;

  const hasProposals =
    resolved.taskUpdates.length > 0 ||
    resolved.newTasks.length > 0 ||
    resolved.blockers.length > 0;

  function apply() {
    startTransition(async () => {
      const result = await applyJournalAction(entryId, {
        taskUpdates: resolved.taskUpdates
          .map((_, index) => ({ index, ...updates[index] }))
          .filter((s) => s.checked)
          .map(({ index, status, priority, assigneeId }) => ({
            index,
            status,
            priority,
            assigneeId,
          })),
        newTasks: resolved.newTasks
          .map((_, index) => ({ index, ...news[index] }))
          .filter((s) => s.checked)
          .map(({ index, title, status, priority, assigneeId }) => ({
            index,
            title: title.trim() || resolved.newTasks[index].title,
            status,
            priority,
            assigneeId,
          })),
        blockers: resolved.blockers
          .map((_, index) => ({ index, checked: blockers[index].checked }))
          .filter((s) => s.checked)
          .map(({ index }) => ({ index })),
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Changes applied");
        router.refresh();
      }
    });
  }

  function dismiss() {
    startTransition(async () => {
      const r = await dismissJournalAction(entryId);
      if (r.error) toast.error(r.error);
      else router.refresh();
    });
  }

  if (!hasProposals) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">No changes proposed.</p>
    );
  }

  const memberName = (id: string | null) =>
    id ? (members.find((m) => m.id === id)?.name ?? "Unassigned") : "Unassigned";

  const editBtn = (id: string) => (
    <button
      type="button"
      aria-label="Edit"
      onClick={() => setEditing((e) => (e === id ? null : id))}
      className={cn(
        "rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground",
        editing === id && "bg-accent text-foreground",
      )}
    >
      <Pencil className="size-3" />
    </button>
  );

  return (
    <div className="mt-2 rounded-xl border bg-card">
      <div className="flex flex-col divide-y text-sm">
        {resolved.taskUpdates.map((u, i) => (
          <div key={`u${i}`} className="px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={updates[i].checked}
                disabled={!!u.transitionError}
                onCheckedChange={(c) =>
                  setUpdates((s) =>
                    s.map((x, j) => (j === i ? { ...x, checked: c === true } : x)),
                  )
                }
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${projectId}/tasks/${u.taskId}`}
                    className="line-clamp-2 font-medium underline-offset-4 hover:underline"
                    title={u.taskTitle}
                  >
                    {u.taskTitle}
                  </Link>
                  <span className="ml-auto flex items-center gap-1">
                    {u.confidence !== "high" ? (
                      <Badge variant="outline" className="font-normal">
                        {u.confidence}
                      </Badge>
                    ) : null}
                    {editBtn(`u${i}`)}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {u.status ? (
                    <p>
                      Status: {TASK_STATUS_LABELS[u.fromStatus]} →{" "}
                      {TASK_STATUS_LABELS[updates[i].status]}
                    </p>
                  ) : null}
                  {u.priority ? (
                    <p>
                      Priority:{" "}
                      {u.fromPriority
                        ? u.fromPriority[0].toUpperCase() +
                          u.fromPriority.slice(1)
                        : "—"}{" "}
                      → {updates[i].priority[0].toUpperCase() + updates[i].priority.slice(1)}
                    </p>
                  ) : null}
                  {u.assigneeId ? (
                    <p>
                      Assignee: {memberName(u.fromAssigneeId)} →{" "}
                      {memberName(updates[i].assigneeId)}
                    </p>
                  ) : null}
                </div>
                {u.transitionError ? (
                  <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">
                    {u.transitionError}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted-foreground italic">
                  {u.reason}
                </p>
                {editing === `u${i}` ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Select
                      value={updates[i].status}
                      onValueChange={(v) =>
                        setUpdates((s) =>
                          s.map((x, j) =>
                            j === i ? { ...x, status: v as TaskStatus } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={updates[i].priority}
                      onValueChange={(v) =>
                        setUpdates((s) =>
                          s.map((x, j) =>
                            j === i ? { ...x, priority: v as TaskPriority } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <MemberSelect
                      value={updates[i].assigneeId}
                      onChange={(v) =>
                        setUpdates((s) =>
                          s.map((x, j) => (j === i ? { ...x, assigneeId: v } : x)),
                        )
                      }
                      members={members}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {resolved.newTasks.map((n, i) => (
          <div key={`n${i}`} className="px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={news[i].checked}
                onCheckedChange={(c) =>
                  setNews((s) =>
                    s.map((x, j) => (j === i ? { ...x, checked: c === true } : x)),
                  )
                }
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="line-clamp-2 font-medium" title={news[i].title}>
                    New: {news[i].title}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    {n.confidence !== "high" ? (
                      <Badge variant="outline" className="font-normal">
                        {n.confidence}
                      </Badge>
                    ) : null}
                    {editBtn(`n${i}`)}
                  </span>
                </div>
                {n.possibleDuplicateOf ? (
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    Possible duplicate of{" "}
                    <Link
                      href={`/projects/${projectId}/tasks/${n.possibleDuplicateOf.id}`}
                      className="underline underline-offset-2"
                    >
                      {n.possibleDuplicateOf.title}
                    </Link>
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted-foreground italic">
                  {n.reason}
                </p>
                {editing === `n${i}` ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      value={news[i].title}
                      maxLength={200}
                      onChange={(e) =>
                        setNews((s) =>
                          s.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                      className="h-7 w-full text-xs"
                    />
                    <Select
                      value={news[i].status}
                      onValueChange={(v) =>
                        setNews((s) =>
                          s.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  status: v as
                                    | "todo"
                                    | "in_progress"
                                    | "blocked",
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NEW_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={news[i].priority}
                      onValueChange={(v) =>
                        setNews((s) =>
                          s.map((x, j) =>
                            j === i ? { ...x, priority: v as TaskPriority } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <MemberSelect
                      value={news[i].assigneeId}
                      onChange={(v) =>
                        setNews((s) =>
                          s.map((x, j) => (j === i ? { ...x, assigneeId: v } : x)),
                        )
                      }
                      members={members}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {resolved.blockers.map((b, i) => (
          <div key={`b${i}`} className="px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={blockers[i].checked}
                disabled={!b.taskId}
                onCheckedChange={(c) =>
                  setBlockers((s) =>
                    s.map((x, j) => (j === i ? { ...x, checked: c === true } : x)),
                  )
                }
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {b.taskTitle ? (
                    <Link
                      href={`/projects/${projectId}/tasks/${b.taskId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {b.taskTitle}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      Not linked to a task
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {b.description}
                  {b.waitingOn ? ` — waiting on ${b.waitingOn}` : ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-3 py-2.5">
        <Button size="sm" onClick={apply} disabled={pending || count === 0}>
          {pending ? "Applying…" : `Apply ${count} change${count === 1 ? "" : "s"}`}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss} disabled={pending}>
          Dismiss
        </Button>
        <span className="text-xs text-muted-foreground max-sm:basis-full">
          Proposed by AI. Nothing changes until you apply.
        </span>
      </div>
    </div>
  );
}

export function AppliedCard({
  projectId,
  appliedChanges,
}: {
  projectId: string;
  appliedChanges: { updatedTaskIds?: string[]; createdTaskIds?: string[] } | null;
}) {
  const updated = appliedChanges?.updatedTaskIds ?? [];
  const created = appliedChanges?.createdTaskIds ?? [];
  return (
    <div className="mt-2 rounded-xl border bg-card px-3 py-2.5 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <Check className="size-4 text-emerald-500" />
        Applied {updated.length + created.length} change
        {updated.length + created.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-1 flex flex-col gap-0.5 text-xs">
        {updated.map((id) => (
          <li key={id}>
            <Link
              href={`/projects/${projectId}/tasks/${id}`}
              className="text-brand underline-offset-2 hover:underline"
            >
              Updated task
            </Link>
          </li>
        ))}
        {created.map((id) => (
          <li key={id}>
            <Link
              href={`/projects/${projectId}/tasks/${id}`}
              className="text-brand underline-offset-2 hover:underline"
            >
              Created task
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
