export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

const TERMINAL_STATUSES: readonly TaskStatus[] = ["done", "cancelled"];

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;

  if (from === "todo" || from === "in_progress") {
    return to === "todo" || to === "in_progress" || to === "blocked" || to === "done" || to === "cancelled";
  }
  if (from === "blocked") {
    return to === "todo" || to === "in_progress" || to === "done" || to === "cancelled";
  }
  // Terminal states can only be reopened to "todo".
  if (TERMINAL_STATUSES.includes(from)) {
    return to === "todo";
  }
  return false;
}

export function completedAtFor(
  prevStatus: TaskStatus,
  nextStatus: TaskStatus,
  prevCompletedAt: Date | null,
  now: Date,
): Date | null {
  if (nextStatus === "done" && prevStatus !== "done") return now;
  if (prevStatus === "done" && nextStatus !== "done") return null;
  return prevCompletedAt;
}
