"use client";

import { useTransition } from "react";

import { setDemoUser } from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserSwitcherClient({
  users,
  currentUserId,
}: {
  users: { id: string; name: string }[];
  currentUserId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="px-3" title="Demo identity — no authentication">
      <Select
        value={currentUserId ?? ""}
        disabled={pending}
        onValueChange={(value) => {
          startTransition(async () => {
            await setDemoUser(value);
          });
        }}
      >
        <SelectTrigger className="w-full" size="sm">
          <SelectValue placeholder="Pick a demo user" />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
        Demo identity — no authentication
      </p>
    </div>
  );
}
