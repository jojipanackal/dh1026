import { createHash } from "node:crypto";

import type { Resolved } from "@/lib/journal/resolve";

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number | string };
  };
};

export function telegramMessage(update: TelegramUpdate) {
  const message = update.message;
  if (!message?.text?.trim() || message.chat?.id === undefined) return null;
  if (update.update_id === undefined) return null;
  return {
    updateId: String(update.update_id),
    chatId: String(message.chat.id),
    body: message.text.trim(),
  };
}

/** Stable UUID for Telegram retries; the external message id is also checked. */
export function telegramSubmissionKey(chatId: string, updateId: string) {
  const hex = createHash("sha256")
    .update(`jeera:telegram:${chatId}:${updateId}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function truncateTelegramText(text: string) {
  return text.length <= 3900 ? text : `${text.slice(0, 3890)}…`;
}

export function formatTelegramReply(entry: {
  status: string;
  interpretation: unknown;
  interpretationError: string | null;
}) {
  if (entry.status === "failed") {
    return truncateTelegramText(
      entry.interpretationError ?? "I could not interpret that update. Try rephrasing it.",
    );
  }
  const resolved = entry.interpretation as Resolved | null;
  if (!resolved) return "I saved that message, but I do not have a response yet.";

  const lines = [resolved.summary];
  if (resolved.answer?.kind === "task_list") {
    for (const task of resolved.answer.tasks) {
      const details = [
        task.status.replaceAll("_", " "),
        task.priority,
        task.dueDate ? `due ${task.dueDate}` : null,
      ].filter(Boolean);
      lines.push(`• ${task.title} (${details.join(", ")})`);
      if (task.lastUpdate) {
        lines.push(`  ${task.lastUpdate.authorName}: ${task.lastUpdate.body}`);
      }
      if (task.dependency) {
        lines.push(
          `  Waiting on ${task.dependency.blockingUserName ?? task.dependency.waitingOn ?? "an external dependency"}.`,
        );
      }
    }
  }
  if (resolved.clarifications.length > 0) {
    lines.push("\nI need one detail before creating this work:");
    lines.push(...resolved.clarifications.map((question) => `• ${question}`));
  }
  if (entry.status === "ready" && !resolved.answer) {
    lines.push(
      "\nI prepared a reviewable change. Open the Jeera web Agent to review and apply it.",
    );
  }
  return truncateTelegramText(lines.join("\n"));
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with HTTP ${response.status}`);
  }
}
