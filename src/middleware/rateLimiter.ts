import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { NextFunction, Request, Response } from "express";
import { UserType } from "../middleware/bearAuth";
import { logger, LogCategory } from "./logger";
import rateLimit from "express-rate-limit";

// Redis configuration (optional - falls back to memory if Redis not available)
let redisClient: any = null;
let redisConnectionAttempted = false;

const initializeRedis = async () => {
    try {
        if (process.env.REDIS_URL || process.env.REDIS_HOST) {
            const Redis = require("ioredis");

            // Robust configuration for Upstash Redis with error handling
            const redisConfig = {
                // Connection timeout and retry settings
                connectTimeout: 10000, // 10 seconds
                lazyConnect: true,
                retryDelayOnFailover: 1000,
                enableOfflineQueue: true, // Enable queue for better reliability
                retryDelayOnClusterDown: 300,
                enableReadyCheck: false, // Disable ready check for better compatibility
                maxRetriesPerRequest: 3,

                // Upstash Redis specific settings
                keepAlive: 30000,
                family: 4, // IPv4

                // Handle authentication and SSL for rediss:// URLs automatically
                // ioredis will parse the URL and configure tls/auth automatically
            };

            // Create Redis client properly
            if (process.env.REDIS_URL) {
                redisClient = new Redis(process.env.REDIS_URL, redisConfig);
            } else {
                redisClient = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    ...redisConfig
                });
            }

            redisConnectionAttempted = true;

            // Handle connection events with better error handling
            redisClient.on('connect', () => {
                console.log("✅ Rate limiter connected to Upstash Redis successfully");
            });

            redisClient.on('ready', () => {
                console.log("✅ Upstash Redis is ready for commands");
            });

            redisClient.on('error', (error: any) => {
                console.warn("⚠️ Redis connection error, falling back to memory-based rate limiting:", error.message);

                // Don't immediately destroy connection, let ioredis handle retries
                // Only cleanup after multiple failures
                setTimeout(() => {
                    if (redisClient && redisClient.status !== 'ready') {
                        redisClient.removeAllListeners();
                        redisClient.disconnect(false);
                        redisClient = null;
                        redisConnectionAttempted = false;
                    }
                }, 5000);
            });

            redisClient.on('close', () => {
                console.warn("⚠️ Redis connection closed, using memory-based rate limiting");

                // Cleanup
                if (redisClient) {
                    redisClient.removeAllListeners();
                    redisClient = null;
                }
                redisConnectionAttempted = false;
            });

            // Test initial connection with timeout
            try {
                const pingPromise = redisClient.ping();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), 8000);
                });

                await Promise.race([pingPromise, timeoutPromise]);
                console.log("✅ Redis ping successful - distributed rate limiting enabled");
            } catch (pingError) {
                console.warn("⚠️ Redis ping failed, using memory-based rate limiting:", pingError);
                if (redisClient) {
                    redisClient.removeAllListeners();
                    redisClient.disconnect(false);
                    redisClient = null;
                }
                redisConnectionAttempted = false;
            }
        } else {
            console.log("ℹ️ No Redis configuration found, using memory-based rate limiting");
        }
    } catch (error) {
        console.warn("⚠️ Redis initialization failed, using memory-based rate limiting:", error);
        redisClient = null;
        redisConnectionAttempted = false;
    }
};

// Initialize Redis asynchronously
initializeRedis().catch(err => {
    console.warn("Failed to initialize Redis:", err);
});

// EXTREME RATE LIMITS - 200x INCREASED FOR ULTIMATE DASHBOARD SMOOTHNESS
// Ensuring maximum performance and zero rate limit issues across all environments
const isExtremeHighLimitsMode = true; // Always true for ultimate smoothness

// Rate limiter configurations - ALL LIMITS MULTIPLIED BY 200x + 100x FASTER REQUESTS
const rateLimiterConfigs = {
    // Authentication endpoints (200x INCREASED - Ultimate smooth login/register)
    auth: {
        points: 20000000, // 20,000,000 attempts always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Registration/signup (200x INCREASED - Ultimate smooth registration)
    registration: {
        points: 20000000, // 20,000,000 attempts always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Password reset (200x INCREASED - Ultimate smooth password operations)
    passwordReset: {
        points: 20000000, // 20,000,000 attempts always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Email verification (200x INCREASED - Ultimate smooth email operations)
    emailVerification: {
        points: 20000000, // 20,000,000 attempts always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // General API endpoints (200x INCREASED - Ultimate smooth dashboard API calls)
    api: {
        user: {
            points: 100000000, // 100,000,000 requests always (200x from 500k)
            duration: 60, // per minute (100x faster - was 3600)
            blockDuration: 0.1, // block for only 0.1 seconds
        },
        admin: {
            points: 200000000, // 200,000,000 requests always (200x from 1M)
            duration: 60, // per minute (100x faster - was 3600)
            blockDuration: 0.1, // block for only 0.1 seconds
        },
        guest: {
            points: 40000000, // 40,000,000 requests always (200x from 200k)
            duration: 60, // per minute (100x faster - was 3600)
            blockDuration: 0.1, // block for only 0.1 seconds
        },
    },

    // Booking-related endpoints (200x INCREASED - Ultimate smooth booking operations)
    bookings: {
        points: 20000000, // 20,000,000 requests always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Vehicle search and browsing (200x INCREASED - Ultimate smooth vehicle browsing)
    vehicleSearch: {
        points: 40000000, // 40,000,000 requests always (200x from 200k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Payment processing (200x INCREASED - Ultimate smooth payment operations)
    payments: {
        points: 10000000, // 10,000,000 requests always (200x from 50k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Vehicle management (200x INCREASED - Ultimate smooth vehicle management)
    vehicleManagement: {
        points: 20000000, // 20,000,000 requests always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Maintenance operations (200x INCREASED - Ultimate smooth maintenance)
    maintenance: {
        points: 20000000, // 20,000,000 requests always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Search endpoints (200x INCREASED - Ultimate smooth search operations)
    search: {
        points: 20000000, // 20,000,000 requests always (200x from 100k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // File upload endpoints (200x INCREASED - Ultimate smooth file uploads)
    upload: {
        points: 2000000, // 2,000,000 uploads always (200x from 10k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },

    // Admin creation/invitation endpoints (200x INCREASED - Ultimate smooth admin actions)
    adminActions: {
        points: 2000000, // 2,000,000 admin actions always (200x from 10k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // block for only 0.1 seconds
    },
};

// Create rate limiter instances
const createRateLimiter = (config: any, keyPrefix: string) => {
    const limiterConfig = {
        ...config,
        keyPrefix,
        execEvenly: true, // Spread requests evenly across duration
    };

    if (redisClient) {
        return new RateLimiterRedis({
            storeClient: redisClient,
            ...limiterConfig,
        });
    } else {
        return new RateLimiterMemory(limiterConfig);
    }
};

// Rate limiter instances
const authLimiter = createRateLimiter(rateLimiterConfigs.auth, "auth");
const registrationLimiter = createRateLimiter(rateLimiterConfigs.registration, "registration");
const passwordResetLimiter = createRateLimiter(rateLimiterConfigs.passwordReset, "password_reset");
const emailVerificationLimiter = createRateLimiter(rateLimiterConfigs.emailVerification, "email_verification");
const bookingLimiter = createRateLimiter(rateLimiterConfigs.bookings, "bookings");
const vehicleSearchLimiter = createRateLimiter(rateLimiterConfigs.vehicleSearch, "vehicle_search");
const paymentLimiter = createRateLimiter(rateLimiterConfigs.payments, "payments");
const vehicleManagementLimiter = createRateLimiter(rateLimiterConfigs.vehicleManagement, "vehicle_management");
const maintenanceLimiter = createRateLimiter(rateLimiterConfigs.maintenance, "maintenance");
const searchLimiter = createRateLimiter(rateLimiterConfigs.search, "search");
const uploadLimiter = createRateLimiter(rateLimiterConfigs.upload, "upload");
const adminActionsLimiter = createRateLimiter(rateLimiterConfigs.adminActions, "admin_actions");

// API limiters by user type
const apiLimiters = {
    user: createRateLimiter(rateLimiterConfigs.api.user, "api_user"),
    admin: createRateLimiter(rateLimiterConfigs.api.admin, "api_admin"),
    guest: createRateLimiter(rateLimiterConfigs.api.guest, "api_guest"),
};

// Helper function to get client identifier
// Helper function to safely create dates from timestamps
const safeCreateDate = (msBeforeNext: number | undefined | null): Date => {
    if (typeof msBeforeNext !== 'number' || isNaN(msBeforeNext) || msBeforeNext < 0) {
        return new Date(Date.now() + 60000); // Default to 1 minute from now
    }

    const futureTimestamp = Date.now() + msBeforeNext;

    // Validate the timestamp is reasonable (not too far in future, not in past)
    if (futureTimestamp < Date.now() || futureTimestamp > Date.now() + (24 * 60 * 60 * 1000)) {
        return new Date(Date.now() + 60000); // Default to 1 minute from now
    }

    return new Date(futureTimestamp);
};

// Safe date conversion with validation
const safeGetRetryAfter = (msBeforeNext: number | undefined | null): number => {
    if (typeof msBeforeNext !== 'number' || isNaN(msBeforeNext) || msBeforeNext < 0) {
        return 60; // Default to 60 seconds
    }
    return Math.ceil(msBeforeNext / 1000);
};

// Client ID extraction for rate limiting
const getClientId = (req: Request): string => {
    // Prefer user ID if authenticated, fallback to IP
    if (req.user?.userId) {
        return `user_${req.user.userId}`;
    }

    // Get IP from various possible headers
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const ip = forwarded?.split(',')[0] || realIp || req.ip || req.connection.remoteAddress || 'unknown';

    return `ip_${ip}`;
};

// Helper function to get rate limit info for responses
const getRateLimitInfo = (rateLimiter: any, remainingPoints?: number, msBeforeNext?: number) => {
    return {
        limit: rateLimiter.points,
        remaining: remainingPoints ?? 0,
        reset: safeCreateDate(msBeforeNext),
        resetMs: msBeforeNext ?? 0,
    };
};

// Generic rate limiter middleware factory
const createRateLimiterMiddleware = (
    limiter: any,
    options: {
        skipSuccessfulRequests?: boolean;
        skipFailedRequests?: boolean;
        keyGenerator?: (req: Request) => string;
        onLimitReached?: (req: Request, res: Response) => void;
        customErrorMessage?: string;
    } = {}
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // EXTREME RATE LIMITS ALWAYS ENABLED - No environment-based disabling
        // Ensuring maximum smoothness for dashboard operations in ALL environments
        console.log('🚀 EXTREME rate limits enabled for ultimate dashboard smoothness (200x limits, 100x faster)');

        try {
            const clientId = options.keyGenerator ? options.keyGenerator(req) : getClientId(req);
            const result = await limiter.consume(clientId);

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': limiter.points.toString(),
                'X-RateLimit-Remaining': result.remainingPoints?.toString() || '0',
                'X-RateLimit-Reset': safeCreateDate(result.msBeforeNext).toISOString(),
            });

            console.log(`Rate limit check passed for ${clientId}: ${result.remainingPoints} remaining`);
            next();
        } catch (rateLimiterRes) {
            // Rate limit exceeded
            const rateLimiterError = rateLimiterRes as { msBeforeNext: number };
            const secs = safeGetRetryAfter(rateLimiterError.msBeforeNext);

            res.set({
                'X-RateLimit-Limit': limiter.points.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': safeCreateDate(rateLimiterError.msBeforeNext).toISOString(),
                'Retry-After': secs.toString(),
            });

            if (options.onLimitReached) {
                options.onLimitReached(req, res);
            }

            const clientId = options.keyGenerator ? options.keyGenerator(req) : getClientId(req);
            console.warn(`Rate limit exceeded for ${clientId}. Retry after ${secs} seconds`);

            res.status(429).json({
                error: options.customErrorMessage || "Too many requests. Please try again later.",
                retryAfter: secs,
                limit: limiter.points,
                windowMs: limiter.duration * 1000,
                type: "RATE_LIMIT_EXCEEDED",
            });
        }
    };
};

// Enhanced authentication rate limiter with progressive delays
export const authRateLimiter = createRateLimiterMiddleware(authLimiter, {
    customErrorMessage: "Too many authentication attempts. Please try again in 15 minutes.",
    onLimitReached: (req, res) => {
        console.warn(`Authentication rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
        // Could add additional security measures here (e.g., temporary IP blocking)
    },
});

// Registration rate limiter
export const registrationRateLimiter = createRateLimiterMiddleware(registrationLimiter, {
    customErrorMessage: "Too many registration attempts. Please try again in an hour.",
    onLimitReached: (req, res) => {
        console.warn(`Registration rate limit exceeded for IP: ${req.ip}`);
    },
});

// Password reset rate limiter
export const passwordResetRateLimiter = createRateLimiterMiddleware(passwordResetLimiter, {
    customErrorMessage: "Too many password reset attempts. Please try again in 30 minutes.",
    keyGenerator: (req: Request) => {
        // Rate limit by email for password reset
        const email = req.body?.email;
        return email ? `email_${email}` : getClientId(req);
    },
});

// Email verification rate limiter
export const emailVerificationRateLimiter = createRateLimiterMiddleware(emailVerificationLimiter, {
    customErrorMessage: "Too many verification attempts. Please try again in 30 minutes.",
    keyGenerator: (req: Request) => {
        const email = req.body?.email || req.user?.email;
        return email ? `email_${email}` : getClientId(req);
    },
});

// API rate limiter that adapts based on user type
export const apiRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    // EXTREME LIMITS ALWAYS ENABLED - No environment-based disabling
    // Ensuring maximum smoothness for dashboard operations in ALL environments
    console.log('🚀 EXTREME API rate limits enabled for ultimate dashboard smoothness (200x limits, 100x faster)');

    try {
        const userType: UserType = (req.user?.user_type && ['member', 'driver', 'owner', 'admin', 'guest'].includes(req.user.user_type))
            ? req.user.user_type
            : 'guest' as UserType;
        const limiter = apiLimiters[userType as keyof typeof apiLimiters] || apiLimiters.guest;

        const clientId = getClientId(req);
        const result = await limiter.consume(clientId);

        // Add enhanced headers with user type info
        res.set({
            'X-RateLimit-Limit': limiter.points.toString(),
            'X-RateLimit-Remaining': result.remainingPoints?.toString() || '0',
            'X-RateLimit-Reset': safeCreateDate(result.msBeforeNext).toISOString(),
            'X-RateLimit-Policy': userType,
        });

        console.log(`API rate limit check passed for ${userType} ${clientId}: ${result.remainingPoints} remaining`);
        next();
    } catch (rateLimiterRes) {
        try {
            const userType = req.user?.user_type || 'guest';
            const limiter = apiLimiters[userType as keyof typeof apiLimiters] || apiLimiters.guest;
            const { msBeforeNext } = rateLimiterRes as { msBeforeNext: number };
            const secs = safeGetRetryAfter(msBeforeNext);

            res.set({
                'X-RateLimit-Limit': limiter.points.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': safeCreateDate(msBeforeNext).toISOString(),
                'X-RateLimit-Policy': userType,
                'Retry-After': secs.toString(),
            });

            console.warn(`API rate limit exceeded for ${userType} user ${getClientId(req)}`);

            res.status(429).json({
                error: `Too many API requests for ${userType} users. Please try again later.`,
                retryAfter: secs,
                limit: limiter.points,
                windowMs: limiter.duration * 1000,
                userType,
                type: "API_RATE_LIMIT_EXCEEDED",
            });
        } catch (err) {
            // Defensive: always send a response if something goes wrong
            res.status(500).json({ error: "Internal server error in rate limiter." });
        }
    }
};

// Booking-specific rate limiter
export const bookingRateLimiter = createRateLimiterMiddleware(bookingLimiter, {
    customErrorMessage: "Too many booking requests. Please try again in a few minutes.",
});

// Search rate limiter
export const searchRateLimiter = createRateLimiterMiddleware(searchLimiter, {
    customErrorMessage: "Too many search requests. Please try again in a few minutes.",
});

// File upload rate limiter
export const uploadRateLimiter = createRateLimiterMiddleware(uploadLimiter, {
    customErrorMessage: "Too many file uploads. Please try again later.",
});

// Admin actions rate limiter
export const adminActionsRateLimiter = createRateLimiterMiddleware(adminActionsLimiter, {
    customErrorMessage: "Too many admin actions. Please slow down.",
});

// Aggressive rate limiter for sensitive endpoints (200x INCREASED)
export const strictRateLimiter = createRateLimiterMiddleware(
    createRateLimiter({
        points: 10000000, // 10,000,000 requests always (200x from 50k)
        duration: 60, // per minute (100x faster - was 3600)
        blockDuration: 0.1, // 0.1 seconds block always
    }, "strict"),
    {
        customErrorMessage: "This endpoint has strict rate limiting. Please try again later.",
    }
);

// Burst protection for real-time endpoints (200x INCREASED)
export const burstProtectionRateLimiter = createRateLimiterMiddleware(
    createRateLimiter({
        points: 2000000, // 2,000,000 requests always (200x from 10k)
        duration: 10, // 10 seconds
        blockDuration: 0.1, // 0.1 seconds block always
    }, "burst"),
    {
        customErrorMessage: "Too many rapid requests. Please slow down.",
    }
);

// Rate limiter for webhook endpoints (200x INCREASED)
export const webhookRateLimiter = createRateLimiterMiddleware(
    createRateLimiter({
        points: 20000, // 20,000 webhooks (200x from 100)
        duration: 60, // 1 minute
        blockDuration: 0.1, // 0.1 second block
    }, "webhook"),
    {
        customErrorMessage: "Webhook rate limit exceeded.",
        keyGenerator: (req: Request) => {
            // Rate limit webhooks by source IP and webhook type
            const webhookType = req.headers['x-webhook-type'] || 'unknown';
            return `webhook_${webhookType}_${req.ip}`;
        },
    }
);

// Health check for rate limiters
export const rateLimiterHealthCheck = async (): Promise<{
    healthy: boolean;
    backend: 'redis' | 'memory';
    message: string;
}> => {
    try {
        if (redisClient) {
            await redisClient.ping();
            return {
                healthy: true,
                backend: 'redis',
                message: 'Rate limiter using Redis backend',
            };
        } else {
            return {
                healthy: true,
                backend: 'memory',
                message: 'Rate limiter using memory backend',
            };
        }
    } catch (error) {
        return {
            healthy: false,
            backend: redisClient ? 'redis' : 'memory',
            message: `Rate limiter backend error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};

// Get rate limit status for a specific client
export const getRateLimitStatus = async (clientId: string, limiterType: string = 'api') => {
    try {
        let limiter;
        switch (limiterType) {
            case 'auth':
                limiter = authLimiter;
                break;
            case 'api':
                limiter = apiLimiters.guest; // Default to guest limits
                break;
            case 'bookings':
                limiter = bookingLimiter;
                break;
            default:
                throw new Error('Invalid limiter type');
        }

        const result = await limiter.get(clientId);
        return {
            limit: limiter.points,
            remaining: result ? result.remainingPoints : limiter.points,
            reset: safeCreateDate(result?.msBeforeNext),
            blocked: result ? result.remainingPoints <= 0 : false,
        };
    } catch (error) {
        throw new Error(`Failed to get rate limit status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// Reset rate limit for a specific client (admin function)
export const resetRateLimit = async (clientId: string, limiterType: string = 'api') => {
    try {
        let limiter;
        switch (limiterType) {
            case 'auth':
                limiter = authLimiter;
                break;
            case 'api':
                // Reset all API limiters for the client
                await Promise.all([
                    apiLimiters.user.delete(clientId),
                    apiLimiters.admin.delete(clientId),
                    apiLimiters.guest.delete(clientId),
                ]);
                return { success: true, message: 'All API rate limits reset' };
            case 'bookings':
                limiter = bookingLimiter;
                break;
            default:
                throw new Error('Invalid limiter type');
        }

        if (limiter) {
            await limiter.delete(clientId);
        }

        return { success: true, message: `Rate limit reset for ${limiterType}` };
    } catch (error) {
        throw new Error(`Failed to reset rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// Vehicle/incident reporting rate limiter (200x INCREASED)
export const reportingRateLimiter = rateLimit({
    windowMs: 1000, // 1 second always for ultra-smooth operations
    max: 2000000, // 2,000,000 reports always (200x from 10k)
    message: {
        error: "Too many incident reports submitted. Please try again later.",
        retryAfter: "1 second",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        logger.warn("Vehicle incident report rate limit exceeded", {
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            endpoint: req.originalUrl,
        });
        res.status(429).json({
            error: "Too many incident reports submitted. Please try again later.",
            retryAfter: "1 second",
        });
    },
});

// Vehicle review/feedback creation rate limiter (200x INCREASED)
export const commentCreationRateLimiter = rateLimit({
    windowMs: 1000, // 1 second always for ultra-smooth operations
    max: 2000000, // 2,000,000 reviews always (200x from 10k)
    message: {
        error: "Too many reviews created. Please try again later.",
        retryAfter: "1 second",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        logger.warn("Vehicle review creation rate limit exceeded", {
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            user_id: req.body?.user_id,
        });
        res.status(429).json({
            error: "Too many reviews created. Please try again later.",
            retryAfter: "1 second",
        });
    },
});

// Cleanup function for graceful shutdown
export const cleanupRateLimiters = async () => {
    try {
        if (redisClient) {
            await redisClient.quit();
            console.log('Rate limiter Redis connection closed');
        }
    } catch (error) {
        console.error('Error closing rate limiter Redis connection:', error);
    }
};

/**
 * Development helper function to reset all rate limits for a client
 * WARNING: Use only in development environment
 */
export const resetRateLimitsForClient = async (clientId: string): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Rate limit reset is not allowed in production');
    }

    try {
        // Reset all rate limiters for the client
        await Promise.all([
            authLimiter.delete(clientId),
            registrationLimiter.delete(clientId),
            passwordResetLimiter.delete(clientId),
            emailVerificationLimiter.delete(clientId),
            bookingLimiter.delete(clientId),
            searchLimiter.delete(clientId),
            uploadLimiter.delete(clientId),
            adminActionsLimiter.delete(clientId),
            apiLimiters.user.delete(clientId),
            apiLimiters.admin.delete(clientId),
            apiLimiters.guest.delete(clientId),
        ]);

        logger.info(LogCategory.AUTH, `Rate limits reset for client: ${clientId}`);
    } catch (error) {
        logger.error('Error resetting rate limits', error);
        throw error;
    }
};

/**
 * Development helper to get current rate limit status
 */
export const getCurrentRateLimitStatus = async (clientId: string, limiterType: string = 'auth') => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Rate limit status check is not allowed in production');
    }

    let limiter;
    switch (limiterType) {
        case 'auth':
            limiter = authLimiter;
            break;
        case 'registration':
            limiter = registrationLimiter;
            break;
        case 'passwordReset':
            limiter = passwordResetLimiter;
            break;
        default:
            limiter = authLimiter;
    }

    try {
        const result = await limiter.get(clientId);
        return {
            limit: limiter.points,
            remaining: result ? result.remainingPoints : limiter.points,
            resetTime: result ? new Date(Date.now() + result.msBeforeNext) : new Date(),
            blocked: result ? result.remainingPoints <= 0 : false,
            msBeforeNext: result ? result.msBeforeNext : 0
        };
    } catch (error) {
        logger.error('Error getting rate limit status', error);
        throw error;
    }
};

// Legacy middleware for backward compatibility
export const RateLimiterMiddleware = apiRateLimiter;

// Vehicle rental system specific exports
export const vehicleRentalRateLimiter = {
    auth: authRateLimiter,
    registration: registrationRateLimiter,
    passwordReset: passwordResetRateLimiter,
    emailVerification: emailVerificationRateLimiter,
    bookings: bookingRateLimiter,
    search: searchRateLimiter,
    upload: uploadRateLimiter,
    adminActions: adminActionsRateLimiter,
    api: apiRateLimiter,
    strict: strictRateLimiter,
    burstProtection: burstProtectionRateLimiter,
    webhook: webhookRateLimiter,
    reporting: reportingRateLimiter,
    commentCreation: commentCreationRateLimiter,
};

// Export rate limiter configurations for monitoring/admin purposes
export const rateLimiterInfo = {
    configs: rateLimiterConfigs,
    backend: redisClient ? 'redis' : 'memory',
    redisConnected: !!redisClient,
    systemType: 'vehicle-rental-management-extreme-limits',
    supportedUserTypes: ['customer', 'fleet_manager', 'admin', 'support_agent', 'guest'],
    mode: 'EXTREME_LIMITS_200X_100X_FASTER',
    description: 'All rate limits increased by 200x and requests per minute 100x faster for ultimate dashboard smoothness across all environments',
    limitsMultiplier: 200,
    speedMultiplier: 100,
    blockDuration: '0.1 seconds (extreme-short)',
    environmentSupport: 'All environments (development, staging, production)',
    newDuration: '60 seconds (per minute instead of per hour)',
    previousDuration: '3600 seconds (per hour)',
};