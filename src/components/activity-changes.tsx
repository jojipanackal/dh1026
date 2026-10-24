import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/lifecycle";

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  assigneeId: "Assignee",
  dueDate: "Due date",
  estimateHours: "Estimate",
  member: "Member",
  role: "Role",
  name: "Name",
};

function formatValue(
  field: string,
  value: unknown,
  userNames: Map<string, string>,
): string {
  if (value === null || value === undefined) return "—";
  if (field === "status") {
    return TASK_STATUS_LABELS[value as TaskStatus] ?? String(value);
  }
  if (field === "assigneeId" || field === "member") {
    return userNames.get(String(value)) ?? "Unknown user";
  }
  if (field === "estimateHours") return `${value} h`;
  return String(value);
}

export function ActivityChanges({
  changes,
  userNames,
}: {
  changes: Record<string, { from: unknown; to: unknown }>;
  userNames: Map<string, string>;
}) {
  const entries = Object.entries(changes).filter(
    ([, change]) => !(change.from === null && change.to === null),
  );
  if (entries.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
      {entries.map(([field, change]) => (
        <li key={field}>
          <span className="font-medium text-foreground">
            {FIELD_LABELS[field] ?? field}
          </span>
          {change.from === null ? (
            <> set to {formatValue(field, change.to, userNames)}</>
          ) : (
            <>
              {" "}
              changed from {formatValue(field, change.from, userNames)} to{" "}
              {formatValue(field, change.to, userNames)}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
