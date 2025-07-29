ALTER TABLE "vehicle_images" ADD COLUMN "cloudinary_public_id" varchar(255);--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD COLUMN "mime_type" varchar(100);