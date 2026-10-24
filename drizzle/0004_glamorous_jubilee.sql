CREATE TYPE "public"."conversation_channel" AS ENUM('web', 'slack', 'google_chat');--> statement-breakpoint
CREATE TYPE "public"."dependency_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocked_task_id" uuid NOT NULL,
	"blocking_task_id" uuid,
	"blocking_user_id" uuid,
	"description" text NOT NULL,
	"waiting_on" text,
	"status" "dependency_status" DEFAULT 'open' NOT NULL,
	"source_journal_entry_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "channel" "conversation_channel" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "conversation_key" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "external_message_id" text;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocked_task_id_tasks_id_fk" FOREIGN KEY ("blocked_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocking_task_id_tasks_id_fk" FOREIGN KEY ("blocking_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocking_user_id_users_id_fk" FOREIGN KEY ("blocking_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_source_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("source_journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_dependencies_blocked_idx" ON "task_dependencies" USING btree ("blocked_task_id","status");--> statement-breakpoint
CREATE INDEX "task_dependencies_blocking_user_idx" ON "task_dependencies" USING btree ("blocking_user_id","status");--> statement-breakpoint
CREATE INDEX "journal_channel_external_idx" ON "journal_entries" USING btree ("channel","external_message_id");