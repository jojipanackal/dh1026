"use client";

import { useActionState } from "react";

import {
  createProjectAction,
  type FormState,
} from "@/app/projects/actions";
import { FieldError, FormError } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createProjectAction,
    {},
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required maxLength={100} />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
        <FieldError message={state.fieldErrors?.description} />
      </div>
      <FormError message={state.error} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
