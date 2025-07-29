import { db } from './db';
import { sql } from 'drizzle-orm';

async function runVehicleEnhancementMigration2() {
    try {
        console.log('Running vehicle enhancement migration phase 2...');

        // Create maintenance_type enum if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
                    CREATE TYPE maintenance_type AS ENUM('routine', 'repair', 'inspection', 'cleaning', 'emergency');
                    RAISE NOTICE 'Created maintenance_type enum';
                ELSE
                    RAISE NOTICE 'maintenance_type enum already exists';
                END IF;
            END $$;
        `);

        // Add fuel_level column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'fuel_level') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "fuel_level" integer DEFAULT 100;
                    RAISE NOTICE 'Added fuel_level column';
                ELSE
                    RAISE NOTICE 'fuel_level column already exists';
                END IF;
            END $$;
        `);

        // Add last_cleaned column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'last_cleaned') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "last_cleaned" timestamp;
                    RAISE NOTICE 'Added last_cleaned column';
                ELSE
                    RAISE NOTICE 'last_cleaned column already exists';
                END IF;
            END $$;
        `);

        // Add acquisition_date column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'acquisition_date') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "acquisition_date" timestamp;
                    RAISE NOTICE 'Added acquisition_date column';
                ELSE
                    RAISE NOTICE 'acquisition_date column already exists';
                END IF;
            END $$;
        `);

        // Add acquisition_cost column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'acquisition_cost') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "acquisition_cost" decimal(12,2);
                    RAISE NOTICE 'Added acquisition_cost column';
                ELSE
                    RAISE NOTICE 'acquisition_cost column already exists';
                END IF;
            END $$;
        `);

        // Add depreciation_rate column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'depreciation_rate') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "depreciation_rate" decimal(5,2);
                    RAISE NOTICE 'Added depreciation_rate column';
                ELSE
                    RAISE NOTICE 'depreciation_rate column already exists';
                END IF;
            END $$;
        `);

        // Add condition_rating column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'condition_rating') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "condition_rating" integer DEFAULT 10;
                    RAISE NOTICE 'Added condition_rating column';
                ELSE
                    RAISE NOTICE 'condition_rating column already exists';
                END IF;
            END $$;
        `);

        // Add gps_tracking_id column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'gps_tracking_id') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "gps_tracking_id" varchar(100);
                    RAISE NOTICE 'Added gps_tracking_id column';
                ELSE
                    RAISE NOTICE 'gps_tracking_id column already exists';
                END IF;
            END $$;
        `);

        // Add is_damaged column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'is_damaged') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "is_damaged" boolean DEFAULT false;
                    RAISE NOTICE 'Added is_damaged column';
                ELSE
                    RAISE NOTICE 'is_damaged column already exists';
                END IF;
            END $$;
        `);

        // Add damage_description column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'damage_description') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "damage_description" text;
                    RAISE NOTICE 'Added damage_description column';
                ELSE
                    RAISE NOTICE 'damage_description column already exists';
                END IF;
            END $$;
        `);

        // Create maintenance_records table if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                              WHERE table_name = 'maintenance_records') THEN
                    CREATE TABLE "maintenance_records" (
                        "maintenance_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                        "vehicle_id" uuid NOT NULL REFERENCES vehicles(vehicle_id),
                        "maintenance_type" maintenance_type DEFAULT 'routine' NOT NULL,
                        "maintenance_date" timestamp NOT NULL,
                        "description" text NOT NULL,
                        "cost" decimal(10,2) DEFAULT 0 NOT NULL,
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
                    RAISE NOTICE 'Created maintenance_records table';
                ELSE
                    RAISE NOTICE 'maintenance_records table already exists';
                END IF;
            END $$;
        `);

        console.log('✅ Vehicle enhancement migration phase 2 completed successfully');
    } catch (error) {
        console.error('❌ Migration phase 2 failed:', error);
    } finally {
        process.exit(0);
    }
}

runVehicleEnhancementMigration2();
