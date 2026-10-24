import { getServerEnv } from "@/lib/env";
import {
  formatTelegramReply,
  telegramMessage,
  telegramSubmissionKey,
  type TelegramUpdate,
  sendTelegramMessage,
} from "@/lib/agent/telegram";
import { receiveAgentMessage } from "@/server/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_DEFAULT_USER_ID) {
    return Response.json(
      { error: "Telegram is not configured" },
      { status: 503 },
    );
  }
  if (
    env.TELEGRAM_WEBHOOK_SECRET &&
    request.headers.get("x-telegram-bot-api-secret-token") !==
      env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = telegramMessage(update);
  if (!message) return Response.json({ ok: true, ignored: true });
  if (
    env.TELEGRAM_ALLOWED_CHAT_ID &&
    env.TELEGRAM_ALLOWED_CHAT_ID !== message.chatId
  ) {
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const entry = await receiveAgentMessage({
      userId: env.TELEGRAM_DEFAULT_USER_ID,
      body: message.body,
      submissionKey: telegramSubmissionKey(message.chatId, message.updateId),
      channel: "telegram",
      conversationKey: `telegram:${message.chatId}`,
      externalMessageId: message.updateId,
    });
    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      message.chatId,
      formatTelegramReply({
        status: entry.status,
        interpretation: entry.interpretation,
        interpretationError: entry.interpretationError,
      }),
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error(
      "Telegram webhook failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json({ error: "Telegram message handling failed" }, { status: 500 });
  }
}
