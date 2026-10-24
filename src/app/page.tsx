import { Suspense } from "react";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { ErrorState } from "@/components/states/error-state";
import { KeyValueList } from "@/components/key-value-list";
import { Skeleton } from "@/components/ui/skeleton";
import { checkDatabase } from "@/db/health";

export default function OverviewPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Project Runner turns natural-language journal updates into structured tasks, blockers, and project history."
      />
      <Suspense fallback={<Skeleton className="h-28 w-full max-w-xl" />}>
        <SystemStatus />
      </Suspense>
    </div>
  );
}

async function SystemStatus() {
  await connection();
  const database = await checkDatabase();

  return (
    <section className="max-w-xl rounded-lg border bg-card">
      <h2 className="border-b px-5 py-3 text-sm font-medium">System status</h2>
      <div className="px-5 py-4">
        {database.ok ? (
          <KeyValueList
            items={[
              {
                label: "Database",
                value: (
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ),
              },
              { label: "Latency", value: `${database.latencyMs} ms` },
            ]}
          />
        ) : (
          <ErrorState title="Database unavailable" message={database.error} />
        )}
      </div>
    </section>
  );
}
