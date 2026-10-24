import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/states/empty-state";

export default function KnowledgePage() {
  return (
    <div>
      <PageHeader title="Knowledge" />
      <EmptyState
        title="Knowledge is not built yet"
        message="This feature is not implemented yet. It is scheduled for Phase 7 of the build plan."
      />
    </div>
  );
}
