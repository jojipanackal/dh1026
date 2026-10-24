import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import {
  JournalChat,
  type ThreadEntry,
} from "@/app/journal/journal-chat";
import type { Resolved } from "@/lib/journal/resolve";
import { getCurrentUser } from "@/server/current-user";
import {
  listJournalThread,
  listMemberProjects,
  listTaskProjectMap,
} from "@/server/journal";

export const instant = false;

export default async function JournalPage() {
  await connection();
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

  const { projectRows, membersByProject } = await listMemberProjects(user.id);
  if (projectRows.length === 0) {
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

  const thread = await listJournalThread(user.id);
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

  // Applied entries link to their tasks; one entry can touch tasks in
  // several projects, so look each task's project up.
  const appliedTaskIds = new Set<string>();
  for (const e of entries) {
    for (const id of e.appliedChanges?.updatedTaskIds ?? []) {
      appliedTaskIds.add(id);
    }
    for (const id of e.appliedChanges?.createdTaskIds ?? []) {
      appliedTaskIds.add(id);
    }
  }
  const taskProjects = await listTaskProjectMap([...appliedTaskIds]);

  return (
    <div>
      <JournalChat
        entries={entries}
        membersByProject={membersByProject}
        taskProjects={taskProjects}
      />
    </div>
  );
}
