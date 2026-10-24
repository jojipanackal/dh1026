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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const NUM = "text-right tabular-nums";

async function ProjectsContent() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        title="No demo user selected"
        message="Pick a demo user in the top bar to see your projects. Demo identity only — there is no authentication."
      />
    );
  }
  const projectList = await listProjectsForUser(user.id);

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {projectList.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Create your first project to start tracking tasks."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Project</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">To do</TableHead>
                  <TableHead className="text-right">In progress</TableHead>
                  <TableHead className="text-right">Blocked</TableHead>
                  <TableHead className="text-right">Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectList.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {project.name}
                      </Link>
                      {project.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {project.role}
                      </Badge>
                    </TableCell>
                    <TableCell className={NUM}>
                      {project.counts.todo ?? 0}
                    </TableCell>
                    <TableCell className={NUM}>
                      {project.counts.in_progress ?? 0}
                    </TableCell>
                    <TableCell className={NUM}>
                      {project.counts.blocked ?? 0}
                    </TableCell>
                    <TableCell className={NUM}>
                      {project.counts.done ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">New project</CardTitle>
          </CardHeader>
          <CardContent>
            <NewProjectForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
