CREATE TYPE "public"."journal_status" AS ENUM('pending', 'ready', 'failed', 'applied', 'dismissed');--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"submission_key" uuid NOT NULL,
	"status" "journal_status" DEFAULT 'pending' NOT NULL,
	"interpretation" jsonb,
	"interpretation_error" text,
	"model" text,
	"applied_changes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"interpreted_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	CONSTRAINT "journal_author_submission_unique" UNIQUE("author_id","submission_key")
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "journal_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_project_created_idx" ON "journal_entries" USING btree ("project_id","created_at");--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;