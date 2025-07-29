CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fuel_type" AS ENUM('petrol', 'diesel', 'electric', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transmission" AS ENUM('manual', 'automatic', 'cvt');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vehicle_category" AS ENUM('four_wheeler', 'two_wheeler');--> statement-breakpoint
CREATE TABLE "bookings" (
	"booking_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"booking_date" timestamp NOT NULL,
	"return_date" timestamp NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"booking_status" "booking_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"location_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" text NOT NULL,
	"contact_phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_date" timestamp,
	"payment_method" varchar(50),
	"transaction_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"ticket_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstname" varchar(100) NOT NULL,
	"lastname" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"contact_phone" varchar(20),
	"address" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_specifications" (
	"vehicleSpec_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manufacturer" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"engine_capacity" varchar(50),
	"transmission" "transmission" NOT NULL,
	"seating_capacity" integer NOT NULL,
	"color" varchar(50),
	"features" text,
	"vehicle_category" "vehicle_category" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"vehicle_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicleSpec_id" uuid NOT NULL,
	"rental_rate" numeric(10, 2) NOT NULL,
	"availability" boolean DEFAULT true NOT NULL,
	"license_plate" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("booking_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicleSpec_id_vehicle_specifications_vehicleSpec_id_fk" FOREIGN KEY ("vehicleSpec_id") REFERENCES "public"."vehicle_specifications"("vehicleSpec_id") ON DELETE no action ON UPDATE no action;