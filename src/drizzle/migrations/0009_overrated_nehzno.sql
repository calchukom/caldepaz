ALTER TYPE "public"."payment_method" ADD VALUE 'credit_card';--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"message_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" "user_role" NOT NULL,
	"message" text NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"attachment_url" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_ticket_id_support_tickets_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;