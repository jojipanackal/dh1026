CREATE TYPE "public"."agent_message_type" AS ENUM('morning_briefing', 'follow_up');--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "conversation_channel" DEFAULT 'web' NOT NULL,
	"conversation_key" text DEFAULT 'web' NOT NULL,
	"type" "agent_message_type" NOT NULL,
	"dedupe_key" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "agent_messages_user_dedupe_unique" UNIQUE("user_id","dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completion_details" text;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_messages_user_created_idx" ON "agent_messages" USING btree ("user_id","created_at");