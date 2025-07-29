import "dotenv/config";
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
import { logger } from "../middleware/logger";

// Database connection state
let isDbConnected = false;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Initialize the Neon client using the DATABASE_URL from .env
let sql: any = null;
let db: any = null;

// Initialize database connection with retry logic
const initializeDatabase = async (): Promise<boolean> => {
    // Skip database initialization if no DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
        logger.info('💡 No DATABASE_URL provided - running without database connection');
        logger.info('💡 Database-dependent endpoints will return appropriate error responses');
        logger.debug('To enable database connection:');
        logger.debug('  1. Create a .env file in the project root');
        logger.debug('  2. Add DATABASE_URL=postgresql://username:password@localhost:5432/database_name');
        logger.debug('  3. For Neon: Add your Neon database URL');
        isDbConnected = false;
        return false;
    }

    try {
        // Initialize Neon client
        sql = neon(process.env.DATABASE_URL);

        // Create Drizzle instance with Neon HTTP driver
        db = drizzle(sql, {
            schema,
            logger: process.env.NODE_ENV !== 'production'
        });

        // Test database connection with a simple query
        await sql`SELECT 1 as test`;

        logger.info('✅ Neon database connection established successfully');
        isDbConnected = true;
        connectionRetryCount = 0;
        return true;
    } catch (error) {
        connectionRetryCount++;
        isDbConnected = false;

        // Log detailed error information for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (connectionRetryCount === 1) {
            logger.warn('⚠️  Neon database connection failed. Attempting to retry...');
            logger.debug('Database connection error details:', {
                error: errorMessage,
                databaseUrl: process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set',
                isNeonUrl: process.env.DATABASE_URL?.includes('neon.tech') || false
            });
        } else if (connectionRetryCount <= MAX_RETRY_ATTEMPTS) {
            logger.debug(`Database connection retry ${connectionRetryCount}/${MAX_RETRY_ATTEMPTS}: ${errorMessage}`);
        }

        if (connectionRetryCount <= MAX_RETRY_ATTEMPTS) {
            // Retry with exponential backoff
            const retryDelay = Math.min(2000 * Math.pow(2, connectionRetryCount - 1), 15000);
            logger.debug(`Retrying Neon database connection in ${retryDelay}ms...`);
            setTimeout(() => initializeDatabase(), retryDelay);
        } else {
            logger.warn('❌ Neon database connection failed after maximum retry attempts.');
            logger.info('💡 Server will continue running without database connection.');
            logger.info('💡 Database-dependent endpoints will return appropriate error responses.');
            logger.debug('To fix Neon database connection:');
            logger.debug('  1. Verify your Neon database is active and not suspended');
            logger.debug('  2. Check your DATABASE_URL in .env file');
            logger.debug('  3. Ensure your Neon project has compute resources available');
            logger.debug('  4. Try connecting from Neon dashboard to test the connection');
        }
        return false;
    }
};

// Get database connection status
export const isDatabaseConnected = (): boolean => isDbConnected;

// Initialize the database connection (non-blocking)
initializeDatabase().catch((err) => {
    logger.debug('Neon database initialization completed with issues:', err.message);
});

// Export database instance - will be null until connection is established
export const getDb = () => db;
export default db;
export { db, sql };

// For backwards compatibility with pool-based code (though not needed with Neon HTTP)
export const pool = null;
export const closeDbPool = async (): Promise<void> => {
    try {
        logger.info('Closing Neon database connection');
        // Neon HTTP doesn't require explicit connection closing
        logger.info('Neon database connection closed');
    } catch (err) {
        logger.error('Error closing Neon database connection', err);
        throw err;
    }
};
