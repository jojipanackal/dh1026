import { Suspense } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { NewProjectForm } from "@/app/projects/new-project-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/lifecycle";
import { getCurrentUser } from "@/server/current-user";
import { listProjectsForUser } from "@/server/projects";

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Projects you are a member of."
      />
      <Suspense fallback={<LoadingState />}>
        <ProjectsContent />
      </Suspense>
    </div>
  );
}

async function ProjectsContent() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        title="No demo user selected"
        message="Pick a demo user in the sidebar to see your projects. Demo identity only — there is no authentication."
      />
    );
  }
  const projectList = await listProjectsForUser(user.id);
  return (
    <div className="flex flex-col gap-8">
      {projectList.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Create your first project below to start tracking tasks."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projectList.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    {project.name}
                    <Badge variant="outline">{project.role}</Badge>
                  </CardTitle>
                  {project.description ? (
                    <CardDescription>{project.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {project.total === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks yet
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(project.counts).map(([status, count]) => (
                        <Badge key={status} variant="secondary">
                          {TASK_STATUS_LABELS[status as TaskStatus] ?? status}:{" "}
                          {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <section>
        <h2 className="mb-3 text-lg font-medium">New project</h2>
        <NewProjectForm />
      </section>
    </div>
  );
}
