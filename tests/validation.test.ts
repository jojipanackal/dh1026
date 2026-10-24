import { describe, expect, it } from "vitest";

import {
  addMemberInput,
  createProjectInput,
  createTaskInput,
  updateTaskInput,
} from "@/lib/tasks/validation";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

describe("createProjectInput", () => {
  it("trims name and accepts optional description", () => {
    const parsed = createProjectInput.parse({
      name: "  My project  ",
      description: "",
    });
    expect(parsed.name).toBe("My project");
    expect(parsed.description).toBeUndefined();
  });
  it("rejects empty name", () => {
    expect(() => createProjectInput.parse({ name: "   " })).toThrow();
  });
});

describe("createTaskInput", () => {
  it("parses a minimal task with defaults", () => {
    const parsed = createTaskInput.parse({ title: "Task" });
    expect(parsed.priority).toBe("medium");
    expect(parsed.assigneeId).toBeUndefined();
    expect(parsed.estimateHours).toBeUndefined();
  });
  it("maps empty strings to null/undefined", () => {
    const parsed = createTaskInput.parse({
      title: "T",
      assigneeId: "",
      dueDate: "",
      estimateHours: "",
      description: "",
    });
    expect(parsed.assigneeId).toBeUndefined();
    expect(parsed.dueDate).toBeUndefined();
    expect(parsed.estimateHours).toBeUndefined();
    expect(parsed.description).toBeUndefined();
  });
  it("accepts a full task", () => {
    const parsed = createTaskInput.parse({
      title: "T",
      priority: "urgent",
      assigneeId: uuid,
      dueDate: "2026-11-01",
      estimateHours: "8",
    });
    expect(parsed.estimateHours).toBe(8);
    expect(parsed.dueDate).toBe("2026-11-01");
  });
  it("rejects invalid dates", () => {
    expect(() =>
      createTaskInput.parse({ title: "T", dueDate: "2026-02-31" }),
    ).toThrow();
    expect(() =>
      createTaskInput.parse({ title: "T", dueDate: "tomorrow" }),
    ).toThrow();
  });
  it("rejects out-of-range estimates and bad uuid", () => {
    expect(() =>
      createTaskInput.parse({ title: "T", estimateHours: "1001" }),
    ).toThrow();
    expect(() =>
      createTaskInput.parse({ title: "T", estimateHours: "-1" }),
    ).toThrow();
    expect(() =>
      createTaskInput.parse({ title: "T", assigneeId: "not-a-uuid" }),
    ).toThrow();
  });
});

describe("updateTaskInput / addMemberInput", () => {
  it("requires taskId and a valid status", () => {
    const parsed = updateTaskInput.parse({
      taskId: uuid,
      title: "T",
      status: "blocked",
    });
    expect(parsed.status).toBe("blocked");
    expect(() =>
      updateTaskInput.parse({ taskId: uuid, title: "T", status: "weird" }),
    ).toThrow();
  });
  it("defaults member role", () => {
    expect(addMemberInput.parse({ userId: uuid }).role).toBe("member");
  });
});
