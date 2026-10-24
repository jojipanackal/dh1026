"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import {
  submitJournalAction,
  type JournalFormState,
} from "@/app/journal/actions";
import { FormError } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function JournalComposer({
  projects,
  defaultProjectId,
}: {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [state, formAction, pending] = useActionState<
    JournalFormState & { entryId?: string },
    FormData
  >(async (prev, formData) => {
    const result = await submitJournalAction(prev, formData);
    if (result.entryId) {
      setSubmissionKey(crypto.randomUUID());
      router.push(`/journal/${result.entryId}`);
    }
    return result;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="submissionKey" value={submissionKey} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project">Project</Label>
        <Select value={projectId} onValueChange={setProjectId} required>
          <SelectTrigger id="project" className="w-full sm:w-72">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">Journal update</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={6}
          maxLength={5000}
          placeholder="What did you work on? Anything blocked, decided, or planned?"
        />
      </div>
      <FormError message={state.error} />
      <div>
        <Button type="submit" disabled={pending || !projectId}>
          {pending ? "Interpreting…" : "Submit update"}
        </Button>
      </div>
    </form>
  );
}
