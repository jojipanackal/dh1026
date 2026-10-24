import { loadEnvConfig } from "@next/env";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  agentMessages,
  activityEvents,
  journalEntries,
  projectMemberships,
  projects,
  taskDependencies,
  tasks,
  users,
} from "../src/db/schema";

loadEnvConfig(process.cwd());

const DEMO_PROJECT_NAME = "Landing Page Launch — Execution Demo";
const LEGACY_DEMO_PROJECT_NAME = "Kochi Metro App — Execution Demo";

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
    title: "Write the landing page copy",
    description: "Write the headline, value proposition, and launch call to action.",
    status: "done",
    priority: "high",
    assigneeEmail: "jaice@example.com",
    dueDate: istDate(-1),
    estimateHours: 2,
    completionDetails: "Headline and call to action approved by the team and added to the launch doc.",
  },
  {
    title: "Build the landing page",
    description: "Build the single-page launch site with the approved copy.",
    status: "in_progress",
    priority: "urgent",
    assigneeEmail: "joji@example.com",
    dueDate: istDate(),
    estimateHours: 6,
  },
  {
    title: "Add the signup form",
    description: "Add the email signup form and connect it to the launch list.",
    status: "blocked",
    priority: "high",
    assigneeEmail: "george@example.com",
    dueDate: istDate(1),
    estimateHours: 3,
  },
  {
    title: "QA the landing page on staging",
    description: "Check the page on mobile and desktop, then report launch blockers.",
    status: "blocked",
    priority: "high",
    assigneeEmail: "vaishakh@example.com",
    dueDate: istDate(2),
    estimateHours: 2,
  },
  {
    title: "Publish the launch",
    description: "Publish the landing page after QA signs off and announce the launch.",
    status: "blocked",
    priority: "urgent",
    assigneeEmail: "joji@example.com",
    dueDate: istDate(3),
    estimateHours: 1,
  },
  {
    title: "Set up basic launch analytics",
    description: "Add page views and signup conversion tracking before launch.",
    status: "todo",
    priority: "medium",
    assigneeEmail: "george@example.com",
    dueDate: istDate(2),
    estimateHours: 2,
  },
  {
    title: "Run the accessibility pass",
    description: "Check keyboard navigation, contrast, focus states, and mobile tap targets.",
    status: "in_progress",
    priority: "high",
    assigneeEmail: "vaishakh@example.com",
    dueDate: istDate(),
    estimateHours: 2,
  },
  {
    title: "Validate analytics events",
    description: "Verify page-view and signup events in the analytics dashboard.",
    status: "blocked",
    priority: "high",
    assigneeEmail: "george@example.com",
    dueDate: istDate(3),
    estimateHours: 2,
  },
  {
    title: "Prepare the launch announcement",
    description: "Write the announcement and customer-facing launch notes after publishing.",
    status: "blocked",
    priority: "medium",
    assigneeEmail: "jaice@example.com",
    dueDate: istDate(3),
    estimateHours: 1,
  },
  {
    title: "Write the launch FAQ",
    description: "Document the signup flow, launch date, and common customer questions.",
    status: "done",
    priority: "low",
    assigneeEmail: "jaice@example.com",
    dueDate: istDate(-2),
    estimateHours: 2,
    completionDetails: "FAQ covers signup, launch timing, and the support escalation path.",
  },
];

const EVIDENCE = [
  {
    email: "jaice@example.com",
    body: "The landing page copy is done and approved. I handed the final headline and call to action to Joji.",
    taskTitle: "Write the landing page copy",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000001",
    minutesAgo: 20,
  },
  {
    email: "joji@example.com",
    body: "I am building the landing page with the approved copy. The page shell is in progress.",
    taskTitle: "Build the landing page",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000002",
    minutesAgo: 30,
  },
  {
    email: "joji@example.com",
    body: "I got pulled into a production issue. The landing page is still in progress; I will return to the page after that is handled.",
    taskTitle: "Build the landing page",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000011",
    minutesAgo: 15,
    contextNote: {
      kind: "pause",
      nextStep: "Resume the landing page",
      followUpInHours: 2,
    } as const,
  },
  {
    email: "george@example.com",
    body: "I am waiting on Joji's landing page before I can add the signup form.",
    taskTitle: "Add the signup form",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000003",
    minutesAgo: 40,
  },
  {
    email: "vaishakh@example.com",
    body: "I am ready to QA the landing page, but I am waiting for the signup form to land on staging.",
    taskTitle: "QA the landing page on staging",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000004",
    minutesAgo: 55,
  },
  {
    email: "vaishakh@example.com",
    body: "I am running the accessibility pass now. Keyboard navigation is mostly good; I am checking focus states and mobile tap targets.",
    taskTitle: "Run the accessibility pass",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000007",
    minutesAgo: 25,
  },
  {
    email: "george@example.com",
    body: "Analytics validation is waiting on the page-view and signup events being configured first.",
    taskTitle: "Validate analytics events",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000008",
    minutesAgo: 65,
  },
  {
    email: "jaice@example.com",
    body: "The launch announcement is drafted, but I am waiting for the page to publish before I can send it.",
    taskTitle: "Prepare the launch announcement",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000009",
    minutesAgo: 35,
  },
  {
    email: "jaice@example.com",
    body: "The launch FAQ is done and covers signup, timing, and the support escalation path.",
    taskTitle: "Write the launch FAQ",
    key: "4e8d2c5e-44d0-4e7e-9c5b-000000000010",
    minutesAgo: 80,
  },
];

const DEMO_DEPENDENCIES = [
  {
    blockedTaskTitle: "Add the signup form",
    blockingTaskTitle: "Build the landing page",
    blockingEmail: "joji@example.com",
    waitingOn: "Joji",
    description: "The signup form needs the landing page shell before it can be connected.",
  },
  {
    blockedTaskTitle: "QA the landing page on staging",
    blockingTaskTitle: "Add the signup form",
    blockingEmail: "george@example.com",
    waitingOn: "George",
    description: "QA needs the signup form on staging before the test pass can start.",
  },
  {
    blockedTaskTitle: "Publish the launch",
    blockingTaskTitle: "QA the landing page on staging",
    blockingEmail: "vaishakh@example.com",
    waitingOn: "Vaishakh",
    description: "Publishing waits for staging QA sign-off.",
  },
  {
    blockedTaskTitle: "Validate analytics events",
    blockingTaskTitle: "Set up basic launch analytics",
    blockingEmail: "george@example.com",
    waitingOn: "George",
    description: "Analytics validation needs the tracking events configured first.",
  },
  {
    blockedTaskTitle: "Prepare the launch announcement",
    blockingTaskTitle: "Publish the launch",
    blockingEmail: "joji@example.com",
    waitingOn: "Joji",
    description: "The announcement can go out after the launch is published.",
  },
] as const;

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
  contextNote?: {
    kind: "progress" | "pause" | "resume" | "handoff" | "context";
    nextStep: string | null;
    followUpInHours: number | null;
  },
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
          taskUpdates: contextNote ? [] : [{ taskId, taskTitle: "demo evidence", projectId }],
          newTasks: [],
          blockers: [],
          decisions: [],
          contextNotes: contextNote
            ? [{
                taskId,
                kind: contextNote.kind,
                note: body,
                nextStep: contextNote.nextStep,
                followUpInHours: contextNote.followUpInHours,
                confidence: "high",
              }]
            : [],
          clarifications: [],
          issues: [],
        },
        appliedChanges: {
          updatedTaskIds: contextNote ? [] : [taskId],
          createdTaskIds: [],
        },
        model: "demo-seed",
        createdAt,
        interpretedAt: createdAt,
        appliedAt: createdAt,
      })
      .returning()
  )[0];
}

async function ensureDemoQuestion(
  db: ReturnType<typeof drizzle>,
  authorId: string,
  body: string,
  submissionKey: string,
  createdAt: Date,
  interpretation: Record<string, unknown>,
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
        status: "ready",
        interpretation,
        model: "task-query",
        createdAt,
        interpretedAt: createdAt,
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
          inArray(projects.name, [DEMO_PROJECT_NAME, LEGACY_DEMO_PROJECT_NAME]),
          eq(projects.createdBy, owner.id),
        ),
      )
      .limit(1);
    let project =
      existingProject ??
      (
        await db
          .insert(projects)
          .values({
            name: DEMO_PROJECT_NAME,
            description:
              "A simple landing-page launch demo with connected work, handoffs, and a visible dependency chain.",
            createdBy: owner.id,
          })
          .returning()
      )[0];
    if (existingProject) {
      [project] = await db
        .update(projects)
        .set({
          name: DEMO_PROJECT_NAME,
          description:
            "A simple landing-page launch demo with connected work, handoffs, and a visible dependency chain.",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, project.id))
        .returning();
      await db.delete(activityEvents).where(eq(activityEvents.projectId, project.id));
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      const demoUserIds = [...demoUsers.values()].map((user) => user.id);
      await db
        .delete(journalEntries)
        .where(
          and(
            eq(journalEntries.model, "demo-seed"),
            inArray(journalEntries.authorId, demoUserIds),
          ),
        );
      await db
        .delete(agentMessages)
        .where(inArray(agentMessages.userId, demoUserIds));
    }
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

    for (const spec of DEMO_DEPENDENCIES) {
      const blockedTask = taskByTitle.get(spec.blockedTaskTitle)!;
      const blockingTask = taskByTitle.get(spec.blockingTaskTitle)!;
      const blockingUser = demoUsers.get(spec.blockingEmail)!;
      await db.insert(taskDependencies).values({
        blockedTaskId: blockedTask.id,
        blockingTaskId: blockingTask.id,
        blockingUserId: blockingUser.id,
        description: spec.description,
        waitingOn: spec.waitingOn,
        createdBy: owner.id,
      });
    }

    const evidenceByTask = new Map<string, typeof journalEntries.$inferSelect>();
    for (const evidence of EVIDENCE) {
      const author = demoUsers.get(evidence.email)!;
      const task = taskByTitle.get(evidence.taskTitle)!;
      const entry = await ensureEvidence(
        db,
        project.id,
        author.id,
        task.id,
        evidence.body,
        evidence.key,
        ago(evidence.minutesAgo),
        evidence.contextNote,
      );
      evidenceByTask.set(evidence.taskTitle, entry);
    }

    const dependencyByTaskTitle = new Map<string, (typeof DEMO_DEPENDENCIES)[number]>(
      DEMO_DEPENDENCIES.map((dependency) => [dependency.blockedTaskTitle, dependency]),
    );
    const answerItem = (taskTitle: string) => {
      const task = taskByTitle.get(taskTitle)!;
      const evidence = evidenceByTask.get(taskTitle);
      const dependency = dependencyByTaskTitle.get(taskTitle);
      const assignee = [...demoUsers.values()].find((user) => user.id === task.assigneeId);
      const contextNote = evidence
        ? (evidence.interpretation as {
            contextNotes?: { taskId?: string; kind?: string; nextStep?: string | null }[];
          } | null)?.contextNotes?.find((note) => note.taskId === task.id)
        : null;
      return {
        id: task.id,
        title: task.title,
        projectId: project.id,
        projectName: project.name,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assigneeName: assignee?.name ?? null,
        lastUpdate: evidence
          ? {
              authorId: evidence.authorId,
              authorName: assignee?.name ?? "Teammate",
              body: evidence.body,
              createdAt: evidence.createdAt.toISOString(),
              kind: contextNote?.kind,
              nextStep: contextNote?.nextStep,
            }
          : null,
        dependency: dependency
          ? {
              description: dependency.description,
              waitingOn: dependency.waitingOn,
              blockingUserName: dependency.waitingOn,
              createdAt: evidence?.createdAt.toISOString() ?? new Date().toISOString(),
            }
          : null,
      };
    };
    const baseInterpretation = (summary: string, tasksForAnswer: unknown[]) => ({
      summary,
      answer: {
        kind: "task_list",
        summary,
        targetName: "the team",
        tasks: tasksForAnswer,
      },
      taskUpdates: [],
      newTasks: [],
      blockers: [],
      decisions: [],
      clarifications: [],
      issues: [],
    });
    const joji = demoUsers.get("joji@example.com")!;
    await ensureDemoQuestion(
      db,
      joji.id,
      "What is George doing on the signup form?",
      "4e8d2c5e-44d0-4e7e-9c5b-000000000005",
      ago(12),
      {
        ...baseInterpretation(
          "George's signup form is blocked on Joji's landing page. His last update was recorded 40 minutes ago.",
          [answerItem("Add the signup form")],
        ),
        answer: {
          ...baseInterpretation("George's signup form is blocked on Joji's landing page.", [answerItem("Add the signup form")]).answer,
          targetName: "George",
        },
      },
    );
    await ensureDemoQuestion(
      db,
      joji.id,
      "What is blocked?",
      "4e8d2c5e-44d0-4e7e-9c5b-000000000006",
      ago(7),
      {
        ...baseInterpretation(
          "Five connected tasks are blocked across the launch chain: signup, QA, publishing, analytics validation, and the announcement.",
          [
            answerItem("Add the signup form"),
            answerItem("QA the landing page on staging"),
            answerItem("Publish the launch"),
            answerItem("Validate analytics events"),
            answerItem("Prepare the launch announcement"),
          ],
        ),
      },
    );

    console.log(`Demo ready: ${project.name}`);
    console.log(`Project id: ${project.id}`);
    console.log(`Members: ${[...demoUsers.values()].map((user) => user.name).join(", ")}`);
    console.log(`Tasks: ${DEMO_TASKS.length}; open dependency chain: ${DEMO_DEPENDENCIES.length}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
