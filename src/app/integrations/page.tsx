import { connection } from "next/server";
import {
  ArrowUpRight,
  GitBranch,
  MessagesSquare,
  Send,
  Webhook,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerEnv } from "@/lib/env";

type IntegrationCardProps = {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: string;
  statusVariant: "default" | "secondary" | "outline";
  children: React.ReactNode;
};

function IntegrationCard({
  icon,
  name,
  description,
  status,
  statusVariant,
  children,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{name}</CardTitle>
              <Badge variant={statusVariant}>{status}</Badge>
            </div>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">{children}</CardContent>
    </Card>
  );
}

function Requirement({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
      <span>{children}</span>
    </li>
  );
}

export default async function IntegrationsPage() {
  await connection();
  const env = getServerEnv();
  const telegramConfigured = Boolean(
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_DEFAULT_USER_ID,
  );

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect the tools where your team already works."
      />

      <div className="mb-6 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        Integrations are transport adapters around the same Jeera agent. Task
        permissions, dependencies, evidence, and review rules stay consistent
        wherever a message comes from.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrationCard
          icon={<Send className="size-5" />}
          name="Telegram"
          description="Ask about work and send updates from a Telegram conversation."
          status={telegramConfigured ? "Configured" : "Setup required"}
          statusVariant={telegramConfigured ? "default" : "secondary"}
        >
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <Webhook className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Webhook</span>
            <code className="ml-auto font-mono">/api/telegram/webhook</code>
          </div>
          <ul className="flex flex-col gap-2">
            <Requirement>Set the bot token in server environment variables.</Requirement>
            <Requirement>Map the demo chat to a Jeera user.</Requirement>
            <Requirement>Expose the webhook through a public HTTPS URL.</Requirement>
          </ul>
          <a
            href="https://core.telegram.org/bots/api#setwebhook"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            Telegram webhook setup
            <ArrowUpRight className="size-3.5" />
          </a>
        </IntegrationCard>

        <IntegrationCard
          icon={<GitBranch className="size-5" />}
          name="GitHub"
          description="Bring pull requests, reviews, and deployment signals into execution context."
          status="Planned"
          statusVariant="outline"
        >
          <ul className="flex flex-col gap-2">
            <Requirement>Connect repositories and select event types.</Requirement>
            <Requirement>Record PR and review activity as team evidence.</Requirement>
            <Requirement>Let Jeera answer what changed without duplicating tasks.</Requirement>
          </ul>
          <p className="text-xs text-muted-foreground">
            GitHub will be added through the same normalized agent ingress.
          </p>
        </IntegrationCard>

        <IntegrationCard
          icon={<MessagesSquare className="size-5" />}
          name="Slack"
          description="Capture updates and answer questions in team channels."
          status="Planned"
          statusVariant="outline"
        >
          <p className="text-sm text-muted-foreground">
            OAuth, channel routing, and reply delivery are not connected yet.
          </p>
        </IntegrationCard>

        <IntegrationCard
          icon={<MessagesSquare className="size-5" />}
          name="Google Chat"
          description="Keep Google Workspace conversations connected to execution state."
          status="Planned"
          statusVariant="outline"
        >
          <p className="text-sm text-muted-foreground">
            Workspace authentication and Chat event delivery are not connected yet.
          </p>
        </IntegrationCard>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Integration principle</CardTitle>
          <CardDescription>
            Connect conversations, not separate task systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
          <Webhook className="mt-0.5 size-4 shrink-0 text-brand" />
          <p>
            Every connector should authenticate its event, map it to a Jeera
            identity, call the shared agent ingress, and send the response back
            to the same conversation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
