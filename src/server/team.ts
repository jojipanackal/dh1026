import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { projectMemberships, projects, tasks, users } from "@/db/schema";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  projects: {
    id: string;
    name: string;
    role: "owner" | "member";
    openTaskCount: number;
    taskCount: number;
  }[];
};

export async function listTeamForUser(userId: string): Promise<TeamMember[]> {
  const visibleProjects = await db
    .select({ id: projects.id })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(eq(projectMemberships.userId, userId));
  const projectIds = visibleProjects.map((project) => project.id);
  if (projectIds.length === 0) return [];

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      projectId: projects.id,
      projectName: projects.name,
      role: projectMemberships.role,
      openTaskCount: sql<number>`count(${tasks.id}) filter (where ${tasks.status} not in ('done', 'cancelled'))::int`,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(inArray(projectMemberships.projectId, projectIds))
    .groupBy(
      users.id,
      users.name,
      users.email,
      projects.id,
      projects.name,
      projectMemberships.role,
    )
    .orderBy(asc(users.name), asc(projects.name));

  const members = new Map<string, TeamMember>();
  for (const row of rows) {
    let member = members.get(row.userId);
    if (!member) {
      member = {
        id: row.userId,
        name: row.name,
        email: row.email,
        projects: [],
      };
      members.set(row.userId, member);
    }
    member.projects.push({
      id: row.projectId,
      name: row.projectName,
      role: row.role,
      openTaskCount: row.openTaskCount,
      taskCount: row.taskCount,
    });
  }
  return [...members.values()];
}
