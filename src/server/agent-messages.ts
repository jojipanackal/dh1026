import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  agentMessages,
  journalEntries,
  projectMemberships,
  projects,
  taskDependencies,
  tasks,
  users,
  type ConversationChannel,
} from "@/db/schema";
import type {
  AgentMessagePayload,
  BriefingDependency,
  FollowUpPayload,
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

export const FOLLOW_UP_INTERVAL_MINUTES = 5;

type FollowUpTask = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: "in_progress" | "blocked";
  assigneeId: string;
  updatedAt: Date;
};

function minutesSince(date: Date, now: Date) {
  return Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60_000));
}

function ageLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Follow-up sweep for active work. It scans projects visible to the selected
 * user, but writes messages only to the assigned person. A five-minute bucket
 * makes repeated browser/worker/cron triggers idempotent.
 */
async function runFollowUpSweepForProjects(projectIds: string[], now: Date) {
  if (projectIds.length === 0) return { created: 0 };

  const memberRows = await db
    .select({ userId: projectMemberships.userId, name: users.name })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .where(inArray(projectMemberships.projectId, projectIds));
  const memberNames = new Map(memberRows.map((member) => [member.userId, member.name]));
  const memberIds = [...memberNames.keys()];
  if (memberIds.length === 0) return { created: 0 };

  const tasksForFollowUp: FollowUpTask[] = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      projectName: projects.name,
      title: tasks.title,
      status: tasks.status,
      assigneeId: tasks.assigneeId,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        inArray(tasks.projectId, projectIds),
        inArray(tasks.assigneeId, memberIds),
        sql`${tasks.status} in ('in_progress', 'blocked')`,
      ),
    ) as FollowUpTask[];
  if (tasksForFollowUp.length === 0) return { created: 0 };

  const evidenceRows = await db
    .select({
      authorId: journalEntries.authorId,
      interpretation: journalEntries.interpretation,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(
      and(
        inArray(journalEntries.authorId, memberIds),
        inArray(journalEntries.status, ["ready", "applied"]),
      ),
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(300);
  const lastEvidence = new Map<string, Date>();
  for (const row of evidenceRows) {
    const interpretation = row.interpretation as {
      taskUpdates?: { taskId?: string }[];
      blockers?: { taskId?: string }[];
    } | null;
    const taskIds = [
      ...(interpretation?.taskUpdates ?? []).map((item) => item.taskId),
      ...(interpretation?.blockers ?? []).map((item) => item.taskId),
    ];
    for (const taskId of new Set(taskIds.filter((id): id is string => Boolean(id)))) {
      const key = `${row.authorId}:${taskId}`;
      if (!lastEvidence.has(key)) lastEvidence.set(key, row.createdAt);
    }
  }

  const taskIds = tasksForFollowUp.map((task) => task.id);
  const dependencyRows = await db
    .select({
      blockedTaskId: taskDependencies.blockedTaskId,
      waitingOn: taskDependencies.waitingOn,
      blockingUserName: users.name,
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
  const dependencyByTask = new Map<string, BriefingDependency>();
  for (const dependency of dependencyRows) {
    if (!dependencyByTask.has(dependency.blockedTaskId)) {
      dependencyByTask.set(dependency.blockedTaskId, {
        waitingOn: dependency.waitingOn,
        blockingUserName: dependency.blockingUserName,
      });
    }
  }

  const bucket = Math.floor(now.getTime() / (FOLLOW_UP_INTERVAL_MINUTES * 60_000));
  let created = 0;
  for (const task of tasksForFollowUp) {
    const evidenceAt = lastEvidence.get(`${task.assigneeId}:${task.id}`) ?? task.updatedAt;
    const minutes = minutesSince(evidenceAt, now);
    if (minutes < FOLLOW_UP_INTERVAL_MINUTES) continue;
    const recipientName = memberNames.get(task.assigneeId) ?? "there";
    const dependency = dependencyByTask.get(task.id) ?? null;
    const dependencyText = dependency
      ? ` It is still waiting on ${dependency.blockingUserName ?? dependency.waitingOn ?? "a dependency"}.`
      : "";
    const body = `Checking in, ${recipientName}: “${task.title}” has had no update for about ${ageLabel(minutes)}.${dependencyText} What changed, what is blocked, or is it ready to close?`;
    const payload: FollowUpPayload = {
      kind: "follow_up",
      taskId: task.id,
      projectId: task.projectId,
      projectName: task.projectName,
      taskTitle: task.title,
      recipientName,
      status: task.status,
      lastUpdatedAt: evidenceAt.toISOString(),
      minutesSinceUpdate: minutes,
      dependency,
    };
    const result = await db
      .insert(agentMessages)
      .values({
        userId: task.assigneeId,
        channel: "web",
        conversationKey: "web",
        type: "follow_up",
        dedupeKey: `follow-up:${task.assigneeId}:${task.id}:${bucket}`,
        body,
        payload,
      })
      .onConflictDoNothing({
        target: [agentMessages.userId, agentMessages.dedupeKey],
      })
      .returning({ id: agentMessages.id });
    if (result.length > 0) created++;
  }
  return { created };
}

export async function runTeamFollowUpSweep(userId: string, now = new Date()) {
  const projectRows = await db
    .select({ id: projects.id })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(eq(projectMemberships.userId, userId));
  const projectIds = projectRows.map((project) => project.id);
  return runFollowUpSweepForProjects(projectIds, now);
}

export async function runGlobalFollowUpSweep(now = new Date()) {
  const rows = await db
    .select({ projectId: projectMemberships.projectId })
    .from(projectMemberships);
  const projectIds = [...new Set(rows.map((row) => row.projectId))];
  return runFollowUpSweepForProjects(projectIds, now);
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
