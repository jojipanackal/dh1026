import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import {
  JournalChat,
  type ThreadEntry,
} from "@/app/journal/journal-chat";
import { Suspense } from "react";
import { MobileProjectSelect } from "@/app/journal/project-select";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { cn } from "@/lib/utils";
import type { Resolved } from "@/lib/journal/resolve";
import { getCurrentUser } from "@/server/current-user";
import {
  listJournalThread,
  listLatestEntryPerProject,
} from "@/server/journal";
import { getProjectForMember, listProjectsForUser } from "@/server/projects";

export const instant = false;

function excerpt(body: string, max = 60) {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  await connection();
  const { projectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <PageHeader title="Journal" />
        <EmptyState
          title="No demo user selected"
          message="Pick a demo user in the top bar to write a journal entry."
        />
      </>
    );
  }
  const projectList = await listProjectsForUser(user.id);
  if (projectList.length === 0) {
    return (
      <>
        <PageHeader title="Journal" />
        <EmptyState
          title="No projects yet"
          message="Create a project first, then come back to journal."
        />
      </>
    );
  }

  const latest = await listLatestEntryPerProject(user.id);
  const selected =
    (projectId &&
    isUuid(projectId) &&
    projectList.some((p) => p.id === projectId)
      ? projectId
      : undefined) ??
    // default to the most recently active project, else the first
    (projectList
      .map((p) => ({ id: p.id, at: latest.get(p.id)?.createdAt }))
      .filter((p) => p.at)
      .sort((a, b) => (a.at! < b.at! ? 1 : -1))[0]?.id ||
    projectList[0].id);

  const [thread, { members }] = await Promise.all([
    listJournalThread(user.id, selected),
    getProjectForMember(selected, user.id),
  ]);
  const projectName = projectList.find((p) => p.id === selected)?.name ?? "";

  const entries: ThreadEntry[] = thread.map((e) => ({
    id: e.id,
    body: e.body,
    status: e.status,
    interpretation: e.interpretation as Resolved | null,
    interpretationError: e.interpretationError,
    model: e.model,
    appliedChanges: e.appliedChanges as ThreadEntry["appliedChanges"],
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="flex h-[calc(100svh-10.75rem)] min-h-96 flex-col -my-6">
      {/* Mobile: project select */}
      <div className="border-b px-4 py-3 md:hidden">
        <Suspense fallback={null}>
          <MobileProjectSelect
            projects={projectList}
            selected={selected}
          />
        </Suspense>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Rail */}
        <aside className="hidden w-60 shrink-0 flex-col border-r md:flex">
          <p className="px-4 pt-4 pb-2 text-xs font-medium text-muted-foreground">
            Projects
          </p>
          <nav className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
            {projectList.map((p) => {
              const last = latest.get(p.id);
              const active = p.id === selected;
              return (
                <Link
                  key={p.id}
                  href={`/journal?projectId=${p.id}`}
                  className={cn(
                    "rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60",
                    active && "bg-muted",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                    {last ? (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatDateTime(last.createdAt).split(",")[0]}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {last ? excerpt(last.body) : "No entries yet"}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Thread */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b px-4 py-3">
            <h1 className="text-sm font-medium">{projectName}</h1>
            <p className="text-xs text-muted-foreground">
              Your private journal. AI proposes changes; nothing applies until
              you say so.
            </p>
          </header>
          <JournalChat
            projectId={selected}
            entries={entries}
            members={members.map((m) => ({ id: m.userId, name: m.name }))}
          />
        </section>
      </div>
    </div>
  );
}
