import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import {
  JournalChat,
  type ThreadEntry,
} from "@/app/journal/journal-chat";
import { Suspense } from "react";
import { MobileProjectSelect } from "@/app/journal/project-select";
import { isUuid } from "@/lib/ids";
import type { Resolved } from "@/lib/journal/resolve";
import { getCurrentUser } from "@/server/current-user";
import {
  listJournalThread,
  listLatestEntryPerProject,
  pickDefaultProjectId,
} from "@/server/journal";
import { getProjectForMember, listProjectsForUser } from "@/server/projects";

export const instant = false;

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
          message="Pick a demo user in the sidebar to write a journal entry."
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
    pickDefaultProjectId(
      projectList.map((p) => p.id),
      latest,
    ) ??
    projectList[0].id;

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

  // Full-height chat: the container's py-10 plus the mobile top bar (h-12)
  // bound the thread's internal scroll area so the composer stays pinned.
  return (
    <div className="flex h-[calc(100svh-8rem)] min-h-96 flex-col md:h-[calc(100svh-5rem)]">
      {/* Slim header: project name on desktop, project picker on mobile
          (the sidebar Conversations group handles switching on desktop). */}
      <div className="mx-auto w-full max-w-3xl shrink-0 pb-4">
        <div className="hidden items-baseline gap-3 md:flex">
          <h1 className="text-sm font-medium">{projectName}</h1>
          <p className="text-xs text-muted-foreground">
            Your private journal — AI proposes changes; nothing applies until
            you say so.
          </p>
        </div>
        <div className="md:hidden">
          <Suspense fallback={null}>
            <MobileProjectSelect
              projects={projectList}
              selected={selected}
            />
          </Suspense>
        </div>
      </div>

      <JournalChat
        projectId={selected}
        entries={entries}
        members={members.map((m) => ({ id: m.userId, name: m.name }))}
      />
    </div>
  );
}
