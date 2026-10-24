import { describe, expect, it } from "vitest";

import { isUuid } from "@/lib/ids";

describe("isUuid", () => {
  it("accepts a valid uuid", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
  });
  it("rejects non-uuid strings", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("123e4567-e89b-42d3-a456-42661417400")).toBe(false);
  });
});
