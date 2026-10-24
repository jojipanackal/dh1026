import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";

export default function TeamPage() {
  return (
    <div>
      <PageHeader title="Team" />
      <EmptyState
        title="Team is not built yet"
        message="This feature is not implemented yet. It is scheduled for Phase 5 of the build plan."
      />
    </div>
  );
}
