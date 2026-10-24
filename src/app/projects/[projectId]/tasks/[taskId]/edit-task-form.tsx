"use client";

import { useActionState } from "react";

import { updateTaskAction, type FormState } from "@/app/projects/actions";
import { FieldError, FormError } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/tasks/lifecycle";
import { TASK_PRIORITIES } from "@/lib/tasks/validation";

export type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  status: (typeof TASK_STATUSES)[number];
  priority: (typeof TASK_PRIORITIES)[number];
  assigneeId: string | null;
  dueDate: string | null;
  estimateHours: number | null;
};

export function EditTaskForm({
  projectId,
  task,
  members,
}: {
  projectId: string;
  task: EditableTask;
  members: { userId: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateTaskAction.bind(null, projectId),
    {},
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="taskId" value={task.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={task.title}
        />
        <FieldError message={state.fieldErrors?.title} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={task.description ?? ""}
        />
        <FieldError message={state.fieldErrors?.description} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={task.status}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.fieldErrors?.status} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={task.priority}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.fieldErrors?.priority} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assigneeId">Assignee</Label>
          <Select name="assigneeId" defaultValue={task.assigneeId ?? ""}>
            <SelectTrigger id="assigneeId" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.fieldErrors?.assigneeId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={task.dueDate ?? ""}
          />
          <FieldError message={state.fieldErrors?.dueDate} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimateHours">Estimate (hours)</Label>
          <Input
            id="estimateHours"
            name="estimateHours"
            type="number"
            min={0}
            max={1000}
            defaultValue={task.estimateHours ?? ""}
          />
          <FieldError message={state.fieldErrors?.estimateHours} />
        </div>
      </div>
      <FormError message={state.error} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
