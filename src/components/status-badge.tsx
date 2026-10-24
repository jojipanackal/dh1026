import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-brand/15 text-brand",
  blocked: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent font-normal", STATUS_STYLES[status])}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-muted text-foreground",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  urgent: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent font-normal",
        PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground",
      )}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}
