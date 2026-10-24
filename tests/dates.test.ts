import { describe, expect, it } from "vitest";

import { isOverdue } from "@/lib/dates";

// 2026-10-24T18:00:00Z = 2026-10-24 23:30 IST — today in Asia/Kolkata is 10-24.
const now = new Date("2026-10-24T18:00:00Z");

describe("isOverdue", () => {
  it("is true for dates before today (IST)", () => {
    expect(isOverdue("2026-10-23", now)).toBe(true);
    expect(isOverdue("2026-10-20", now)).toBe(true);
  });
  it("is false for today and future dates (IST)", () => {
    expect(isOverdue("2026-10-24", now)).toBe(false);
    expect(isOverdue("2026-10-25", now)).toBe(false);
  });
  it("is false for null/undefined", () => {
    expect(isOverdue(null, now)).toBe(false);
    expect(isOverdue(undefined, now)).toBe(false);
  });
  it("respects the IST boundary", () => {
    // 2026-10-24T19:00:00Z is already 10-25 00:30 IST.
    const later = new Date("2026-10-24T19:00:00Z");
    expect(isOverdue("2026-10-24", later)).toBe(true);
  });
});
