"use client";

import { useActionState } from "react";

import { addMemberAction, type FormState } from "@/app/projects/actions";
import { FieldError, FormError } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_ROLES } from "@/lib/tasks/validation";

export function AddMemberForm({
  projectId,
  candidates,
}: {
  projectId: string;
  candidates: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addMemberAction.bind(null, projectId),
    {},
  );

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Every user is already a member of this project.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userId">User</Label>
          <Select name="userId" required>
            <SelectTrigger id="userId" className="w-full">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.fieldErrors?.userId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Role</Label>
          <Select name="role" defaultValue="member">
            <SelectTrigger id="role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.fieldErrors?.role} />
        </div>
      </div>
      <FormError message={state.error} />
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </div>
    </form>
  );
}
