import { db } from './db';
import { sql } from 'drizzle-orm';
import { writeFileSync } from 'fs';

export async function backupDatabase() {
    console.log('📦 Creating database backup...');

    try {
        // Get all table names
        const tablesResult = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        console.log('📋 Found tables:', tablesResult);

        const backup = {
            timestamp: new Date().toISOString(),
            tables: {} as Record<string, any[]>
        };

        // Check if result is an array or has a rows property
        const tables = Array.isArray(tablesResult) ? tablesResult : tablesResult.rows || [];

        // Backup each table
        for (const table of tables) {
            const tableName = table.table_name;
            console.log(`📋 Backing up table: ${tableName}`);

            try {
                const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
                const data = Array.isArray(result) ? result : result.rows || [];
                backup.tables[tableName] = data;
                console.log(`✅ Backed up ${data.length} rows from ${tableName}`);
            } catch (error) {
                console.log(`⚠️  Could not backup table ${tableName}:`, error);
            }
        }

        // Save backup to file
        const backupFile = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        console.log(`✅ Database backup saved to: ${backupFile}`);
        return backupFile;

    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}

// Run backup if called directly
if (require.main === module) {
    backupDatabase()
        .then((backupFile) => {
            console.log(`🎉 Backup completed: ${backupFile}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Backup failed:', error);
            process.exit(1);
        });
}
