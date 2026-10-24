import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  agentMessages,
  projectMemberships,
  projects,
  taskDependencies,
  tasks,
  users,
  type ConversationChannel,
} from "@/db/schema";
import type {
  AgentMessagePayload,
  MorningBriefingPayload,
  MorningBriefingTask,
} from "@/lib/agent/messages";
import { todayIst } from "@/lib/dates";

export type AgentMessage = {
  id: string;
  type: "morning_briefing" | "follow_up";
  channel: ConversationChannel;
  body: string;
  payload: AgentMessagePayload;
  createdAt: Date;
};

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function toAgentMessage(row: typeof agentMessages.$inferSelect): AgentMessage {
  return {
    id: row.id,
    type: row.type,
    channel: row.channel,
    body: row.body,
    payload: row.payload as AgentMessagePayload,
    createdAt: row.createdAt,
  };
}

async function buildMorningBriefing(userId: string, date: string) {
  const projectRows = await db
    .select({ id: projects.id })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(eq(projectMemberships.userId, userId));
  const projectIds = projectRows.map((project) => project.id);

  const rows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            id: tasks.id,
            projectId: tasks.projectId,
            projectName: projects.name,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            estimateHours: tasks.estimateHours,
          })
          .from(tasks)
          .innerJoin(projects, eq(projects.id, tasks.projectId))
          .where(
            and(
              eq(tasks.assigneeId, userId),
              inArray(tasks.projectId, projectIds),
              sql`${tasks.status} <> 'done'`,
              sql`${tasks.status} <> 'cancelled'`,
            ),
          )
          .orderBy(asc(tasks.dueDate), desc(tasks.updatedAt));
  const taskIds = rows.map((task) => task.id);
  const dependencies =
    taskIds.length === 0
      ? []
      : await db
          .select({
            blockedTaskId: taskDependencies.blockedTaskId,
            waitingOn: taskDependencies.waitingOn,
            blockingUserName: users.name,
            createdAt: taskDependencies.createdAt,
          })
          .from(taskDependencies)
          .leftJoin(users, eq(users.id, taskDependencies.blockingUserId))
          .where(
            and(
              eq(taskDependencies.status, "open"),
              inArray(taskDependencies.blockedTaskId, taskIds),
            ),
          )
          .orderBy(desc(taskDependencies.createdAt));
  const dependencyByTask = new Map<string, (typeof dependencies)[number]>();
  for (const dependency of dependencies) {
    if (!dependencyByTask.has(dependency.blockedTaskId)) {
      dependencyByTask.set(dependency.blockedTaskId, dependency);
    }
  }

  const tasksForBriefing: MorningBriefingTask[] = rows
    .sort((a, b) => {
      const priority = priorityRank[a.priority] - priorityRank[b.priority];
      if (priority !== 0) return priority;
      if (a.dueDate === null && b.dueDate !== null) return 1;
      if (a.dueDate !== null && b.dueDate === null) return -1;
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    })
    .slice(0, 12)
    .map((task) => {
      const dependency = dependencyByTask.get(task.id);
      return {
        id: task.id,
        projectId: task.projectId,
        projectName: task.projectName,
        title: task.title,
        status: task.status as "todo" | "in_progress" | "blocked",
        priority: task.priority,
        dueDate: task.dueDate,
        estimateHours: task.estimateHours,
        dependency: dependency
          ? {
              waitingOn: dependency.waitingOn,
              blockingUserName: dependency.blockingUserName,
            }
          : null,
      };
    });
  const dueCount = rows.filter((task) => task.dueDate !== null && task.dueDate <= date).length;
  const blockedCount = rows.filter((task) => task.status === "blocked").length;
  const inProgressCount = rows.filter((task) => task.status === "in_progress").length;
  const openCount = rows.length;
  const payload: MorningBriefingPayload = {
    kind: "morning_briefing",
    date,
    openCount,
    blockedCount,
    inProgressCount,
    dueCount,
    tasks: tasksForBriefing,
  };
  const body = openCount
    ? `Daily briefing: you have ${openCount} open task${openCount === 1 ? "" : "s"}. ${blockedCount} blocked, ${inProgressCount} in progress, and ${dueCount} due today or overdue. Tell me what you will work on first and I’ll keep the plan current.`
    : `Daily briefing: you have no open tasks assigned to you. Tell me what you were asked to work on and I’ll capture the owner, scope, estimate, and target date before creating it.`;
  return { body, payload };
}

export async function ensureMorningBriefing(userId: string, now = new Date()) {
  const date = todayIst(now);
  const dedupeKey = `morning:${date}`;
  const { body, payload } = await buildMorningBriefing(userId, date);
  const [inserted] = await db
    .insert(agentMessages)
    .values({
      userId,
      channel: "web",
      conversationKey: "web",
      type: "morning_briefing",
      dedupeKey,
      body,
      payload,
    })
    .onConflictDoNothing({
      target: [agentMessages.userId, agentMessages.dedupeKey],
    })
    .returning();
  if (inserted) return toAgentMessage(inserted);
  const [existing] = await db
    .select()
    .from(agentMessages)
    .where(
      and(
        eq(agentMessages.userId, userId),
        eq(agentMessages.dedupeKey, dedupeKey),
      ),
    )
    .limit(1);
  return existing ? toAgentMessage(existing) : null;
}

export async function listAgentMessages(userId: string) {
  const rows = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.userId, userId))
    .orderBy(desc(agentMessages.createdAt))
    .limit(30);
  return rows.reverse().map(toAgentMessage);
}
