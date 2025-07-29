import { migrate } from 'drizzle-orm/node-postgres/migrator';
import db, { pool } from './db';

async function main() {
    console.log('Running migrations...');

    try {
        await migrate(db, { migrationsFolder: './src/drizzle/migrations' });
        console.log('Migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        // await pool.end(); // Disabled for Neon - no pool connection needed
    }
}

main();
