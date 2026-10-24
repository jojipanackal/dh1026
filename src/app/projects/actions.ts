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
import { createTask, updateTask } from "@/server/tasks";

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
    });
    await createTask(user.id, projectId, input);
    revalidatePath(`/projects/${projectId}`);
    return {};
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
    });
    await updateTask(user.id, input);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/tasks/${input.taskId}`);
    return {};
  } catch (error) {
    return toFormState(error);
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
