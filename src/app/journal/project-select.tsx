"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProjectSelect({
  projects,
  selected,
}: {
  projects: { id: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  return (
    <Select
      value={selected}
      onValueChange={(v) => router.push(`/journal?projectId=${v}`)}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
