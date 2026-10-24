import { Suspense } from "react";
import { SquareKanban } from "lucide-react";

import { TabNav } from "@/components/app-shell/app-nav";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserSwitcher } from "@/components/app-shell/user-switcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      <div className="flex h-12 items-center gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-md border bg-card">
            <SquareKanban className="size-3.5" />
          </span>
          <span className="hidden text-sm font-medium whitespace-nowrap sm:inline">
            Project Runner
          </span>
        </div>
        <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
        <Suspense>
          <UserSwitcher />
        </Suspense>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-2 min-h-[calc(100svh-3rem)] rounded-t-xl border border-b-0 bg-card">
        <Suspense>
          <TabNav />
        </Suspense>
        <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">{children}</main>
      </div>
    </div>
  );
}
