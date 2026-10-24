import { Suspense } from "react";

import { ConversationsNav } from "@/components/app-shell/conversations-nav";
import { excerpt, formatRelativeDay } from "@/lib/format";
import { getCurrentUser } from "@/server/current-user";
import {
  listLatestEntryPerProject,
  pickDefaultProjectId,
} from "@/server/journal";
import { listProjectsForUser } from "@/server/projects";

const MAX_ITEMS = 10;

export function Conversations() {
  return (
    <Suspense fallback={null}>
      <ConversationsLoader />
    </Suspense>
  );
}

async function ConversationsLoader() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="px-2 text-xs text-muted-foreground">
        Pick a demo user to see conversations.
      </p>
    );
  }
  const [projectList, latest] = await Promise.all([
    listProjectsForUser(user.id),
    listLatestEntryPerProject(user.id),
  ]);
  if (projectList.length === 0) return null;

  // Projects with journal activity first (most recent), then the rest.
  const items = projectList
    .map((p) => ({ id: p.id, name: p.name, last: latest.get(p.id) }))
    .sort((a, b) => {
      if (a.last && b.last) {
        return a.last.createdAt < b.last.createdAt ? 1 : -1;
      }
      if (a.last) return -1;
      if (b.last) return 1;
      return 0;
    })
    .slice(0, MAX_ITEMS)
    .map((p) => ({
      id: p.id,
      name: p.name,
      excerpt: p.last ? excerpt(p.last.body) : "No entries yet",
      dateLabel: p.last ? formatRelativeDay(p.last.createdAt) : null,
    }));

  return (
    <ConversationsNav
      items={items}
      defaultProjectId={
        pickDefaultProjectId(
          projectList.map((p) => p.id),
          latest,
        ) ?? null
      }
    />
  );
}
