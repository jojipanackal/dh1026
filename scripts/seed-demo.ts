import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  activityEvents,
  journalEntries,
  projectMemberships,
  projects,
  taskDependencies,
  tasks,
  users,
} from "../src/db/schema";

loadEnvConfig(process.cwd());

const DEMO_PROJECT_NAME = "Kochi Metro App — Execution Demo";

const DEMO_USERS = [
  { name: "Joji", email: "joji@example.com" },
  { name: "George", email: "george@example.com" },
  { name: "Vaishakh", email: "vaishakh@example.com" },
  { name: "Jaice", email: "jaice@example.com" },
] as const;

function istDate(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60_000);
}

type DemoTask = {
  title: string;
  description: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeEmail: string;
  dueDate: string;
  estimateHours: number;
  completionDetails?: string;
};

const DEMO_TASKS: DemoTask[] = [
  {
    title: "Wire up QR ticket scanner",
    description: "Connect the mobile scanner to the ticket validation API.",
    status: "blocked",
    priority: "urgent",
    assigneeEmail: "joji@example.com",
    dueDate: istDate(1),
    estimateHours: 6,
  },
  {
    title: "Finalize ticket validation API",
    description: "Finish the validation contract and verify the endpoint on staging.",
    status: "in_progress",
    priority: "high",
    assigneeEmail: "george@example.com",
    dueDate: istDate(),
    estimateHours: 4,
  },
  {
    title: "Verify staging payment flow",
    description: "Run the payment smoke test and report any sandbox gateway failures.",
    status: "in_progress",
    priority: "high",
    assigneeEmail: "vaishakh@example.com",
    dueDate: istDate(),
    estimateHours: 3,
  },
  {
    title: "Prepare launch checklist",
    description: "Collect release checks, owners, rollback steps, and support contacts.",
    status: "todo",
    priority: "medium",
    assigneeEmail: "jaice@example.com",
    dueDate: istDate(3),
    estimateHours: 3,
  },
  {
    title: "Add offline station map cache",
    description: "Cache the station map so the app remains useful in low-connectivity areas.",
    status: "todo",
    priority: "medium",
    assigneeEmail: "joji@example.com",
    dueDate: istDate(5),
    estimateHours: 8,
  },
  {
    title: "Choose QR over NFC for beta",
    description: "Record the beta transport decision and communicate it to the team.",
    status: "done",
    priority: "high",
    assigneeEmail: "jaice@example.com",
    dueDate: istDate(-1),
    estimateHours: 1,
    completionDetails: "Compared device support and rollout risk; QR is the beta path and the decision was shared with the team.",
  },
];

const EVIDENCE = [
  {
    email: "george@example.com",
    body: "I am testing the ticket validation API on staging. I will hand it back to Joji after the smoke tests.",
    taskTitle: "Finalize ticket validation API",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000001",
    minutesAgo: 30,
  },
  {
    email: "vaishakh@example.com",
    body: "The payment flow is still in progress. I found a sandbox gateway timeout and am checking the retry path.",
    taskTitle: "Verify staging payment flow",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000002",
    minutesAgo: 90,
  },
  {
    email: "joji@example.com",
    body: "I am waiting on George's validation contract before I can finish the QR scanner integration.",
    taskTitle: "Wire up QR ticket scanner",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000003",
    minutesAgo: 45,
  },
];

async function findOrCreateUser(
  db: ReturnType<typeof drizzle>,
  user: (typeof DEMO_USERS)[number],
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(users).values(user).returning();
  return created;
}

async function findOrCreateTask(
  db: ReturnType<typeof drizzle>,
  projectId: string,
  ownerId: string,
  spec: DemoTask,
  assigneeId: string,
) {
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.title, spec.title)))
    .limit(1);
  const completedAt = spec.status === "done" ? existing?.completedAt ?? new Date() : null;
  const values = {
    projectId,
    title: spec.title,
    description: spec.description,
    status: spec.status,
    priority: spec.priority,
    assigneeId,
    dueDate: spec.dueDate,
    estimateHours: spec.estimateHours,
    completionDetails: spec.completionDetails ?? null,
    completedAt,
    updatedAt: existing?.updatedAt ?? new Date(),
  };
  if (existing) {
    const [updated] = await db
      .update(tasks)
      .set(values)
      .where(eq(tasks.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(tasks)
    .values({ ...values, createdBy: ownerId })
    .returning();
  await db.insert(activityEvents).values({
    projectId,
    taskId: created.id,
    actorId: ownerId,
    type: "task.created",
    changes: {
      title: { from: null, to: created.title },
      status: { from: null, to: created.status },
      priority: { from: null, to: created.priority },
      assigneeId: { from: null, to: created.assigneeId },
      dueDate: { from: null, to: created.dueDate },
      estimateHours: { from: null, to: created.estimateHours },
      completionDetails: { from: null, to: created.completionDetails },
    },
    source: "manual",
  });
  return created;
}

async function ensureEvidence(
  db: ReturnType<typeof drizzle>,
  projectId: string,
  authorId: string,
  taskId: string,
  body: string,
  submissionKey: string,
  createdAt: Date,
) {
  const [existing] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.authorId, authorId),
        eq(journalEntries.submissionKey, submissionKey),
      ),
    )
    .limit(1);
  if (existing) return existing;
  return (
    await db
      .insert(journalEntries)
      .values({
        projectId: null,
        authorId,
        body,
        submissionKey,
        channel: "web",
        conversationKey: "web",
        status: "applied",
        interpretation: {
          summary: body,
          answer: null,
          taskUpdates: [{ taskId, taskTitle: "demo evidence", projectId }],
          newTasks: [],
          blockers: [],
          decisions: [],
          clarifications: [],
          issues: [],
        },
        appliedChanges: { updatedTaskIds: [taskId], createdTaskIds: [] },
        model: "demo-seed",
        createdAt,
        interpretedAt: createdAt,
        appliedAt: createdAt,
      })
      .returning()
  )[0];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  try {
    const demoUsers = new Map<string, typeof users.$inferSelect>();
    for (const user of DEMO_USERS) {
      const row = await findOrCreateUser(db, user);
      demoUsers.set(user.email, row);
    }
    const owner = demoUsers.get("joji@example.com")!;

    const [existingProject] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.name, DEMO_PROJECT_NAME),
          eq(projects.createdBy, owner.id),
        ),
      )
      .limit(1);
    const project =
      existingProject ??
      (
        await db
          .insert(projects)
          .values({
            name: DEMO_PROJECT_NAME,
            description:
              "A realistic team delivery demo: QR ticketing, staging verification, dependencies, and accountable daily work.",
            createdBy: owner.id,
          })
          .returning()
      )[0];
    if (!existingProject) {
      await db.insert(projectMemberships).values({
        projectId: project.id,
        userId: owner.id,
        role: "owner",
      });
      await db.insert(activityEvents).values({
        projectId: project.id,
        actorId: owner.id,
        type: "project.created",
        changes: { name: { from: null, to: project.name } },
        source: "manual",
      });
    }

    for (const user of demoUsers.values()) {
      const [membership] = await db
        .select()
        .from(projectMemberships)
        .where(
          and(
            eq(projectMemberships.projectId, project.id),
            eq(projectMemberships.userId, user.id),
          ),
        )
        .limit(1);
      if (!membership) {
        await db.insert(projectMemberships).values({
          projectId: project.id,
          userId: user.id,
          role: user.id === owner.id ? "owner" : "member",
        });
      }
    }

    const taskByTitle = new Map<string, typeof tasks.$inferSelect>();
    for (const spec of DEMO_TASKS) {
      const assignee = demoUsers.get(spec.assigneeEmail)!;
      const task = await findOrCreateTask(
        db,
        project.id,
        owner.id,
        spec,
        assignee.id,
      );
      taskByTitle.set(task.title, task);
    }

    const blockedTask = taskByTitle.get("Wire up QR ticket scanner")!;
    const george = demoUsers.get("george@example.com")!;
    const [dependency] = await db
      .select()
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.blockedTaskId, blockedTask.id),
          eq(taskDependencies.status, "open"),
        ),
      )
      .limit(1);
    if (!dependency) {
      await db.insert(taskDependencies).values({
        blockedTaskId: blockedTask.id,
        blockingUserId: george.id,
        description: "The QR scanner needs the validation contract before integration can be finished.",
        waitingOn: "George",
        createdBy: owner.id,
      });
    }

    for (const evidence of EVIDENCE) {
      const author = demoUsers.get(evidence.email)!;
      const task = taskByTitle.get(evidence.taskTitle)!;
      await ensureEvidence(
        db,
        project.id,
        author.id,
        task.id,
        evidence.body,
        evidence.key,
        ago(evidence.minutesAgo),
      );
    }

    console.log(`Demo ready: ${project.name}`);
    console.log(`Project id: ${project.id}`);
    console.log(`Members: ${[...demoUsers.values()].map((user) => user.name).join(", ")}`);
    console.log(`Tasks: ${DEMO_TASKS.length}; open dependency: waiting on George`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
