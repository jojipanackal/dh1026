import "server-only";

import type { ConversationChannel } from "@/db/schema";
import { submitJournalEntry } from "@/server/journal";

/**
 * Normalized ingress for every future agent channel.
 * Web chat uses the server action directly; external adapters call this
 * function after authenticating their webhook event. The Telegram Route
 * Handler is the first external adapter using this boundary.
 */
export async function receiveAgentMessage(input: {
  userId: string;
  body: string;
  submissionKey: string;
  channel: ConversationChannel;
  conversationKey: string;
  externalMessageId?: string;
}) {
  return submitJournalEntry(
    input.userId,
    {
      body: input.body,
      submissionKey: input.submissionKey,
    },
    {},
    {
      channel: input.channel,
      conversationKey: input.conversationKey,
      externalMessageId: input.externalMessageId,
    },
  );
}
