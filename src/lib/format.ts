export const DISPLAY_TIME_ZONE = "Asia/Kolkata";

// dateStyle/timeStyle cannot be combined with timeZoneName, so the
// zone abbreviation is included via explicit fields.
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: DISPLAY_TIME_ZONE,
  timeZoneName: "short",
});

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatDateTime(value: Date | string): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatDate(value: string | Date): string {
  const date =
    typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return dateFormat.format(date);
}

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: DISPLAY_TIME_ZONE,
  day: "numeric",
  month: "short",
});

// Sidebar-friendly day label: "Today", "Yesterday", or a short date.
export function formatRelativeDay(value: Date | string, now = new Date()): string {
  const dayKey = dayKeyFormat.format(new Date(value));
  if (dayKey === dayKeyFormat.format(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === dayKeyFormat.format(yesterday)) return "Yesterday";
  return dayLabelFormat.format(new Date(value));
}

export function dayKeyIst(value: Date | string): string {
  return dayKeyFormat.format(new Date(value));
}

