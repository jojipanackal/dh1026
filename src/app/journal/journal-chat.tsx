"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ListTodo,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  dismissJournalAction,
  interpretJournalAction,
  submitJournalAction,
} from "@/app/journal/actions";
import { AppliedCard, ProposalCard } from "@/app/journal/proposal-card";
import { Button } from "@/components/ui/button";
import { dayKeyIst, formatDateTime, formatRelativeDay } from "@/lib/format";
import { channelLabel } from "@/lib/agent/channels";
import type { Resolved } from "@/lib/journal/resolve";
import { cn } from "@/lib/utils";

export type ThreadEntry = {
  id: string;
  body: string;
  channel: string;
  status: string;
  interpretation: Resolved | null;
  interpretationError: string | null;
  model: string | null;
  appliedChanges: { updatedTaskIds?: string[]; createdTaskIds?: string[] } | null;
  createdAt: string;
};

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="Interpreting">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </span>
  );
}

function priorityLabel(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function TaskAnswerCard({ answer }: { answer: NonNullable<Resolved["answer"]> }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <ListTodo className="size-4 text-brand" />
        <span className="text-xs font-medium">Task search</span>
        <span className="text-xs text-muted-foreground">
          {answer.tasks.length} open {answer.tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      {answer.tasks.length > 0 ? (
        <div className="divide-y">
          {answer.tasks.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.projectId}/tasks/${task.id}`}
              className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                {task.status === "blocked" ? (
                  <CircleDot className="size-3.5" />
                ) : task.status === "done" ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:text-brand">
                  {task.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{task.projectName}</span>
                  <span>·</span>
                  <span>{priorityLabel(task.priority)} priority</span>
                  {task.dueDate ? (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {task.dueDate}
                      </span>
                    </>
                  ) : null}
                </span>
                {task.lastUpdate ? (
                  <span className="mt-2 block line-clamp-2 text-xs text-muted-foreground/80">
                    <span className="font-medium text-muted-foreground">
                      {task.lastUpdate.authorName} · {formatDateTime(new Date(task.lastUpdate.createdAt))}
                    </span>{" "}
                    {task.lastUpdate.body}
                  </span>
                ) : null}
                {task.dependency ? (
                  <span className="mt-2 block text-xs text-amber-600 dark:text-amber-400">
                    Waiting on {task.dependency.blockingUserName ?? task.dependency.waitingOn ?? "an external dependency"}
                    {task.dependency.createdAt
                      ? ` · since ${formatDateTime(new Date(task.dependency.createdAt))}`
                      : ""}
                  </span>
                ) : null}
              </span>
              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Nothing needs attention right now.
        </p>
      )}
    </div>
  );
}

function AssistantMessage({
  entry,
  membersByProject,
  taskProjects,
  onRetry,
  onDismiss,
  pending,
}: {
  entry: ThreadEntry;
  membersByProject: Record<string, { id: string; name: string }[]>;
  taskProjects: Record<string, string>;
  onRetry: () => void;
  onDismiss: () => void;
  pending: boolean;
}) {
  const resolved = entry.interpretation;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Jeera</span>
          <span>·</span>
          <span>{entry.model === "task-query" ? "Task search" : "Work journal"}</span>
          <span>·</span>
          <span>{channelLabel(entry.channel as Parameters<typeof channelLabel>[0])}</span>
        </div>

        {entry.status === "pending" ? (
          <div className="flex items-center gap-3 rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm">
            <TypingDots />
            <span className="text-muted-foreground">Interpreting…</span>
            <Button size="sm" variant="ghost" onClick={onRetry} disabled={pending}>
              Retry
            </Button>
          </div>
        ) : null}

        {entry.status === "failed" ? (
          <div className="rounded-2xl rounded-tl-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
            <p className="text-red-600 dark:text-red-400">
              {entry.interpretationError ?? "Interpretation failed"}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={onRetry} disabled={pending}>
                Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss} disabled={pending}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}

        {entry.status === "ready" && resolved ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">{resolved.summary}</p>
            {resolved.answer ? (
              <TaskAnswerCard answer={resolved.answer} />
            ) : (
              <ProposalCard
                entryId={entry.id}
                resolved={resolved}
                membersByProject={membersByProject}
              />
            )}
            {!resolved.answer && resolved.decisions.length > 0 ? (
              <div className="rounded-2xl bg-card px-4 py-3 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Decisions
                </p>
                <ul className="flex flex-col gap-1.5">
                  {resolved.decisions.map((d, i) => (
                    <li key={i}>
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {d.rationale ?? "No rationale given"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Saved with this entry; searchable knowledge arrives in a later
                  phase.
                </p>
              </div>
            ) : null}
            {!resolved.answer && resolved.clarifications.length > 0 ? (
              <div className="rounded-2xl bg-card px-4 py-3 text-sm">
                <ul className="flex flex-col gap-1">
                  {resolved.clarifications.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Reply below to answer.
                </p>
              </div>
            ) : null}
            {!resolved.answer && resolved.issues.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {resolved.issues.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {entry.status === "applied" ? (
          <div className="flex flex-col gap-2">
            {resolved ? (
              <p className="text-sm">{resolved.summary}</p>
            ) : null}
            <AppliedCard
              appliedChanges={entry.appliedChanges}
              taskProjects={taskProjects}
            />
          </div>
        ) : null}

        {entry.status === "dismissed" ? (
          <p className="text-sm text-muted-foreground">Dismissed.</p>
        ) : null}
      </div>
    </div>
  );
}

export function JournalChat({
  entries,
  membersByProject,
  taskProjects,
}: {
  entries: ThreadEntry[];
  membersByProject: Record<string, { id: string; name: string }[]>;
  taskProjects: Record<string, string>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<
    { key: string; body: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll: to the anchored entry if present, else to the bottom.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = hash ? document.getElementById(hash) : null;
    (target ?? bottomRef.current)?.scrollIntoView(
      target ? { block: "start" } : { block: "end" },
    );
  }, [entries.length, optimistic.length]);

  function send() {
    const body = text.trim();
    if (!body) return;
    const key = crypto.randomUUID();
    setOptimistic((o) => [...o, { key, body }]);
    setText("");
    const formData = new FormData();
    formData.set("body", body);
    formData.set("submissionKey", key);
    startTransition(async () => {
      const result = await submitJournalAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        setOptimistic((o) => o.filter((m) => m.key !== key));
        setText(body);
        return;
      }
      setOptimistic((o) => o.filter((m) => m.key !== key));
      router.refresh();
    });
  }

  function retry(entryId: string) {
    startTransition(async () => {
      const r = await interpretJournalAction(entryId);
      if (r.error) toast.error(r.error);
      router.refresh();
    });
  }

  function dismiss(entryId: string) {
    startTransition(async () => {
      const r = await dismissJournalAction(entryId);
      if (r.error) toast.error(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100svh-5rem)] flex-col">
      <div className="mx-auto w-full max-w-4xl px-1 pb-6 pt-1 sm:px-4">
        <div className="mb-8 flex items-start justify-between gap-4 border-b pb-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                Execution agent
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                Chat with Jeera
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Tell Jeera what changed, ask what is happening, or let it keep the team moving.
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
            Enter to send · Shift + Enter for a new line
          </span>
        </div>

        <div className="flex flex-col gap-6">
          {entries.length === 0 && optimistic.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/50 px-6 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand">
                <Bot className="size-6" />
              </div>
              <h2 className="mt-4 text-base font-medium">What should Jeera keep track of?</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Ask about work, record a dependency, or describe a scope change. Consequential task updates always wait for your approval.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["What are my tasks for today?", "Show blocked work", "I finished the registration flow"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setText(prompt)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {entries.map((entry, i) => (
            <div key={entry.id} className="contents">
              {(i === 0 ||
                dayKeyIst(entry.createdAt) !==
                  dayKeyIst(entries[i - 1].createdAt)) && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatRelativeDay(entry.createdAt)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div
                id={`entry-${entry.id}`}
                className="flex flex-col gap-3 scroll-mt-4"
              >
              <div className="self-end">
                <div className="max-w-[min(38rem,85vw)] rounded-2xl rounded-br-md border bg-muted/70 px-4 py-3 text-sm whitespace-pre-wrap shadow-sm">
                  {entry.body}
                </div>
                <p className="mt-1 text-right font-mono text-xs text-muted-foreground">
                  {formatDateTime(new Date(entry.createdAt))}
                </p>
              </div>
              <AssistantMessage
                entry={entry}
                membersByProject={membersByProject}
                taskProjects={taskProjects}
                pending={pending}
                onRetry={() => retry(entry.id)}
                onDismiss={() => dismiss(entry.id)}
              />
              </div>
            </div>
          ))}
          {optimistic.map((m) => (
            <div key={m.key} className="flex flex-col gap-3">
              <div className="self-end">
                <div className="max-w-[min(38rem,85vw)] rounded-2xl rounded-br-md border bg-muted/70 px-4 py-3 text-sm whitespace-pre-wrap opacity-70 shadow-sm">
                  {m.body}
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="flex items-center gap-3 rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm">
                  <TypingDots />
                  <span className="text-muted-foreground">Interpreting…</span>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto bg-background/95 px-1 pb-1 pt-3 backdrop-blur sm:px-4">
        <div className="mx-auto max-w-4xl">
          <div
            className={cn(
              "rounded-2xl border bg-card shadow-sm transition-shadow",
              "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
            )}
          >
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 8 * 24)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={5000}
              placeholder="Ask about tasks, or tell Jeera what you worked on…"
              className="max-h-48 min-h-11 w-full resize-none bg-transparent px-4 pt-3.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-end px-3 pb-2.5">
              <Button
                size="icon"
                aria-label="Send"
                className="size-8 rounded-full"
                disabled={pending || !text.trim()}
                onClick={send}
              >
                <SendHorizonal className="size-4" />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
