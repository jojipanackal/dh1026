import { describe, expect, it } from "vitest";

import {
  formatTelegramReply,
  telegramMessage,
  telegramSubmissionKey,
} from "@/lib/agent/telegram";

describe("Telegram adapter", () => {
  it("extracts text messages and ignores non-text updates", () => {
    expect(
      telegramMessage({
        update_id: 42,
        message: { chat: { id: 123 }, text: "  What is blocked? " },
      }),
    ).toEqual({ updateId: "42", chatId: "123", body: "What is blocked?" });
    expect(telegramMessage({ update_id: 43, message: { chat: { id: 123 } } })).toBeNull();
  });

  it("creates a stable UUID for Telegram retries", () => {
    const first = telegramSubmissionKey("123", "42");
    expect(first).toBe(telegramSubmissionKey("123", "42"));
    expect(first).not.toBe(telegramSubmissionKey("123", "43"));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("formats a task answer with evidence and dependency context", () => {
    expect(
      formatTelegramReply({
        status: "ready",
        interpretationError: null,
        interpretation: {
          summary: "Here is the current status.",
          answer: {
            kind: "task_list",
            tasks: [
              {
                id: "task",
                title: "Wire scanner",
                projectId: "project",
                projectName: "Demo",
                status: "blocked",
                priority: "urgent",
                dueDate: "2026-10-26",
                assigneeName: "Joji",
                lastUpdate: {
                  authorName: "Joji",
                  body: "Waiting on George",
                  createdAt: "2026-10-25T00:00:00.000Z",
                },
                dependency: {
                  description: "API contract",
                  waitingOn: "George",
                  blockingUserName: "George",
                  createdAt: "2026-10-25T00:00:00.000Z",
                },
              },
            ],
            targetName: "Joji",
            summary: "Here is the current status.",
          },
          taskUpdates: [],
          newTasks: [],
          blockers: [],
          decisions: [],
          clarifications: [],
          issues: [],
        },
      }),
    ).toContain("Waiting on George");
  });
});
