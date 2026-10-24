import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Page not found" />
      <EmptyState
        title="Nothing lives at this address"
        message="The page you requested does not exist."
      />
      <Button variant="outline" className="mt-4" asChild>
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
