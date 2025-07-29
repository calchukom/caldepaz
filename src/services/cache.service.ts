import Redis from 'ioredis';
import { logger } from '../middleware/logger';

class CacheService {
    private redis: Redis | null = null;
    private useRedis: boolean = false;
    private memoryCache: Map<string, { data: any; expiry: number }> = new Map();

    constructor() {
        this.initializeRedis();
    }

    private async initializeRedis() {
        try {
            // Only attempt Redis connection if REDIS_URL or REDIS_HOST is provided
            if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
                logger.info('No Redis configuration found, using memory cache');
                this.useRedis = false;
                return;
            }

            // Robust configuration for Upstash Redis
            const redisConfig = {
                connectTimeout: 10000, // 10 seconds
                lazyConnect: true,
                retryDelayOnFailover: 1000,
                enableOfflineQueue: true, // Enable for better reliability
                enableReadyCheck: false, // Better compatibility with Upstash
                maxRetriesPerRequest: 3,
                keepAlive: 30000,
                family: 4, // IPv4
            };

            // Create Redis client properly
            if (process.env.REDIS_URL) {
                this.redis = new Redis(process.env.REDIS_URL, redisConfig);
            } else {
                this.redis = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    ...redisConfig
                });
            }

            // Handle Redis events with better error handling
            this.redis.on('connect', () => {
                logger.info('✅ Cache service connected to Upstash Redis successfully');
                this.useRedis = true;
            });

            this.redis.on('ready', () => {
                logger.info('✅ Upstash Redis cache is ready');
                this.useRedis = true;
            });

            this.redis.on('error', (error: any) => {
                logger.warn('⚠️ Redis connection error, falling back to memory cache', error);
                this.useRedis = false;

                // Don't immediately destroy, let ioredis handle retries
                setTimeout(() => {
                    if (this.redis && this.redis.status !== 'ready') {
                        this.redis.removeAllListeners();
                        this.redis.disconnect(false);
                        this.redis = null;
                    }
                }, 5000);
            });

            this.redis.on('close', () => {
                logger.warn('⚠️ Redis connection closed, falling back to memory cache');
                this.useRedis = false;
                this.redis = null;
            });

            // Test connection with timeout
            try {
                const pingPromise = this.redis.ping();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), 8000);
                });

                await Promise.race([pingPromise, timeoutPromise]);
                this.useRedis = true;
                logger.info('✅ Redis cache initialized successfully with Upstash');
            } catch (pingError) {
                logger.warn('⚠️ Redis ping failed, using memory cache', pingError);
                this.useRedis = false;
                this.redis = null;
            }
        } catch (error) {
            logger.warn('⚠️ Redis not available, falling back to memory cache', error);
            this.useRedis = false;
            this.redis = null;
        }
    }

    /**
     * Get cached data
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (this.useRedis && this.redis) {
                const cached = await this.redis.get(key);
                return cached ? JSON.parse(cached) : null;
            }

            // Fallback to memory cache
            const cached = this.memoryCache.get(key);
            if (cached && cached.expiry > Date.now()) {
                return cached.data;
            }

            // Remove expired entry
            if (cached) {
                this.memoryCache.delete(key);
            }

            return null;
        } catch (error) {
            logger.error('Error getting from cache:', error);
            return null;
        }
    }

    /**
     * Set cached data with TTL (time to live in seconds)
     */
    async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
                return;
            }

            // Fallback to memory cache
            const expiry = Date.now() + (ttlSeconds * 1000);
            this.memoryCache.set(key, { data, expiry });

            // Clean up expired entries periodically
            if (this.memoryCache.size > 1000) {
                this.cleanupMemoryCache();
            }
        } catch (error) {
            logger.error('Error setting cache:', error);
        }
    }

    /**
     * Delete cached data
     */
    async delete(key: string): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.del(key);
                return;
            }

            this.memoryCache.delete(key);
        } catch (error) {
            logger.error('Error deleting from cache:', error);
        }
    }

    /**
     * Clear all cached data
     */
    async clear(): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.flushall();
                return;
            }

            this.memoryCache.clear();
        } catch (error) {
            logger.error('Error clearing cache:', error);
        }
    }

    /**
     * Get or set cached data with a function
     */
    async getOrSet<T>(
        key: string,
        fetchFunction: () => Promise<T>,
        ttlSeconds: number = 300
    ): Promise<T> {
        try {
            // Try to get from cache first
            const cached = await this.get<T>(key);
            if (cached !== null) {
                return cached;
            }

            // If not in cache, fetch data
            const data = await fetchFunction();

            // Store in cache
            await this.set(key, data, ttlSeconds);

            return data;
        } catch (error) {
            logger.error('Error in getOrSet cache operation:', error);
            // If cache fails, just return the fresh data
            return await fetchFunction();
        }
    }

    /**
     * Clean up expired memory cache entries
     */
    private cleanupMemoryCache(): void {
        const now = Date.now();
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }
    }

    /**
     * Generate cache key for common patterns
     */
    static generateKey(prefix: string, ...parts: (string | number)[]): string {
        return `${prefix}:${parts.join(':')}`;
    }

    /**
     * Cache keys for different data types
     */
    static keys = {
        vehicleSpecs: (page: number, limit: number, filters?: string) =>
            CacheService.generateKey('vehicle_specs', page, limit, filters || 'all'),

        vehicleEarnings: (startDate?: string, endDate?: string) =>
            CacheService.generateKey('vehicle_earnings', startDate || 'default', endDate || 'default'),

        userDashboard: (userId: string) =>
            CacheService.generateKey('user_dashboard', userId),

        vehicleById: (vehicleId: string) =>
            CacheService.generateKey('vehicle', vehicleId),

        userById: (userId: string) =>
            CacheService.generateKey('user', userId),

        vehicleSpecById: (specId: string) =>
            CacheService.generateKey('vehicle_spec', specId),
    };
}

// Create singleton instance
export const cacheService = new CacheService();

/**
 * Cache decorator for methods
 * Usage: @Cache('prefix', 300) // 5 minutes TTL
 */
export function Cache(keyPrefix: string, ttlSeconds: number = 300) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cacheKey = CacheService.generateKey(keyPrefix, ...args);

            return await cacheService.getOrSet(
                cacheKey,
                () => originalMethod.apply(this, args),
                ttlSeconds
            );
        };

        return descriptor;
    };
}

/**
 * Helper function to wrap any function with caching
 */
export async function withCache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    return await cacheService.getOrSet(key, fetchFunction, ttlSeconds);
}

export default cacheService;
