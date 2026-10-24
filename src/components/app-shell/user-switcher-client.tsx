"use client";

import { CircleUserRound } from "lucide-react";
import { useTransition } from "react";

import { setDemoUser } from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function UserSwitcherClient({
  users,
  currentUserId,
}: {
  users: { id: string; name: string }[];
  currentUserId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const current = users.find((u) => u.id === currentUserId);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none">
      <Select
        value={currentUserId ?? ""}
        disabled={pending}
        onValueChange={(value) => {
          startTransition(async () => {
            await setDemoUser(value);
          });
        }}
      >
        <SelectTrigger
          className="h-7 w-auto min-w-0 flex-1 gap-1.5 rounded-md border-transparent bg-transparent px-2 text-sm shadow-none hover:bg-muted group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>svg]:hidden"
          size="sm"
        >
          {current ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-brand-foreground">
              {initial(current.name)}
            </span>
          ) : (
            <CircleUserRound className="size-4 text-muted-foreground" />
          )}
          <span className="group-data-[collapsible=icon]:hidden">
            <SelectValue placeholder="Pick a demo user" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
