"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addMemberInput,
  createProjectInput,
  createTaskInput,
  updateTaskInput,
} from "@/lib/tasks/validation";
import { AppError } from "@/server/errors";
import { requireCurrentUser } from "@/server/current-user";
import {
  addProjectMember,
  createProject,
} from "@/server/projects";
import { createTask, moveTask, updateTask } from "@/server/tasks";
import { resolveTaskDependency } from "@/server/dependencies";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function toFormState(error: unknown): FormState {
  if (error instanceof AppError) {
    return { error: error.message };
  }
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  throw error;
}

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    const input = createProjectInput.parse({
      name: text(formData, "name"),
      description: text(formData, "description"),
    });
    await createProject(user.id, input);
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return toFormState(error);
  }
}

export async function createTaskAction(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    const input = createTaskInput.parse({
      title: text(formData, "title"),
      description: text(formData, "description"),
      priority: text(formData, "priority") || "medium",
      assigneeId: text(formData, "assigneeId"),
      dueDate: text(formData, "dueDate"),
      estimateHours: text(formData, "estimateHours"),
      completionDetails: text(formData, "completionDetails"),
    });
    await createTask(user.id, projectId, input);
    revalidatePath(`/projects/${projectId}`);
    return {};
  } catch (error) {
    return toFormState(error);
  }
}

export async function createGlobalTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    const projectId = z.uuid().parse(text(formData, "projectId"));
    const input = createTaskInput.parse({
      title: text(formData, "title"),
      description: text(formData, "description"),
      priority: text(formData, "priority") || "medium",
      assigneeId: text(formData, "assigneeId"),
      dueDate: text(formData, "dueDate"),
      estimateHours: text(formData, "estimateHours"),
      completionDetails: text(formData, "completionDetails"),
    });
    await createTask(user.id, projectId, input);
    revalidatePath("/tasks");
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return toFormState(error);
  }
}

export async function updateTaskAction(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    const input = updateTaskInput.parse({
      taskId: text(formData, "taskId"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      status: text(formData, "status"),
      priority: text(formData, "priority") || "medium",
      assigneeId: text(formData, "assigneeId"),
      dueDate: text(formData, "dueDate"),
      estimateHours: text(formData, "estimateHours"),
      completionDetails: text(formData, "completionDetails"),
    });
    await updateTask(user.id, input);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/tasks/${input.taskId}`);
    return {};
  } catch (error) {
    return toFormState(error);
  }
}

const moveTaskSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(["todo", "in_progress", "blocked", "done", "cancelled"]),
});

export async function moveTaskAction(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    const input = moveTaskSchema.parse({
      taskId: text(formData, "taskId"),
      status: text(formData, "status"),
    });
    await moveTask(user.id, input.taskId, input.status);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return toFormState(error);
  }
}

export async function resolveDependencyAction(
  projectId: string,
  dependencyId: string,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    await resolveTaskDependency(user.id, projectId, dependencyId);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/journal");
    return { success: true };
  } catch (error) {
    return toFormState(error);
  }
}

const quickAddSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  status: z.enum(["todo", "in_progress", "blocked"]),
});

export async function quickAddTaskAction(
  projectId: string,
  title: string,
  status: "todo" | "in_progress" | "blocked",
): Promise<{ error?: string }> {
  try {
    const user = await requireCurrentUser();
    const input = quickAddSchema.parse({ title, status });
    await createTask(user.id, projectId, {
      title: input.title,
      status: input.status,
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
      description: null,
    });
    revalidatePath(`/projects/${projectId}`);
    return {};
  } catch (error) {
    if (error instanceof AppError || error instanceof z.ZodError) {
      return {
        error:
          error instanceof AppError
            ? error.message
            : (error.issues[0]?.message ?? "Invalid task"),
      };
    }
    throw error;
  }
}

export async function addMemberAction(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireCurrentUser();
    const input = addMemberInput.parse({
      userId: text(formData, "userId"),
      role: text(formData, "role") || "member",
    });
    await addProjectMember(user.id, projectId, input);
    revalidatePath(`/projects/${projectId}`);
    return {};
  } catch (error) {
    return toFormState(error);
  }
}
