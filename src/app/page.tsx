import { Suspense } from "react";
import { connection } from "next/server";

import { PageHeader } from "@/components/app-shell/page-header";
import { ErrorState } from "@/components/states/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          System status
          <Badge variant={database.ok ? "secondary" : "destructive"}>
            {database.ok ? "Healthy" : "Error"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Live check of the backing services this app depends on.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {database.ok ? (
          <p className="text-sm">
            Database connected{" "}
            <span className="text-muted-foreground">
              ({database.latencyMs} ms)
            </span>
          </p>
        ) : (
          <ErrorState title="Database unavailable" message={database.error} />
        )}
      </CardContent>
    </Card>
  );
}
