// Task due dates are plain YYYY-MM-DD strings. "Overdue" means strictly
// before today's date in the display time zone.
export function isOverdue(dueDate: string | null | undefined, now: Date): boolean {
  if (!dueDate) return false;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return dueDate < today;
}
