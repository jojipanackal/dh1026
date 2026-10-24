import { Suspense } from "react";

import { UserSwitcherClient } from "@/components/app-shell/user-switcher-client";
import { getCurrentUser } from "@/server/current-user";
import { listAllUsers } from "@/server/users";

export function UserSwitcher() {
  return (
    <Suspense fallback={<span className="text-xs text-muted-foreground">…</span>}>
      <UserSwitcherLoader />
    </Suspense>
  );
}

async function UserSwitcherLoader() {
  const [allUsers, current] = await Promise.all([
    listAllUsers(),
    getCurrentUser(),
  ]);
  if (allUsers.length === 0) {
    return (
      <span className="px-3 text-xs text-muted-foreground">
        No users yet — run{" "}
        <code className="rounded bg-muted px-1">npm run db:seed</code>
      </span>
    );
  }
  return <UserSwitcherClient users={allUsers} currentUserId={current?.id ?? null} />;
}
