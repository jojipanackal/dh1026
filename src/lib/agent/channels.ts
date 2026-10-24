import type { ConversationChannel } from "@/db/schema";

export type AgentChannel = ConversationChannel;

export const AGENT_CHANNELS: {
  id: AgentChannel;
  label: string;
  description: string;
  available: boolean;
}[] = [
  {
    id: "web",
    label: "Jeera web",
    description: "The full conversation and review workspace.",
    available: true,
  },
  {
    id: "slack",
    label: "Slack",
    description: "Capture updates and answer questions where the team chats.",
    available: false,
  },
  {
    id: "google_chat",
    label: "Google Chat",
    description: "A future channel for teams already using Google Workspace.",
    available: false,
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "A Telegram bot connected to the shared execution agent.",
    available: true,
  },
];

export function channelLabel(channel: AgentChannel): string {
  return AGENT_CHANNELS.find((item) => item.id === channel)?.label ?? channel;
}
