import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface PerformanceMetrics {
    endpoint: string;
    method: string;
    duration: number;
    timestamp: Date;
    statusCode: number;
    userAgent?: string;
    userId?: string;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics[] = [];
    private readonly MAX_METRICS = 1000; // Keep last 1000 requests in memory

    /**
     * Express middleware to track request performance
     */
    middleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const startTime = Date.now();
            const startHrTime = process.hrtime();

            // Capture original end function
            const originalEnd = res.end;

            // Override res.end to capture metrics
            res.end = function (chunk?: any, encoding?: any) {
                const endTime = Date.now();
                const duration = endTime - startTime;
                const hrDuration = process.hrtime(startHrTime);
                const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;

                // Create performance metric
                const metric: PerformanceMetrics = {
                    endpoint: req.path,
                    method: req.method,
                    duration: Math.round(durationMs),
                    timestamp: new Date(),
                    statusCode: res.statusCode,
                    userAgent: req.get('User-Agent'),
                    userId: (req as any).user?.user_id,
                };

                // Store metric
                performanceMonitor.addMetric(metric);

                // Log slow requests (>500ms)
                if (duration > 500) {
                    logger.warn('Slow request detected', {
                        module: 'performance',
                        endpoint: req.path,
                        method: req.method,
                        duration: `${duration}ms`,
                        statusCode: res.statusCode,
                        query: req.query,
                        params: req.params,
                    });
                }

                // Log very fast requests (potential caching working)
                if (duration < 50) {
                    logger.info('Fast request (cached?)', {
                        module: 'performance',
                        endpoint: req.path,
                        method: req.method,
                        duration: `${duration}ms`,
                    });
                }

                // Call original end function
                return originalEnd.call(res, chunk, encoding);
            } as any;

            next();
        };
    }

    /**
     * Add a performance metric
     */
    addMetric(metric: PerformanceMetrics): void {
        this.metrics.push(metric);

        // Keep only the last MAX_METRICS entries
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics.shift();
        }
    }

    /**
     * Get performance statistics
     */
    getStats(timeRangeMinutes: number = 60): {
        totalRequests: number;
        averageResponseTime: number;
        slowRequests: number;
        fastRequests: number;
        errorRequests: number;
        byEndpoint: Record<string, {
            count: number;
            averageTime: number;
            slowestTime: number;
            fastestTime: number;
        }>;
    } {
        const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
        const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

        if (recentMetrics.length === 0) {
            return {
                totalRequests: 0,
                averageResponseTime: 0,
                slowRequests: 0,
                fastRequests: 0,
                errorRequests: 0,
                byEndpoint: {},
            };
        }

        const totalRequests = recentMetrics.length;
        const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
        const averageResponseTime = Math.round(totalDuration / totalRequests);

        const slowRequests = recentMetrics.filter(m => m.duration > 500).length;
        const fastRequests = recentMetrics.filter(m => m.duration < 100).length;
        const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;

        // Group by endpoint
        const endpointStats: Record<string, {
            count: number;
            averageTime: number;
            slowestTime: number;
            fastestTime: number;
        }> = {};

        recentMetrics.forEach(metric => {
            const key = `${metric.method} ${metric.endpoint}`;

            if (!endpointStats[key]) {
                endpointStats[key] = {
                    count: 0,
                    averageTime: 0,
                    slowestTime: 0,
                    fastestTime: Infinity,
                };
            }

            const stats = endpointStats[key];
            stats.count++;
            stats.slowestTime = Math.max(stats.slowestTime, metric.duration);
            stats.fastestTime = Math.min(stats.fastestTime, metric.duration);
        });

        // Calculate averages for each endpoint
        Object.keys(endpointStats).forEach(endpoint => {
            const endpointMetrics = recentMetrics.filter(
                m => `${m.method} ${m.endpoint}` === endpoint
            );
            const totalTime = endpointMetrics.reduce((sum, m) => sum + m.duration, 0);
            endpointStats[endpoint].averageTime = Math.round(totalTime / endpointMetrics.length);
        });

        return {
            totalRequests,
            averageResponseTime,
            slowRequests,
            fastRequests,
            errorRequests,
            byEndpoint: endpointStats,
        };
    }

    /**
     * Get the slowest endpoints
     */
    getSlowestEndpoints(limit: number = 10): Array<{
        endpoint: string;
        method: string;
        averageTime: number;
        slowestTime: number;
        count: number;
    }> {
        const stats = this.getStats();

        return Object.entries(stats.byEndpoint)
            .map(([endpoint, data]) => {
                const [method, path] = endpoint.split(' ', 2);
                return {
                    endpoint: path,
                    method,
                    averageTime: data.averageTime,
                    slowestTime: data.slowestTime,
                    count: data.count,
                };
            })
            .sort((a, b) => b.averageTime - a.averageTime)
            .slice(0, limit);
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics(timeRangeMinutes: number = 60): PerformanceMetrics[] {
        const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
        return this.metrics.filter(m => m.timestamp >= cutoffTime);
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Express middleware function
export const performanceMiddleware = performanceMonitor.middleware();

export default performanceMonitor;
