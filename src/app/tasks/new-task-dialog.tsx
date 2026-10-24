"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import {
  createGlobalTaskAction,
  type FormState,
} from "@/app/projects/actions";
import { FieldError, FormError } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TASK_PRIORITIES } from "@/lib/tasks/validation";

type ProjectOption = { id: string; name: string };
type MemberOption = { id: string; name: string };

export function GlobalNewTaskDialog({
  projects,
  membersByProject,
}: {
  projects: ProjectOption[];
  membersByProject: Record<string, MemberOption[]>;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [state, action, pending] = useActionState<FormState, FormData>(
    createGlobalTaskAction,
    {},
  );
  const prevState = useRef(state);
  const members = membersByProject[projectId] ?? [];

  useEffect(() => {
    if (state.success && state !== prevState.current) {
      setOpen(false);
      setFormKey((key) => key + 1);
    }
    prevState.current = state;
  }, [state]);

  if (projects.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Capture work in the right project. Use Agent when the scope needs a conversation first.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={action} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="global-projectId">Project</Label>
            <select
              id="global-projectId"
              name="projectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              required
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.projectId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="global-title">Title</Label>
            <Input id="global-title" name="title" required maxLength={200} />
            <FieldError message={state.fieldErrors?.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="global-description">Description</Label>
            <Textarea id="global-description" name="description" rows={2} />
            <FieldError message={state.fieldErrors?.description} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="global-priority">Priority</Label>
              <select
                id="global-priority"
                name="priority"
                defaultValue="medium"
                className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <FieldError message={state.fieldErrors?.priority} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="global-assigneeId">Assignee</Label>
              <select
                id="global-assigneeId"
                name="assigneeId"
                defaultValue=""
                className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <FieldError message={state.fieldErrors?.assigneeId} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="global-dueDate">Due date</Label>
              <Input id="global-dueDate" name="dueDate" type="date" />
              <FieldError message={state.fieldErrors?.dueDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="global-estimateHours">Estimate (hours)</Label>
              <Input
                id="global-estimateHours"
                name="estimateHours"
                type="number"
                min={0}
                max={1000}
              />
              <FieldError message={state.fieldErrors?.estimateHours} />
            </div>
          </div>
          <FormError message={state.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
