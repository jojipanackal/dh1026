import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import {
  JournalChat,
  type ThreadEntry,
} from "@/app/journal/journal-chat";
import { Suspense } from "react";
import { ProjectSelect } from "@/app/journal/project-select";
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
    <div>
      {/* Plain (unpinned) header: project picker plus a hint about the
          review-then-apply model. */}
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 pb-4">
        <div className="w-full md:w-56">
          <Suspense fallback={null}>
            <ProjectSelect projects={projectList} selected={selected} />
          </Suspense>
        </div>
        <p className="text-xs text-muted-foreground">
          Your private journal — AI proposes changes; nothing applies until
          you say so.
        </p>
      </div>

      <JournalChat
        projectId={selected}
        entries={entries}
        members={members.map((m) => ({ id: m.userId, name: m.name }))}
      />
    </div>
  );
}
