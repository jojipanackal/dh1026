"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  dismissJournalAction,
  interpretJournalAction,
  submitJournalAction,
} from "@/app/journal/actions";
import { AppliedCard, ProposalCard } from "@/app/journal/proposal-card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Resolved } from "@/lib/journal/resolve";
import { cn } from "@/lib/utils";

export type ThreadEntry = {
  id: string;
  body: string;
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

function AssistantMessage({
  entry,
  projectId,
  members,
  onRetry,
  onDismiss,
  pending,
}: {
  entry: ThreadEntry;
  projectId: string;
  members: { id: string; name: string }[];
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
        <p className="mb-1 font-mono text-xs text-muted-foreground">
          Project Runner AI{entry.model ? ` · ${entry.model}` : ""}
        </p>

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
            <div className="rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm">
              <p>{resolved.summary}</p>
            </div>
            <ProposalCard
              entryId={entry.id}
              projectId={projectId}
              resolved={resolved}
              members={members}
            />
            {resolved.decisions.length > 0 ? (
              <div className="rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm">
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
            {resolved.clarifications.length > 0 ? (
              <div className="rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm">
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
            {resolved.issues.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {resolved.issues.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {entry.status === "applied" ? (
          <div className="flex flex-col gap-2">
            {resolved ? (
              <div className="rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm">
                <p>{resolved.summary}</p>
              </div>
            ) : null}
            <AppliedCard
              projectId={projectId}
              appliedChanges={entry.appliedChanges}
            />
          </div>
        ) : null}

        {entry.status === "dismissed" ? (
          <p className="rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm text-muted-foreground">
            Dismissed.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function JournalChat({
  projectId,
  entries,
  members,
}: {
  projectId: string;
  entries: ThreadEntry[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<
    { key: string; body: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

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
    formData.set("projectId", projectId);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={areaRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto flex max-w-[760px] flex-col gap-6">
          {entries.length === 0 && optimistic.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No entries yet. Tell Project Runner what you worked on below.
            </p>
          ) : null}
          {entries.map((entry) => (
            <div
              key={entry.id}
              id={`entry-${entry.id}`}
              className="flex flex-col gap-3 scroll-mt-4"
            >
              <div className="self-end">
                <div className="max-w-xl rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {entry.body}
                </div>
                <p className="mt-1 text-right font-mono text-xs text-muted-foreground">
                  {formatDateTime(new Date(entry.createdAt))}
                </p>
              </div>
              <AssistantMessage
                entry={entry}
                projectId={projectId}
                members={members}
                pending={pending}
                onRetry={() => retry(entry.id)}
                onDismiss={() => dismiss(entry.id)}
              />
            </div>
          ))}
          {optimistic.map((m) => (
            <div key={m.key} className="flex flex-col gap-3">
              <div className="self-end">
                <div className="max-w-xl rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap opacity-70">
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

      <div className="border-t px-4 py-3">
        <div className="mx-auto flex max-w-[760px] items-end gap-2">
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
            placeholder="Tell Project Runner what you worked on, what's blocked, or what you decided…"
            className={cn(
              "min-h-10 flex-1 resize-none rounded-2xl border bg-muted/40 px-4 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
          <Button
            size="icon"
            aria-label="Send"
            disabled={pending || !text.trim()}
            onClick={send}
          >
            <SendHorizonal className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
