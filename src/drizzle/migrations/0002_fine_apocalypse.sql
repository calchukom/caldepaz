CREATE TYPE "public"."ticket_category" AS ENUM('booking', 'payment', 'vehicle', 'technical', 'general');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "priority" "ticket_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "category" "ticket_category" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;