import { describe, expect, it } from "vitest";

import { answerTaskQuestion } from "@/lib/journal/answers";

const george = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";

const context = {
  authorId: george,
  authorName: "George",
  membersByProject: {
    project: [
      { id: george, name: "George" },
      { id: priya, name: "Priya" },
    ],
  },
  tasks: [
    {
      id: "task-urgent",
      title: "Fix the payment callback",
      projectId: "project",
      projectName: "Kochi Metro App",
      status: "todo" as const,
      priority: "urgent",
      dueDate: "2026-10-25",
      assigneeId: george,
      assigneeName: "George",
    },
    {
      id: "task-priya",
      title: "Review the signage copy",
      projectId: "project",
      projectName: "Kochi Metro App",
      status: "in_progress" as const,
      priority: "high",
      dueDate: null,
      assigneeId: priya,
      assigneeName: "Priya",
    },
    {
      id: "task-done",
      title: "Ship the landing page",
      projectId: "project",
      projectName: "Kochi Metro App",
      status: "done" as const,
      priority: "urgent",
      dueDate: null,
      assigneeId: george,
      assigneeName: "George",
    },
  ],
};

describe("answerTaskQuestion", () => {
  it("answers an assignee question with open tasks in priority order", () => {
    const answer = answerTaskQuestion(
      "Which tasks assigned to George should be prioritized for today?",
      context,
    );

    expect(answer?.targetName).toBe("George");
    expect(answer?.tasks.map((task) => task.id)).toEqual(["task-urgent"]);
    expect(answer?.summary).toContain("George's open tasks");
  });

  it("answers my-task questions without treating them as proposals", () => {
    const answer = answerTaskQuestion("What are my tasks for today?", context);

    expect(answer?.tasks).toHaveLength(1);
    expect(answer?.tasks[0]?.title).toBe("Fix the payment callback");
  });

  it("does not intercept journal updates", () => {
    expect(answerTaskQuestion("I finished the payment callback", context)).toBeNull();
  });

  it("filters the read-only answer when the user asks about blocked work", () => {
    const answer = answerTaskQuestion("Show blocked work", {
      ...context,
      tasks: [
        ...context.tasks,
        {
          ...context.tasks[0],
          id: "task-blocked",
          title: "Waiting on the vendor",
          status: "blocked" as const,
        },
      ],
    });

    expect(answer?.tasks.map((task) => task.id)).toEqual(["task-blocked"]);
  });

  it("keeps an explicit waiting-on dependency with a blocked task answer", () => {
    const answer = answerTaskQuestion("Show blocked work", {
      ...context,
      tasks: [
        {
          ...context.tasks[0],
          id: "task-blocked",
          title: "Waiting on staging",
          status: "blocked" as const,
          dependency: {
            description: "Waiting for staging verification",
            waitingOn: "staging",
            blockingUserName: "Priya",
            createdAt: "2026-10-25T01:30:00.000Z",
          },
        },
      ],
    });

    expect(answer?.tasks[0]?.dependency).toMatchObject({
      waitingOn: "staging",
      blockingUserName: "Priya",
    });
  });

  it("uses the named teammate's evidence when a task has multiple updates", () => {
    const answer = answerTaskQuestion("What is Priya doing on Fix the payment callback?", {
      ...context,
      tasks: [
        {
          ...context.tasks[0],
          evidence: [
            {
              authorId: george,
              authorName: "George",
              body: "I started the callback fix",
              createdAt: "2026-10-25T01:00:00.000Z",
            },
            {
              authorId: priya,
              authorName: "Priya",
              body: "I am testing the callback on staging",
              createdAt: "2026-10-25T00:30:00.000Z",
            },
          ],
        },
      ],
    });

    expect(answer?.tasks[0]?.lastUpdate).toMatchObject({
      authorId: priya,
      authorName: "Priya",
      body: "I am testing the callback on staging",
    });
  });
});
