import { db } from './db';
import { sql } from 'drizzle-orm';

async function runUserRoleMigration() {
    try {
        console.log('Running user role migration to add support_agent...');

        // Add support_agent to the user_role enum
        await db.execute(sql`
            DO $$ 
            BEGIN
                -- Check if support_agent is not already in the enum
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'support_agent' 
                    AND enumtypid = (
                        SELECT oid FROM pg_type WHERE typname = 'user_role'
                    )
                ) THEN
                    ALTER TYPE user_role ADD VALUE 'support_agent';
                    RAISE NOTICE 'Added support_agent to user_role enum';
                ELSE
                    RAISE NOTICE 'support_agent already exists in user_role enum';
                END IF;
            END $$;
        `);

        console.log('✅ User role migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

runUserRoleMigration();
