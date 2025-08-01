import { migrate } from 'drizzle-orm/node-postgres/migrator';
import db, { pool } from './db';
import enhanceLocationsTable from './migrations/0011_enhance_locations_table';

async function main() {
    console.log('Running migrations...');

    // Check for specific migration args
    const args = process.argv.slice(2);
    const migrationArg = args.find(arg => arg.startsWith('--migration='));

    if (migrationArg) {
        const migrationName = migrationArg.split('=')[1];
        console.log(`Running specific migration: ${migrationName}`);

        try {
            if (migrationName === 'enhance-locations-table') {
                await enhanceLocationsTable(db);
                console.log('✅ Enhance locations table migration completed successfully!');
            } else {
                console.error(`❌ Unknown migration: ${migrationName}`);
                process.exit(1);
            }
        } catch (error) {
            console.error(`❌ Migration ${migrationName} failed:`, error);
            process.exit(1);
        }
    } else {
        // Run all migrations
        try {
            await migrate(db, { migrationsFolder: './src/drizzle/migrations' });
            console.log('✅ Migrations completed successfully!');
        } catch (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
    }

    // No need to close the pool for Neon serverless
    // await pool.end();
}

main();
