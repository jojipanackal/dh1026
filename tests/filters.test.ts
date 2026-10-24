import { describe, expect, it } from "vitest";

import { parseTaskFilters } from "@/lib/tasks/filters";
import { createTaskInput } from "@/lib/tasks/validation";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const members = new Set([uuid]);

describe("createTaskInput status", () => {
  it("defaults to todo", () => {
    expect(createTaskInput.parse({ title: "T" }).status).toBe("todo");
  });
  it("accepts todo/in_progress/blocked", () => {
    for (const s of ["todo", "in_progress", "blocked"]) {
      expect(createTaskInput.parse({ title: "T", status: s }).status).toBe(s);
    }
  });
  it("rejects done/cancelled/invalid", () => {
    for (const s of ["done", "cancelled", "bogus"]) {
      expect(() => createTaskInput.parse({ title: "T", status: s })).toThrow();
    }
  });
});

describe("parseTaskFilters", () => {
  it("parses valid values", () => {
    expect(
      parseTaskFilters(
        { status: "blocked", assignee: uuid, priority: "high" },
        members,
      ),
    ).toEqual({ status: "blocked", assignee: uuid, priority: "high" });
  });
  it("maps 'unassigned' to null", () => {
    expect(parseTaskFilters({ assignee: "unassigned" }, members).assignee).toBeNull();
  });
  it("ignores invalid/foreign values", () => {
    expect(
      parseTaskFilters(
        {
          status: "weird",
          assignee: "00000000-0000-0000-0000-000000000000",
          priority: "mega",
        },
        members,
      ),
    ).toEqual({});
    expect(parseTaskFilters({ assignee: "not-a-uuid" }, members)).toEqual({});
  });
});
