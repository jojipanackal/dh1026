import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { SquareKanban } from "lucide-react";

import { AppNav } from "@/components/app-shell/app-nav";
import { CollapsedLogoButton } from "@/components/app-shell/collapsed-logo-button";
import { Conversations } from "@/components/app-shell/conversations";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserSwitcher } from "@/components/app-shell/user-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

function LogoChip() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-card">
      <SquareKanban className="size-3.5" />
    </span>
  );
}

function Shell({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:hidden">
              <Link
                href="/"
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1"
              >
                <LogoChip />
                <span className="truncate text-sm font-medium">
                  Project Runner
                </span>
              </Link>
              <SidebarTrigger />
            </div>
            <div className="hidden justify-center group-data-[collapsible=icon]:flex">
              <CollapsedLogoButton />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <Suspense>
                <AppNav />
              </Suspense>
            </SidebarGroup>
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>Conversations</SidebarGroupLabel>
              <Conversations />
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:justify-center">
              <UserSwitcher />
              <ThemeToggle className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          {/* Mobile top bar: the sidebar is an off-canvas drawer below md. */}
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b px-3 md:hidden">
            <SidebarTrigger />
            <LogoChip />
            <span className="text-sm font-medium">Project Runner</span>
          </div>
          <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

// Sidebar open/collapse state persists in the sidebar_state cookie (written
// client-side by SidebarProvider). Reading cookies() makes this component
// dynamic, so it sits behind a Suspense boundary; the fallback renders the
// same shell with the expanded default until the cookie value streams in.
async function ShellWithCookie({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  return (
    <Shell defaultOpen={store.get("sidebar_state")?.value !== "false"}>
      {children}
    </Shell>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Shell defaultOpen>{children}</Shell>}>
      <ShellWithCookie>{children}</ShellWithCookie>
    </Suspense>
  );
}
