import { db } from './db';
import { readFileSync } from 'fs';
import { sql } from 'drizzle-orm';

async function runPaymentMigration() {
    try {
        console.log('Running payment metadata migration...');

        // Add failure_reason column if it doesn't exist
        try {
            await db.execute(sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'payments' AND column_name = 'failure_reason') THEN
                ALTER TABLE "payments" ADD COLUMN "failure_reason" text;
            END IF;
        END $$;
      `);
            console.log('✅ Added failure_reason column');
        } catch (error) {
            console.log('ℹ️ failure_reason column may already exist:', (error as Error).message);
        }

        // Add metadata column if it doesn't exist  
        try {
            await db.execute(sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'payments' AND column_name = 'metadata') THEN
                ALTER TABLE "payments" ADD COLUMN "metadata" text;
            END IF;
        END $$;
      `);
            console.log('✅ Added metadata column');
        } catch (error) {
            console.log('ℹ️ metadata column may already exist:', (error as Error).message);
        }

        console.log('✅ Payment metadata migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

runPaymentMigration();
