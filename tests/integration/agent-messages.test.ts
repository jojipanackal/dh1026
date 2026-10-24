import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addProjectMember, createProject } from "@/server/projects";
import {
  listAgentMessages,
  runTeamFollowUpSweep,
} from "@/server/agent-messages";
import { createTask } from "@/server/tasks";
import { ensureTestDb, insertUser, truncateAll } from "./helpers";

beforeAll(ensureTestDb);
afterEach(truncateAll);

describe("runTeamFollowUpSweep", () => {
  it("checks stale active work for teammates and deduplicates a time bucket", async () => {
    const owner = await insertUser("Owner", "owner@example.com");
    const teammate = await insertUser("Teammate", "teammate@example.com");
    const project = await createProject(owner.id, { name: "Launch" });
    await addProjectMember(owner.id, project.id, {
      userId: teammate.id,
      role: "member",
    });
    const task = await createTask(owner.id, project.id, {
      title: "Build page",
      description: null,
      status: "in_progress",
      priority: "high",
      assigneeId: teammate.id,
      dueDate: null,
      estimateHours: 3,
    });
    const now = new Date("2026-10-25T12:00:00.000Z");
    await db
      .update(tasks)
      .set({ updatedAt: new Date("2026-10-25T11:45:00.000Z") })
      .where(eq(tasks.id, task.id));

    expect(await runTeamFollowUpSweep(owner.id, now)).toEqual({ created: 1 });
    const messages = await listAgentMessages(teammate.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe("follow_up");
    expect(messages[0].body).toContain("Build page");
    expect(messages[0].payload.kind).toBe("follow_up");
    expect(await runTeamFollowUpSweep(owner.id, now)).toEqual({ created: 0 });
  });
});
