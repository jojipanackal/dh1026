import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/server/current-user";
import { listTeamForUser } from "@/server/team";

export default function TeamPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TeamContent />
    </Suspense>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function TeamContent() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <PageHeader title="Team" description="People across your projects." />
        <EmptyState
          title="No demo user selected"
          message="Pick a demo user in the top bar to see your project teammates."
        />
      </>
    );
  }

  const members = await listTeamForUser(user.id);
  return (
    <div>
      <PageHeader
        title="Team"
        description="People and current workload across your projects."
      />
      {members.length === 0 ? (
        <EmptyState
          title="No teammates yet"
          message="Create a project and add members to see the team directory."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((member) => {
            const openTasks = member.projects.reduce(
              (total, project) => total + project.openTaskCount,
              0,
            );
            const taskCount = member.projects.reduce(
              (total, project) => total + project.taskCount,
              0,
            );
            return (
              <Card key={member.id}>
                <CardHeader className="border-b">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-sm font-semibold text-brand">
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{member.name}</CardTitle>
                        {member.id === user.id ? (
                          <Badge variant="secondary">You</Badge>
                        ) : null}
                      </div>
                      <CardDescription className="mt-1 font-mono text-xs">
                        {member.email}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-muted-foreground">Projects</p>
                      <p className="mt-1 text-base font-medium tabular-nums">
                        {member.projects.length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-muted-foreground">Open work</p>
                      <p className="mt-1 text-base font-medium tabular-nums">
                        {openTasks}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-muted-foreground">All tasks</p>
                      <p className="mt-1 text-base font-medium tabular-nums">
                        {taskCount}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Projects
                  </p>
                  {member.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {project.name}
                      </span>
                      <Badge variant="outline" className="font-normal">
                        {project.role}
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {project.openTaskCount} open
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
