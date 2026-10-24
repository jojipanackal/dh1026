import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-32 w-full max-w-xl" />
    </div>
  );
}
