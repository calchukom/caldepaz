import { sql } from 'drizzle-orm';
import { pgTable, varchar, decimal, text } from 'drizzle-orm/pg-core';
import { locations } from '../schema';
import { logger } from '../../middleware/logger';

/**
 * Migration to enhance locations table with additional columns for advanced functionality
 * - Adds city, state, country, postal_code for improved location filtering
 * - Adds email for contact information
 * - Adds latitude, longitude for map integration
 * - Adds operating_hours for business information
 */
export const enhanceLocationsTable = async (db: any) => {
    try {
        logger.info('Starting locations table enhancement migration');

        // First check if columns already exist to avoid errors
        const columnsResult = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'locations' AND 
            column_name IN ('city', 'state', 'country', 'postal_code', 'email', 'latitude', 'longitude', 'operating_hours')
        `);

        const existingColumns = columnsResult.rows.map((row: any) => row.column_name);

        // Add columns that don't exist yet
        if (!existingColumns.includes('city')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
        }

        if (!existingColumns.includes('state')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`);
        }

        if (!existingColumns.includes('country')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS country VARCHAR(100)`);
        }

        if (!existingColumns.includes('postal_code')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)`);
        }

        if (!existingColumns.includes('email')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
        }

        if (!existingColumns.includes('latitude')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,6)`);
        }

        if (!existingColumns.includes('longitude')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,6)`);
        }

        if (!existingColumns.includes('operating_hours')) {
            await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS operating_hours TEXT`);
        }

        // Update existing locations with dummy data for geocoding purposes if needed
        await db.execute(sql`
            UPDATE locations
            SET 
                city = 'Unknown',
                country = 'Unknown',
                latitude = 0,
                longitude = 0
            WHERE city IS NULL OR country IS NULL OR latitude IS NULL OR longitude IS NULL
        `);

        logger.info('Successfully completed locations table enhancement migration');
        return true;
    } catch (error) {
        logger.error('Error in enhanceLocationsTable migration', { error });
        throw error;
    }
};

export default enhanceLocationsTable;
