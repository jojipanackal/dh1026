import { describe, expect, it } from "vitest";

import { diffTask } from "@/lib/tasks/diff";

describe("diffTask", () => {
  it("returns only changed fields", () => {
    const before: Record<string, unknown> = {
      title: "A",
      status: "todo",
      assigneeId: null,
    };
    const after = { ...before, status: "done", assigneeId: "u1" };
    expect(diffTask(before, after, ["title", "status", "assigneeId"])).toEqual({
      status: { from: "todo", to: "done" },
      assigneeId: { from: null, to: "u1" },
    });
  });
  it("returns empty object when nothing changed", () => {
    const t: Record<string, unknown> = { title: "A" };
    expect(diffTask(t, { ...t }, ["title"])).toEqual({});
  });
});
