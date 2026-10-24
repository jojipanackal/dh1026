"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type ConversationItem = {
  id: string;
  name: string;
  excerpt: string;
  dateLabel: string | null;
};

export function ConversationsNav({
  items,
  defaultProjectId,
}: {
  items: ConversationItem[];
  defaultProjectId: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobile, setOpenMobile } = useSidebar();
  // /journal without a param shows the default project, so match that too.
  const selected =
    pathname === "/journal"
      ? (searchParams.get("projectId") ?? defaultProjectId)
      : null;

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/journal?projectId=${item.id}`}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
          className={cn(
            "rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            item.id === selected &&
              "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm">{item.name}</span>
            {item.dateLabel ? (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {item.dateLabel}
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.excerpt}
          </span>
        </Link>
      ))}
    </nav>
  );
}
