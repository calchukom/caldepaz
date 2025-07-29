import { db } from './db';
import { sql } from 'drizzle-orm';

async function runVehicleEnhancementMigration() {
    try {
        console.log('Running vehicle enhancement migration...');

        // Create vehicle_status enum if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
                    CREATE TYPE vehicle_status AS ENUM('available', 'rented', 'maintenance', 'out_of_service', 'reserved');
                    RAISE NOTICE 'Created vehicle_status enum';
                ELSE
                    RAISE NOTICE 'vehicle_status enum already exists';
                END IF;
            END $$;
        `);

        // Add location_id column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'location_id') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "location_id" uuid REFERENCES locations(location_id);
                    RAISE NOTICE 'Added location_id column';
                ELSE
                    RAISE NOTICE 'location_id column already exists';
                END IF;
            END $$;
        `);

        // Add status column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'status') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "status" vehicle_status DEFAULT 'available' NOT NULL;
                    RAISE NOTICE 'Added status column';
                ELSE
                    RAISE NOTICE 'status column already exists';
                END IF;
            END $$;
        `);

        // Add mileage column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'mileage') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "mileage" integer DEFAULT 0;
                    RAISE NOTICE 'Added mileage column';
                ELSE
                    RAISE NOTICE 'mileage column already exists';
                END IF;
            END $$;
        `);

        // Add last_service_date column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'last_service_date') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "last_service_date" timestamp;
                    RAISE NOTICE 'Added last_service_date column';
                ELSE
                    RAISE NOTICE 'last_service_date column already exists';
                END IF;
            END $$;
        `);

        // Add next_service_due column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'next_service_due') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "next_service_due" timestamp;
                    RAISE NOTICE 'Added next_service_due column';
                ELSE
                    RAISE NOTICE 'next_service_due column already exists';
                END IF;
            END $$;
        `);

        // Add insurance_expiry column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'insurance_expiry') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "insurance_expiry" timestamp;
                    RAISE NOTICE 'Added insurance_expiry column';
                ELSE
                    RAISE NOTICE 'insurance_expiry column already exists';
                END IF;
            END $$;
        `);

        // Add registration_expiry column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'registration_expiry') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "registration_expiry" timestamp;
                    RAISE NOTICE 'Added registration_expiry column';
                ELSE
                    RAISE NOTICE 'registration_expiry column already exists';
                END IF;
            END $$;
        `);

        // Add images column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'images') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "images" text[];
                    RAISE NOTICE 'Added images column';
                ELSE
                    RAISE NOTICE 'images column already exists';
                END IF;
            END $$;
        `);

        // Add notes column if it doesn't exist
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'vehicles' AND column_name = 'notes') THEN
                    ALTER TABLE "vehicles" ADD COLUMN "notes" text;
                    RAISE NOTICE 'Added notes column';
                ELSE
                    RAISE NOTICE 'notes column already exists';
                END IF;
            END $$;
        `);

        console.log('✅ Vehicle enhancement migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

runVehicleEnhancementMigration();
