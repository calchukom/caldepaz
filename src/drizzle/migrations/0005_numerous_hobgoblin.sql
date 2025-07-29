CREATE TYPE "public"."maintenance_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"schedule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"maintenance_type" "maintenance_type" NOT NULL,
	"interval_type" varchar(20) NOT NULL,
	"interval_value" integer NOT NULL,
	"interval_unit" varchar(10) NOT NULL,
	"last_performed_date" timestamp,
	"last_performed_mileage" integer,
	"next_due_date" timestamp,
	"next_due_mileage" integer,
	"estimated_cost" numeric(10, 2),
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"description" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "maintenance_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "maintenance_type" SET DEFAULT 'routine'::text;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ALTER COLUMN "maintenance_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."maintenance_type";--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('routine', 'repair', 'inspection', 'upgrade', 'emergency', 'cleaning');--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "maintenance_type" SET DEFAULT 'routine'::"public"."maintenance_type";--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "maintenance_type" SET DATA TYPE "public"."maintenance_type" USING "maintenance_type"::"public"."maintenance_type";--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ALTER COLUMN "maintenance_type" SET DATA TYPE "public"."maintenance_type" USING "maintenance_type"::"public"."maintenance_type";--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "service_provider" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "technician_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "maintenance_records" ALTER COLUMN "completion_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "title" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "next_maintenance_date" timestamp;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "scheduled_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "completed_date" timestamp;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "status" "maintenance_status" DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "odometer" integer;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "labor_hours" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "warranty_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD COLUMN "performed_by" varchar(255);--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;