import "server-only";

import type { ConversationChannel } from "@/db/schema";
import { submitJournalEntry } from "@/server/journal";

/**
 * Normalized ingress for every future agent channel.
 * Web chat uses the server action directly today; Slack and Google Chat
 * adapters can call this function after authenticating their webhook event.
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
