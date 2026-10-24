import { TASK_PRIORITIES, type TaskPriority } from "./validation";
import { TASK_STATUSES, type TaskStatus } from "./lifecycle";
import { isUuid } from "@/lib/ids";

export type ParsedTaskFilters = {
  status?: TaskStatus;
  assignee?: string | null; // undefined = no filter, null = unassigned
  priority?: TaskPriority;
};

export function parseTaskFilters(
  params: { status?: string; assignee?: string; priority?: string },
  memberIds: ReadonlySet<string>,
): ParsedTaskFilters {
  const filters: ParsedTaskFilters = {};

  if (
    params.status &&
    (TASK_STATUSES as readonly string[]).includes(params.status)
  ) {
    filters.status = params.status as TaskStatus;
  }

  if (params.assignee === "unassigned") {
    filters.assignee = null;
  } else if (
    params.assignee &&
    isUuid(params.assignee) &&
    memberIds.has(params.assignee)
  ) {
    filters.assignee = params.assignee;
  }

  if (
    params.priority &&
    (TASK_PRIORITIES as readonly string[]).includes(params.priority)
  ) {
    filters.priority = params.priority as TaskPriority;
  }

  return filters;
}
