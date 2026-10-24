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
