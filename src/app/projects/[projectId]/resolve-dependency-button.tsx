"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { resolveDependencyAction } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";

export function ResolveDependencyButton({
  projectId,
  dependencyId,
}: {
  projectId: string;
  dependencyId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="mt-2 h-7 text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resolveDependencyAction(projectId, dependencyId);
          if (result.error) toast.error(result.error);
          else {
            toast.success("Dependency resolved; task resumed");
            router.refresh();
          }
        })
      }
    >
      <Check className="mr-1.5 size-3.5" />
      {pending ? "Resolving…" : "Resolve & resume"}
    </Button>
  );
}
