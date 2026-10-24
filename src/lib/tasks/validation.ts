import { z } from "zod";

import { TASK_STATUSES } from "./lifecycle";

export const PROJECT_ROLES = ["owner", "member"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max).optional().nullable(),
  );

const optionalUuid = z.preprocess(
  emptyToUndefined,
  z.uuid().optional().nullable(),
);

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
      message: "Date must be a real calendar date",
    })
    .refine((value) => {
      // Reject values like 2025-02-31 which Date.parse can silently roll over.
      const parsed = new Date(`${value}T00:00:00Z`);
      return parsed.toISOString().slice(0, 10) === value;
    }, "Date must be a real calendar date")
    .optional()
    .nullable(),
);

const optionalEstimate = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .int("Estimate must be a whole number")
    .min(0)
    .max(1000)
    .optional()
    .nullable(),
);

export const createProjectInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalText(2000),
});
export type CreateProjectInput = z.infer<typeof createProjectInput>;

const CREATABLE_STATUSES = ["todo", "in_progress", "blocked"] as const;

export const createTaskInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  status: z.enum(CREATABLE_STATUSES).default("todo"),
  description: optionalText(5000),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  assigneeId: optionalUuid,
  dueDate: optionalDate,
  estimateHours: optionalEstimate,
  completionDetails: optionalText(5000),
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const updateTaskInput = createTaskInput.extend({
  taskId: z.uuid(),
  status: z.enum(TASK_STATUSES),
});
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

export const addMemberInput = z.object({
  userId: z.uuid(),
  role: z.enum(PROJECT_ROLES).default("member"),
});
export type AddMemberInput = z.infer<typeof addMemberInput>;
