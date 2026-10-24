import { describe, expect, it } from "vitest";

import {
  canTransition,
  completedAtFor,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";

const allowed: [TaskStatus, TaskStatus][] = [
  ["todo", "todo"],
  ["in_progress", "in_progress"],
  ["done", "done"],
  ["todo", "in_progress"],
  ["in_progress", "todo"],
  ["todo", "blocked"],
  ["in_progress", "blocked"],
  ["blocked", "todo"],
  ["blocked", "in_progress"],
  ["blocked", "done"],
  ["blocked", "cancelled"],
  ["todo", "done"],
  ["in_progress", "done"],
  ["todo", "cancelled"],
  ["in_progress", "cancelled"],
  ["done", "todo"],
  ["cancelled", "todo"],
];

const rejected: [TaskStatus, TaskStatus][] = [
  ["done", "in_progress"],
  ["done", "blocked"],
  ["done", "cancelled"],
  ["cancelled", "in_progress"],
  ["cancelled", "blocked"],
  ["cancelled", "done"],
];

describe("canTransition", () => {
  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });
  it.each(rejected)("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe("completedAtFor", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const earlier = new Date("2026-10-20T12:00:00Z");

  it("sets completedAt when entering done", () => {
    expect(completedAtFor("todo", "done", null, now)).toEqual(now);
  });
  it("clears completedAt when leaving done", () => {
    expect(completedAtFor("done", "todo", earlier, now)).toBeNull();
  });
  it("keeps completedAt for done -> done", () => {
    expect(completedAtFor("done", "done", earlier, now)).toEqual(earlier);
  });
  it("leaves null for non-done transitions", () => {
    expect(completedAtFor("todo", "in_progress", null, now)).toBeNull();
  });
});
