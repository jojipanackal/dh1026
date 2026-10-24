import { z } from "zod";

import { TASK_STATUSES } from "@/lib/tasks/lifecycle";
import { TASK_PRIORITIES } from "@/lib/tasks/validation";

// Schema the model must return. Every field is required and uses null for
// "not applicable" because OpenAI strict structured outputs reject optional
// properties. Ids are plain strings here; they are checked against real
// project records in resolveInterpretation, never trusted directly.

const confidence = z.enum(["high", "medium", "low"]);

export const NEW_TASK_STATUSES = ["todo", "in_progress", "blocked"] as const;

export const aiTaskUpdate = z.object({
  taskId: z.string().describe("Id of an existing task from the provided task list"),
  status: z.enum(TASK_STATUSES).nullable().describe("New status, or null if unchanged"),
  priority: z.enum(TASK_PRIORITIES).nullable().describe("New priority, or null if unchanged"),
  assigneeId: z
    .string()
    .nullable()
    .describe("Member id to assign, or null if the assignee is unchanged"),
  reason: z.string().describe("Short quote or paraphrase from the entry that justifies this update"),
  confidence,
});

export const aiNewTask = z.object({
  projectId: z
    .string()
    .nullable()
    .describe("Id of a project from the PROJECTS list this task belongs to, or null when unclear"),
  title: z.string().describe("Concise task title, max 200 characters"),
  description: z.string().nullable(),
  status: z.enum(NEW_TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z.string().nullable().describe("Member id, or null if nobody was named"),
  reason: z.string().describe("Short quote or paraphrase from the entry that justifies this task"),
  confidence,
});

export const aiBlocker = z.object({
  taskId: z
    .string()
    .nullable()
    .describe("Id of the blocked existing task, or null if it is not a listed task"),
  description: z.string().describe("What is blocking progress, as stated by the author"),
  waitingOn: z
    .string()
    .nullable()
    .describe("Person, team, or thing the author is waiting on, if stated"),
});

export const aiDecision = z.object({
  title: z.string().describe("The decision that was made"),
  rationale: z
    .string()
    .nullable()
    .describe("Why, only if the author stated a reason; otherwise null"),
  relatedTaskId: z.string().nullable(),
});

export const aiInterpretation = z.object({
  summary: z.string().describe("One or two sentence summary of the entry"),
  taskUpdates: z.array(aiTaskUpdate),
  newTasks: z.array(aiNewTask),
  blockers: z.array(aiBlocker),
  decisions: z.array(aiDecision),
  clarifications: z
    .array(z.string())
    .describe("Questions to ask the author when something is ambiguous"),
});

export type AiInterpretation = z.infer<typeof aiInterpretation>;
