import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";

export default function TasksPage() {
  return (
    <div>
      <PageHeader title="Tasks" />
      <EmptyState
        title="Tasks is not built yet"
        message="This feature is not implemented yet. It is scheduled for Phase 2 of the build plan."
      />
    </div>
  );
}
