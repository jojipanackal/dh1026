import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createProject, addProjectMember } from "@/server/projects";
import { createTask, moveTask } from "@/server/tasks";
import { listTeamForUser } from "@/server/team";
import { ensureTestDb, insertUser, truncateAll } from "./helpers";

beforeAll(ensureTestDb);
afterEach(truncateAll);

describe("listTeamForUser", () => {
  it("shows members and workload only from the viewer's projects", async () => {
    const owner = await insertUser("Owner", "owner@example.com");
    const teammate = await insertUser("Teammate", "teammate@example.com");
    const outsider = await insertUser("Outsider", "outsider@example.com");
    const project = await createProject(owner.id, { name: "Visible" });
    await addProjectMember(owner.id, project.id, {
      userId: teammate.id,
      role: "member",
    });
    const open = await createTask(owner.id, project.id, {
      title: "Open task",
      description: null,
      priority: "medium",
      assigneeId: teammate.id,
      dueDate: null,
      estimateHours: 2,
    });
    const done = await createTask(owner.id, project.id, {
      title: "Done task",
      description: null,
      priority: "low",
      assigneeId: teammate.id,
      dueDate: null,
      estimateHours: 1,
    });
    await moveTask(owner.id, done.id, "done");

    const team = await listTeamForUser(owner.id);
    expect(team.map((member) => member.name)).toEqual(["Owner", "Teammate"]);
    expect(team.some((member) => member.id === outsider.id)).toBe(false);
    const teammateCard = team.find((member) => member.id === teammate.id);
    expect(teammateCard?.projects[0]).toMatchObject({
      name: "Visible",
      openTaskCount: 1,
      taskCount: 2,
    });
    expect(open.id).toBeTruthy();
  });
});
