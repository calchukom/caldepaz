CREATE TYPE "public"."maintenance_type" AS ENUM('routine', 'repair', 'inspection', 'cleaning', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'mpesa', 'cash', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'rented', 'maintenance', 'out_of_service', 'reserved', 'damaged');--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE 'active' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'processing' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'support_agent';--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"maintenance_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"maintenance_type" "maintenance_type" DEFAULT 'routine' NOT NULL,
	"maintenance_date" timestamp NOT NULL,
	"description" text NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"service_provider" varchar(200),
	"technician_name" varchar(100),
	"parts_replaced" text,
	"mileage_at_service" integer,
	"next_service_mileage" integer,
	"completion_status" varchar(50) DEFAULT 'completed',
	"warranty_info" text,
	"attachments" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_images" (
	"image_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"alt" varchar(255),
	"caption" text,
	"is_primary" boolean DEFAULT false,
	"is_360" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_payment_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mpesa_receipt_number" varchar(255);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "status" "vehicle_status" DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "mileage" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "fuel_level" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "last_service_date" timestamp;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "next_service_due" timestamp;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "last_cleaned" timestamp;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "insurance_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "registration_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "acquisition_date" timestamp;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "acquisition_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "depreciation_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "condition_rating" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "gps_tracking_id" varchar(100);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "is_damaged" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "damage_description" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE no action ON UPDATE no action;