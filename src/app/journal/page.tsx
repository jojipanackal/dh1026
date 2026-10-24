import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";

export default function JournalPage() {
  return (
    <div>
      <PageHeader title="Journal" />
      <EmptyState
        title="Journal is not built yet"
        message="This feature is not implemented yet. It is scheduled for Phase 3 of the build plan."
      />
    </div>
  );
}
