import {
  date,
  index,
  unique,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectRole = pgEnum("project_role", ["owner", "member"]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const activityType = pgEnum("activity_type", [
  "project.created",
  "member.added",
  "task.created",
  "task.updated",
]);

export const activitySource = pgEnum("activity_source", [
  "manual",
  "journal",
  "ai",
]);

export const journalStatus = pgEnum("journal_status", [
  "pending",
  "ready",
  "failed",
  "applied",
  "dismissed",
]);

export const conversationChannel = pgEnum("conversation_channel", [
  "web",
  "slack",
  "google_chat",
]);
export type ConversationChannel = (typeof conversationChannel.enumValues)[number];

export const dependencyStatus = pgEnum("dependency_status", [
  "open",
  "resolved",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectMemberships = pgTable(
  "project_memberships",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    priority: taskPriority("priority").notNull().default("medium"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date", { mode: "string" }),
    estimateHours: integer("estimate_hours"),
    completionDetails: text("completion_details"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_project_status_idx").on(table.projectId, table.status),
    index("tasks_assignee_idx").on(table.assigneeId),
  ],
);

export type ActivityChanges = Record<
  string,
  { from: unknown; to: unknown }
>;

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable: entries belong to the author, not a project. Each proposed
    // item resolves its own project during interpretation.
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    submissionKey: uuid("submission_key").notNull(),
    channel: conversationChannel("channel").notNull().default("web"),
    conversationKey: text("conversation_key").notNull().default("web"),
    externalMessageId: text("external_message_id"),
    status: journalStatus("status").notNull().default("pending"),
    interpretation: jsonb("interpretation"),
    interpretationError: text("interpretation_error"),
    model: text("model"),
    appliedChanges: jsonb("applied_changes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    interpretedAt: timestamp("interpreted_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (table) => [
    index("journal_project_created_idx").on(table.projectId, table.createdAt),
    // Idempotent submission retries: same key from the same author maps to
    // one entry.
    unique("journal_author_submission_unique").on(
      table.authorId,
      table.submissionKey,
    ),
    index("journal_channel_external_idx").on(
      table.channel,
      table.externalMessageId,
    ),
  ],
);

export const agentMessageType = pgEnum("agent_message_type", [
  "morning_briefing",
  "follow_up",
]);

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: conversationChannel("channel").notNull().default("web"),
    conversationKey: text("conversation_key").notNull().default("web"),
    type: agentMessageType("type").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    unique("agent_messages_user_dedupe_unique").on(
      table.userId,
      table.dedupeKey,
    ),
    index("agent_messages_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockedTaskId: uuid("blocked_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    blockingTaskId: uuid("blocking_task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    blockingUserId: uuid("blocking_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    waitingOn: text("waiting_on"),
    status: dependencyStatus("status").notNull().default("open"),
    sourceJournalEntryId: uuid("source_journal_entry_id").references(
      () => journalEntries.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("task_dependencies_blocked_idx").on(
      table.blockedTaskId,
      table.status,
    ),
    index("task_dependencies_blocking_user_idx").on(
      table.blockingUserId,
      table.status,
    ),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntries.id,
      { onDelete: "set null" },
    ),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    type: activityType("type").notNull(),
    changes: jsonb("changes").$type<ActivityChanges>().notNull().default({}),
    source: activitySource("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_project_created_idx").on(table.projectId, table.createdAt),
    index("activity_task_created_idx").on(table.taskId, table.createdAt),
  ],
);
