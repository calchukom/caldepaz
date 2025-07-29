import { Router } from 'express';
import { performanceMonitor } from '../middleware/performance';
import { cacheService } from '../services/cache.service';
import { logger } from '../middleware/logger';

const router = Router();

/**
 * Get performance statistics
 * GET /dev/performance
 */
router.get('/performance', (req, res) => {
    try {
        const timeRange = parseInt(req.query.minutes as string) || 60;
        const stats = performanceMonitor.getStats(timeRange);
        const slowestEndpoints = performanceMonitor.getSlowestEndpoints(10);

        res.json({
            success: true,
            data: {
                overview: stats,
                slowestEndpoints,
                timeRange: `${timeRange} minutes`,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Error getting performance stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get performance statistics',
        });
    }
});

/**
 * Clear performance metrics
 * DELETE /dev/performance
 */
router.delete('/performance', (req, res) => {
    try {
        performanceMonitor.clearMetrics();
        res.json({
            success: true,
            message: 'Performance metrics cleared',
        });
    } catch (error) {
        logger.error('Error clearing performance metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear performance metrics',
        });
    }
});

/**
 * Export performance data
 * GET /dev/performance/export
 */
router.get('/performance/export', (req, res) => {
    try {
        const timeRange = parseInt(req.query.minutes as string) || 60;
        const metrics = performanceMonitor.exportMetrics(timeRange);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="performance-metrics-${new Date().toISOString()}.json"`);

        res.json({
            exportDate: new Date().toISOString(),
            timeRangeMinutes: timeRange,
            totalMetrics: metrics.length,
            metrics,
        });
    } catch (error) {
        logger.error('Error exporting performance metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export performance metrics',
        });
    }
});

/**
 * Get cache statistics
 * GET /dev/cache
 */
router.get('/cache', async (req, res) => {
    try {
        // Try to get some cache statistics
        const testKey = 'cache_test';
        const testData = { test: true, timestamp: Date.now() };

        // Test cache set/get
        const startTime = Date.now();
        await cacheService.set(testKey, testData, 60);
        const cached = await cacheService.get(testKey);
        const cacheTestTime = Date.now() - startTime;

        // Clean up test data
        await cacheService.delete(testKey);

        res.json({
            success: true,
            data: {
                cacheWorking: !!cached,
                cacheTestTime: `${cacheTestTime}ms`,
                cacheType: process.env.REDIS_HOST ? 'Redis' : 'Memory',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Error getting cache stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cache statistics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * Clear cache
 * DELETE /dev/cache
 */
router.delete('/cache', async (req, res) => {
    try {
        await cacheService.clear();
        res.json({
            success: true,
            message: 'Cache cleared successfully',
        });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
        });
    }
});

/**
 * Test endpoint performance
 * GET /dev/performance/test/:endpoint
 */
router.get('/performance/test/:endpoint', async (req, res) => {
    try {
        const { endpoint } = req.params;
        const iterations = parseInt(req.query.iterations as string) || 5;

        const results = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();

            try {
                // Make internal request to test endpoint
                const response = await fetch(`http://localhost:${process.env.PORT || 7000}${endpoint}`, {
                    headers: {
                        'Authorization': req.headers.authorization || '',
                        'Content-Type': 'application/json',
                    },
                });

                const endTime = Date.now();
                const duration = endTime - startTime;

                results.push({
                    iteration: i + 1,
                    duration: `${duration}ms`,
                    statusCode: response.status,
                    success: response.ok,
                });
            } catch (error) {
                results.push({
                    iteration: i + 1,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    success: false,
                });
            }
        }

        const successfulResults = results.filter(r => r.success);
        const averageTime = successfulResults.length > 0
            ? successfulResults.reduce((sum, r) => sum + parseInt(r.duration || '0'), 0) / successfulResults.length
            : 0;

        res.json({
            success: true,
            data: {
                endpoint,
                iterations,
                results,
                summary: {
                    successfulRequests: successfulResults.length,
                    failedRequests: results.length - successfulResults.length,
                    averageResponseTime: `${Math.round(averageTime)}ms`,
                },
            },
        });
    } catch (error) {
        logger.error('Error testing endpoint performance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test endpoint performance',
        });
    }
});

/**
 * Health check with performance info
 * GET /dev/health
 */
router.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();

        // Test database connection (you'll need to import your db connection)
        // const dbTest = await db.select().from(users).limit(1);

        const healthCheckTime = Date.now() - startTime;
        const stats = performanceMonitor.getStats(5); // Last 5 minutes

        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                healthCheckTime: `${healthCheckTime}ms`,
                recentPerformance: {
                    requests: stats.totalRequests,
                    averageResponseTime: `${stats.averageResponseTime}ms`,
                    slowRequests: stats.slowRequests,
                    errorRequests: stats.errorRequests,
                },
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime(),
            },
        });
    } catch (error) {
        logger.error('Error in health check:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
        });
    }
});

export default router;
