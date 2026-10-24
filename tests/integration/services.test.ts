import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { activityEvents, tasks } from "@/db/schema";
import { AppError } from "@/server/errors";
import {
  addProjectMember,
  createProject,
  getProjectForMember,
  listProjectsForUser,
} from "@/server/projects";
import { createTask, getTaskForMember, listTasks, updateTask } from "@/server/tasks";
import { ensureTestDb, insertUser, truncateAll } from "./helpers";

beforeEach(async () => {
  await ensureTestDb();
  await truncateAll();
});

async function makeProjectWithOwner() {
  const owner = await insertUser("Owner", "owner@example.com");
  const project = await createProject(owner.id, {
    name: "Demo Project",
    description: null,
  });
  return { owner, project };
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.unreachable(`expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe("projects", () => {
  it("createProject makes the creator owner and logs project.created", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const data = await getProjectForMember(project.id, owner.id);
    expect(data.role).toBe("owner");
    expect(data.members).toHaveLength(1);
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.projectId, project.id));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("project.created");
  });

  it("non-member cannot read the project or its tasks", async () => {
    const { project } = await makeProjectWithOwner();
    const outsider = await insertUser("Out", "out@example.com");
    await expectAppError(
      getProjectForMember(project.id, outsider.id),
      "NOT_FOUND",
    );
    await expectAppError(
      listTasks(project.id, outsider.id),
      "NOT_FOUND",
    );
    await expectAppError(
      createTask(outsider.id, project.id, {
        title: "T",
        description: null,
        priority: "medium",
        assigneeId: null,
        dueDate: null,
        estimateHours: null,
      }),
      "NOT_FOUND",
    );
  });

  it("listProjectsForUser returns only member projects", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const member = await insertUser("Member", "member@example.com");
    const other = await insertUser("Other", "other@example.com");
    await addProjectMember(owner.id, project.id, {
      userId: member.id,
      role: "member",
    });
    const otherProject = await createProject(other.id, {
      name: "Other project",
      description: null,
    });

    const memberProjects = await listProjectsForUser(member.id);
    expect(memberProjects.map((p) => p.id)).toEqual([project.id]);
    const otherProjects = await listProjectsForUser(other.id);
    expect(otherProjects.map((p) => p.id)).toEqual([otherProject.id]);
  });

  it("rejects non-uuid ids without touching the database", async () => {
    const { owner } = await makeProjectWithOwner();
    await expectAppError(getProjectForMember("abc", owner.id), "NOT_FOUND");
    await expectAppError(getTaskForMember("xyz", owner.id), "NOT_FOUND");
    await expectAppError(
      createTask(owner.id, "abc", {
        title: "T",
        description: null,
        priority: "medium",
        assigneeId: null,
        dueDate: null,
        estimateHours: null,
      }),
      "NOT_FOUND",
    );
  });

  it("only owners can add members; duplicates are conflicts", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const member = await insertUser("M", "m@example.com");
    const third = await insertUser("T", "t@example.com");

    await expectAppError(
      addProjectMember(member.id, project.id, {
        userId: third.id,
        role: "member",
      }),
      "NOT_FOUND",
    );
    await addProjectMember(owner.id, project.id, {
      userId: member.id,
      role: "member",
    });
    await expectAppError(
      addProjectMember(member.id, project.id, {
        userId: third.id,
        role: "member",
      }),
      "FORBIDDEN",
    );
    await expectAppError(
      addProjectMember(owner.id, project.id, {
        userId: member.id,
        role: "member",
      }),
      "CONFLICT",
    );
  });
});

describe("tasks", () => {
  it("rejects an assignee who is not a project member", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const outsider = await insertUser("Out", "out@example.com");
    await expectAppError(
      createTask(owner.id, project.id, {
        title: "T",
        description: null,
        priority: "medium",
        assigneeId: outsider.id,
        dueDate: null,
        estimateHours: null,
      }),
      "VALIDATION",
    );
  });

  it("records only changed fields in task.updated", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, {
      title: "Original",
      description: null,
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    await updateTask(owner.id, {
      taskId: task.id,
      title: "Original",
      description: null,
      status: "in_progress",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.taskId, task.id));
    const update = events.find((e) => e.type === "task.updated");
    expect(update?.changes).toEqual({
      status: { from: "todo", to: "in_progress" },
    });
  });

  it("a no-op update records no event", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, {
      title: "Same",
      description: null,
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    await updateTask(owner.id, {
      taskId: task.id,
      title: "Same",
      description: null,
      status: "todo",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.taskId, task.id));
    expect(events.filter((e) => e.type === "task.updated")).toHaveLength(0);
  });

  it("rejects done -> blocked and leaves the row unchanged", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, {
      title: "T",
      description: null,
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    await updateTask(owner.id, {
      taskId: task.id,
      title: "T",
      description: null,
      status: "done",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    await expectAppError(
      updateTask(owner.id, {
        taskId: task.id,
        title: "T",
        description: null,
        status: "blocked",
        priority: "medium",
        assigneeId: null,
        dueDate: null,
        estimateHours: null,
      }),
      "VALIDATION",
    );
    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row.status).toBe("done");
  });

  it("sets completed_at on done and clears it on reopen", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, {
      title: "T",
      description: null,
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    const done = await updateTask(owner.id, {
      taskId: task.id,
      title: "T",
      description: null,
      status: "done",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    expect(done.completedAt).not.toBeNull();
    const reopened = await updateTask(owner.id, {
      taskId: task.id,
      title: "T",
      description: null,
      status: "todo",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    expect(reopened.completedAt).toBeNull();
  });

  it("non-member cannot update a task", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const outsider = await insertUser("Out", "out@example.com");
    const task = await createTask(owner.id, project.id, {
      title: "T",
      description: null,
      priority: "medium",
      assigneeId: null,
      dueDate: null,
      estimateHours: null,
    });
    await expectAppError(
      updateTask(outsider.id, {
        taskId: task.id,
        title: "T",
        description: null,
        status: "done",
        priority: "medium",
        assigneeId: null,
        dueDate: null,
        estimateHours: null,
      }),
      "NOT_FOUND",
    );
  });
});
