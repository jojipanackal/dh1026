import { AppNav } from "@/components/app-shell/app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <header className="flex shrink-0 flex-col gap-3 border-b bg-card px-4 py-3 md:w-56 md:border-r md:border-b-0 md:py-6">
        <span className="px-3 text-base font-semibold tracking-tight">
          Project Runner
        </span>
        <AppNav />
      </header>
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
