"use client";

import { useActionState } from "react";

import {
  createTaskAction,
  type FormState,
} from "@/app/projects/actions";
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
import { TASK_PRIORITIES } from "@/lib/tasks/validation";

export function NewTaskForm({
  projectId,
  members,
}: {
  projectId: string;
  members: { userId: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createTaskAction.bind(null, projectId),
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} />
        <FieldError message={state.fieldErrors?.title} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
        <FieldError message={state.fieldErrors?.description} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="medium">
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
          <Select name="assigneeId" defaultValue="">
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
          <Input id="dueDate" name="dueDate" type="date" />
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
          />
          <FieldError message={state.fieldErrors?.estimateHours} />
        </div>
      </div>
      <FormError message={state.error} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
