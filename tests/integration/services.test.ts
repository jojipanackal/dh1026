import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { activityEvents, taskDependencies, tasks } from "@/db/schema";
import { AppError } from "@/server/errors";
import {
  addProjectMember,
  createProject,
  getProjectForMember,
  listProjectsForUser,
} from "@/server/projects";
import {
  createTask,
  getTaskForMember,
  listTaskEdgesForUser,
  listTasks,
  listTasksForUser,
  moveTask,
  updateTask,
} from "@/server/tasks";
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
  it("lists a member's shared task queue with filters and assignee context", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const member = await insertUser("Member", "member@example.com");
    await addProjectMember(owner.id, project.id, {
      userId: member.id,
      role: "member",
    });
    const task = await createTask(owner.id, project.id, {
      title: "Wire signup form",
      description: "Connect the launch form",
      status: "blocked",
      priority: "high",
      assigneeId: member.id,
      dueDate: "2026-10-25",
      estimateHours: 2,
    });
    const blockingTask = await createTask(owner.id, project.id, {
      title: "Build page",
      description: null,
      status: "in_progress",
      priority: "urgent",
      assigneeId: owner.id,
      dueDate: null,
      estimateHours: 4,
    });
    await db.insert(taskDependencies).values({
      blockedTaskId: task.id,
      blockingTaskId: blockingTask.id,
      blockingUserId: owner.id,
      description: "The form needs the page shell first",
      waitingOn: "Owner",
      createdBy: owner.id,
    });
    const visible = await listTasksForUser(owner.id, { status: "blocked" });
    expect(visible).toHaveLength(1);
    expect(visible[0]).toMatchObject({
      id: task.id,
      projectName: "Demo Project",
      assigneeName: "Member",
      status: "blocked",
    });
    expect(await listTasksForUser(member.id, { scope: "mine" })).toHaveLength(1);
    expect(await listTasksForUser(owner.id, { search: "missing" })).toHaveLength(0);
    expect(await listTaskEdgesForUser(owner.id, [task.id, blockingTask.id])).toMatchObject([
      {
        blockedTaskId: task.id,
        blockingTaskId: blockingTask.id,
        waitingOn: "Owner",
      },
    ]);
  });

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

describe("moveTask", () => {
  const base = {
    title: "T",
    description: null,
    priority: "medium" as const,
    assigneeId: null,
    dueDate: null,
    estimateHours: null,
  };

  it("moves a task and records a single status-diff event", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, base);
    await moveTask(owner.id, task.id, "in_progress");
    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row.status).toBe("in_progress");
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.taskId, task.id));
    const update = events.find((e) => e.type === "task.updated");
    expect(update?.changes).toEqual({
      status: { from: "todo", to: "in_progress" },
    });
  });

  it("rejects done -> blocked and leaves the row unchanged", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, base);
    await moveTask(owner.id, task.id, "done");
    await expectAppError(moveTask(owner.id, task.id, "blocked"), "VALIDATION");
    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row.status).toBe("done");
  });

  it("gives NOT_FOUND for a non-member", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const outsider = await insertUser("Out", "out@example.com");
    const task = await createTask(owner.id, project.id, base);
    await expectAppError(
      moveTask(outsider.id, task.id, "in_progress"),
      "NOT_FOUND",
    );
  });

  it("moving to the same status creates no event", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const task = await createTask(owner.id, project.id, base);
    await moveTask(owner.id, task.id, "todo");
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.taskId, task.id));
    expect(events.filter((e) => e.type === "task.updated")).toHaveLength(0);
  });

  it("createTask accepts a starting status and listTasks filters work", async () => {
    const { owner, project } = await makeProjectWithOwner();
    const member = await insertUser("M", "m@example.com");
    await addProjectMember(owner.id, project.id, {
      userId: member.id,
      role: "member",
    });
    const t1 = await createTask(owner.id, project.id, {
      ...base,
      title: "blocked one",
      status: "blocked",
      assigneeId: member.id,
      priority: "urgent",
    });
    expect(t1.status).toBe("blocked");
    await createTask(owner.id, project.id, { ...base, title: "todo one" });
    await createTask(owner.id, project.id, {
      ...base,
      title: "unassigned high",
      priority: "urgent",
    });

    expect(
      (await listTasks(project.id, owner.id, { assigneeId: member.id })).map(
        (t) => t.title,
      ),
    ).toEqual(["blocked one"]);
    expect(
      (await listTasks(project.id, owner.id, { assigneeId: null })).map(
        (t) => t.title,
      ),
    ).toEqual(["unassigned high", "todo one"]);
    expect(
      (await listTasks(project.id, owner.id, { priority: "urgent" })).map(
        (t) => t.title,
      ),
    ).toEqual(["blocked one", "unassigned high"]);
  });
});
