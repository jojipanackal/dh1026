"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { moveTaskAction, type FormState } from "@/app/projects/actions";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/lifecycle";

export function TaskStatusMenu({
  projectId,
  taskId,
  status,
}: {
  projectId: string;
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    moveTaskAction.bind(null, projectId),
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) router.refresh();
  }, [router, state]);

  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={taskId} />
      <label className="sr-only" htmlFor={`task-status-${taskId}`}>
        Change task status
      </label>
      <select
        id={`task-status-${taskId}`}
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-7 max-w-32 rounded-md border bg-background px-2 text-xs outline-none transition-colors hover:bg-muted focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
      >
        {TASK_STATUSES.map((value) => (
          <option key={value} value={value}>
            {TASK_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
    </form>
  );
}
