"use client";

import { SquareKanban } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";

// Collapsed (icon) mode shows only the logo; clicking it expands the sidebar.
export function CollapsedLogoButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      title="Expand sidebar (⌘B)"
      className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent"
    >
      <span className="flex size-6 items-center justify-center rounded-md border bg-card">
        <SquareKanban className="size-3.5" />
      </span>
      <span className="sr-only">Expand sidebar</span>
    </button>
  );
}
