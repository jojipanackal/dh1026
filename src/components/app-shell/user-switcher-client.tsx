"use client";

import { Check, ChevronsUpDown, CircleUserRound } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { setDemoUser } from "@/app/actions";

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
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const current = users.find((u) => u.id === currentUserId);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={switcherRef}
      className="relative flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none"
    >
      <button
        type="button"
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="demo-user-menu"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-auto min-w-0 flex-1 items-center gap-2 rounded-md border border-transparent bg-transparent px-2 text-left text-sm shadow-none outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none">
          {current ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-brand-foreground">
              {initial(current.name)}
            </span>
          ) : (
            <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {current?.name ?? "Pick a demo user"}
          </span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </span>
      </button>

      {open ? (
        <div
          id="demo-user-menu"
          role="menu"
          aria-label="Choose demo user"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {users.map((user) => {
            const selected = user.id === currentUserId;
            return (
              <button
                key={user.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  startTransition(async () => {
                    await setDemoUser(user.id);
                  });
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                  {initial(user.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">{user.name}</span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
