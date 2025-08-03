import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { logger } from './logger';
import { ResponseUtil } from './response';

// Security configuration
const securityConfig = {
    cors: {
        origin: process.env.NODE_ENV === 'development'
            ? true  // Allow all origins in development
            : (process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001']),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        maxAge: 86400 // 24 hours
    },
    rateLimit: {
        windowMs: 60 * 1000, // 1 minute (100x faster than 15 minutes)
        max: 20000, // limit each IP to 20,000 requests per minute (200x from 100)
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '1 minute'
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Enable trust proxy validation for production
        validate: {
            trustProxy: process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true',
            xForwardedForHeader: true
        },
        // Skip rate limiting for health check endpoints
        skip: (req: Request) => {
            return req.path === '/health' || req.path === '/api/health';
        }
    },
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false
    }
};

// Configure security middleware
export function configureSecurityMiddleware(app: Application): void {
    // Trust proxy if behind reverse proxy (Render, Heroku, etc.)
    if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
        app.set('trust proxy', 1);
        logger.info('Trust proxy enabled for production deployment');
    }

    // Helmet for security headers
    app.use(helmet(securityConfig.helmet));

    // CORS configuration
    app.use(cors(securityConfig.cors));

    // Rate limiting with error handling
    try {
        const limiter = rateLimit({
            ...securityConfig.rateLimit,
            handler: (req: Request, res: Response) => {
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url
                });

                ResponseUtil.tooManyRequests(res, 'Too many requests, please try again later');
            }
        });

        app.use('/api/', limiter);
        logger.info('Rate limiting configured successfully');
    } catch (rateLimitError) {
        logger.error('Failed to configure rate limiting:', rateLimitError);
        logger.warn('Continuing without rate limiting due to configuration error');
    }

    // Stricter rate limiting for auth endpoints with error handling
    try {
        const authLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute (100x faster than 15 minutes)
            max: 4000, // limit each IP to 4,000 auth requests per minute (200x from 20)
            validate: {
                trustProxy: process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true',
                xForwardedForHeader: true
            },
            handler: (req: Request, res: Response) => {
                logger.warn('Auth rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url
                });

                ResponseUtil.tooManyRequests(res, 'Too many authentication attempts, please try again later');
            }
        });

        app.use('/api/auth/', authLimiter);
        logger.info('Auth rate limiting configured successfully');
    } catch (authRateLimitError) {
        logger.error('Failed to configure auth rate limiting:', authRateLimitError);
        logger.warn('Continuing without auth rate limiting due to configuration error');
    }

    logger.info('Security middleware configured successfully');
}

// Error handler
export function errorHandler(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Log the error
    logger.error('Global error handler caught error', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }
    });

    // Default error status and message
    let statusCode = 500;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = undefined;

    // Handle different types of errors
    if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
        errorCode = error.errorCode || 'APPLICATION_ERROR';
        details = error.details;
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
        details = error.details;
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
        errorCode = 'UNAUTHORIZED';
    } else if (error.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service temporarily unavailable';
        errorCode = 'SERVICE_UNAVAILABLE';
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal server error';
        details = undefined;
    }

    // Send error response
    ResponseUtil.error(res, statusCode, message, errorCode, details);
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
    logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    ResponseUtil.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
}

export default {
    configureSecurityMiddleware,
    errorHandler,
    notFoundHandler,
    securityHeaders
};
