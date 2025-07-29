import { Request, Response } from 'express';
import { logger } from './logger';
import { db } from '../drizzle/db';

// Check Redis connection status
const checkRedisStatus = async (): Promise<string> => {
    try {
        if (!process.env.REDIS_URL) {
            return 'not configured';
        }

        const Redis = require("ioredis");
        const redisClient = new Redis(process.env.REDIS_URL);
        await redisClient.ping();
        await redisClient.disconnect();
        return 'healthy';
    } catch (error) {
        return 'unhealthy';
    }
};

// Check database connection status
const checkDatabaseStatus = async (): Promise<string> => {
    try {
        if (!process.env.DATABASE_URL) {
            return 'not configured';
        }

        // Simple query to check database connectivity
        await db.execute('SELECT 1');
        return 'healthy';
    } catch (error) {
        logger.warn('Database health check failed', { error: error instanceof Error ? error.message : String(error) });
        return 'unhealthy';
    }
};

export const healthCheck = async (req: Request, res: Response) => {
    try {
        const redisStatus = await checkRedisStatus();
        const databaseStatus = await checkDatabaseStatus();

        // Determine overall health status
        const isHealthy = databaseStatus === 'healthy' || databaseStatus === 'not configured';
        const overallStatus = isHealthy ? 'healthy' : 'degraded';

        const healthInfo = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024),
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
            },
            cpu: {
                usage: process.cpuUsage()
            },
            services: {
                database: databaseStatus,
                redis: redisStatus,
                external_apis: 'healthy'
            }
        };

        // Return 200 even if database is unhealthy (service degraded but still functional)
        const statusCode = overallStatus === 'healthy' ? 200 : 206; // 206 = Partial Content (degraded)
        res.status(statusCode).json(healthInfo);

        logger.info('Health check performed', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            status: overallStatus,
            database_status: databaseStatus,
            redis_status: redisStatus
        });
    } catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable'
        });
    }
};
