import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityEvents,
  projectMemberships,
  projects,
  tasks,
  users,
} from "@/db/schema";
import { isUuid } from "@/lib/ids";
import type { AddMemberInput, CreateProjectInput } from "@/lib/tasks/validation";
import { AppError } from "@/server/errors";

export async function listProjectsForUser(userId: string) {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      role: projectMemberships.role,
      createdAt: projects.createdAt,
      status: tasks.status,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(projectMemberships.userId, userId))
    .groupBy(projects.id, projectMemberships.role, tasks.status)
    .orderBy(projects.createdAt);

  const byId = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      role: string;
      counts: Record<string, number>;
      total: number;
    }
  >();
  for (const row of rows) {
    let entry = byId.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        name: row.name,
        description: row.description,
        role: row.role,
        counts: {},
        total: 0,
      };
      byId.set(row.id, entry);
    }
    if (row.status) {
      entry.counts[row.status] = row.taskCount;
      entry.total += row.taskCount;
    }
  }
  return [...byId.values()];
}

async function getMembership(projectId: string, userId: string) {
  if (!isUuid(projectId)) return null;
  const [membership] = await db
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
      ),
    )
    .limit(1);
  return membership ?? null;
}

export async function getProjectForMember(projectId: string, userId: string) {
  if (!isUuid(projectId)) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const membership = await getMembership(projectId, userId);
  if (!membership) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: projectMemberships.role,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .where(eq(projectMemberships.projectId, projectId));

  return { project, members, role: membership.role };
}

export async function createProject(userId: string, input: CreateProjectInput) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        description: input.description ?? null,
        createdBy: userId,
      })
      .returning();
    await tx.insert(projectMemberships).values({
      projectId: project.id,
      userId,
      role: "owner",
    });
    await tx.insert(activityEvents).values({
      projectId: project.id,
      actorId: userId,
      type: "project.created",
      changes: { name: { from: null, to: project.name } },
      source: "manual",
    });
    return project;
  });
}

export async function addProjectMember(
  actorId: string,
  projectId: string,
  input: AddMemberInput,
) {
  if (!isUuid(projectId)) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  return db.transaction(async (tx) => {
    const [actorMembership] = await tx
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, actorId),
        ),
      )
      .limit(1);
    if (!actorMembership) {
      throw new AppError("NOT_FOUND", "Project not found");
    }
    if (actorMembership.role !== "owner") {
      throw new AppError("FORBIDDEN", "Only project owners can add members");
    }
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (!user) {
      throw new AppError("VALIDATION", "That user does not exist");
    }
    const [existing] = await tx
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new AppError("CONFLICT", "That user is already a project member");
    }
    await tx.insert(projectMemberships).values({
      projectId,
      userId: input.userId,
      role: input.role,
    });
    await tx.insert(activityEvents).values({
      projectId,
      actorId,
      type: "member.added",
      changes: {
        member: { from: null, to: input.userId },
        role: { from: null, to: input.role },
      },
      source: "manual",
    });
    return user;
  });
}

export async function listUsersNotInProject(projectId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .leftJoin(
      projectMemberships,
      and(
        eq(projectMemberships.userId, users.id),
        eq(projectMemberships.projectId, projectId),
      ),
    )
    .where(isNull(projectMemberships.userId))
    .orderBy(users.name);
}

export { getMembership };
