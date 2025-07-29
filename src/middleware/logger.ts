import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Define user interface
export interface User {
    user_id: string;
    email: string;
    role: string;
    user_type: string;
    userId: string;
}

// Define authenticated request interface
export interface AuthenticatedRequest extends Omit<Request, 'user'> {
    user?: User;
    requestId?: string;
}

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Configure Winston logger
const winstonLogger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'vehicle-rental-api' },
    transports: [
        // Write all logs with level `error` and below to `error.log`
        new transports.File({
            filename: path.join(logsDir, `error-${new Date().toISOString().slice(0, 10)}.log`),
            level: 'error'
        }),
        // Write all logs with level `warn` and below to `warn.log`
        new transports.File({
            filename: path.join(logsDir, `warn-${new Date().toISOString().slice(0, 10)}.log`),
            level: 'warn'
        }),
        // Write all logs to `info.log`
        new transports.File({
            filename: path.join(logsDir, `info-${new Date().toISOString().slice(0, 10)}.log`),
        }),
    ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    winstonLogger.add(
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            ),
        })
    );
}

// Request logging middleware
export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Generate unique ID for this request
    const requestId = uuidv4();
    req.requestId = requestId;

    // Log the request
    winstonLogger.info(`${req.method} ${req.path}`, {
        requestId,
        userId: req.user?.user_id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        query: req.query,
        path: req.path,
    });

    // Track response time
    const start = Date.now();

    // Log when the response finishes
    res.on('finish', () => {
        const responseTime = Date.now() - start;
        const level = res.statusCode >= 400 ? (res.statusCode >= 500 ? 'error' : 'warn') : 'info';

        winstonLogger.log(level, `${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`, {
            requestId,
            userId: req.user?.user_id,
            statusCode: res.statusCode,
            responseTime
        });
    });

    next();
};

// Centralized logger to use throughout the application
export const logger = {
    error: (message: string, meta?: any): void => {
        winstonLogger.error(message, meta);
    },

    warn: (message: string, meta?: any): void => {
        winstonLogger.warn(message, meta);
    },

    info: (message: string, meta?: any): void => {
        winstonLogger.info(message, meta);
    },

    debug: (message: string, meta?: any): void => {
        winstonLogger.debug(message, meta);
    },

    // Higher level methods for specific use cases
    apiRequest: (req: Request): void => {
        winstonLogger.info(`API Request: ${req.method} ${req.path}`, {
            userId: (req as AuthenticatedRequest).user?.user_id,
            ip: req.ip,
            headers: req.headers,
            query: req.query,
            body: process.env.NODE_ENV !== 'production' ? req.body : undefined
        });
    },

    apiResponse: (req: Request, res: Response, responseTime: number): void => {
        const level = res.statusCode >= 400 ? (res.statusCode >= 500 ? 'error' : 'warn') : 'info';

        winstonLogger.log(level, `API Response: ${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`, {
            userId: (req as AuthenticatedRequest).user?.user_id,
            statusCode: res.statusCode,
            responseTime
        });
    },

    dbQuery: (query: string, params: any[], duration: number): void => {
        winstonLogger.debug(`DB Query: ${duration}ms`, {
            query: query.substring(0, 500), // Limit query length
            params: process.env.NODE_ENV !== 'production' ? params : undefined,
            duration
        });
    },

    dbError: (error: Error, query: string, params: any[]): void => {
        winstonLogger.error(`DB Error: ${error.message}`, {
            query: query.substring(0, 500),
            params: process.env.NODE_ENV !== 'production' ? params : undefined,
            error: error.stack
        });
    },

    authSuccess: (userId: string, method: string, ip: string): void => {
        winstonLogger.info(`Authentication success for user ${userId}`, {
            userId,
            method,
            ip
        });
    },

    authFailure: (email: string, reason: string, ip: string): void => {
        winstonLogger.warn(`Authentication failure for ${email}: ${reason}`, {
            email,
            reason,
            ip
        });
    },

    securityEvent: (eventType: string, details: any): void => {
        winstonLogger.warn(`Security Event: ${eventType}`, details);
    },

    businessEvent: (eventType: string, details: any): void => {
        winstonLogger.info(`Business Event: ${eventType}`, details);
    },

    // Express middleware form of the logger
    middleware: (req: Request, res: Response, next: NextFunction): void => {
        requestLogger(req as AuthenticatedRequest, res, next);
    }
};

// Export the logger and middleware
export default logger;

// Log categories for structured logging
export enum LogCategory {
    AUTHENTICATION = 'auth',
    DATABASE = 'database',
    API = 'api',
    SECURITY = 'security',
    BUSINESS = 'business',
    SYSTEM = 'system',
    ERROR = 'error',
    VALIDATION = 'validation',
    MIDDLEWARE = 'middleware',
    EXTERNAL_SERVICE = 'external_service',
    AUTH = "AUTH",
    EMAIL = "EMAIL"
}

// Enhanced logger with categories
export const categorizedLogger = {
    log: (category: LogCategory, level: string, message: string, meta?: any): void => {
        winstonLogger.log(level, message, {
            category,
            ...meta
        });
    },

    auth: (message: string, meta?: any): void => {
        winstonLogger.info(message, {
            category: LogCategory.AUTHENTICATION,
            ...meta
        });
    },

    database: (message: string, meta?: any): void => {
        winstonLogger.debug(message, {
            category: LogCategory.DATABASE,
            ...meta
        });
    },

    api: (message: string, meta?: any): void => {
        winstonLogger.info(message, {
            category: LogCategory.API,
            ...meta
        });
    },

    security: (message: string, meta?: any): void => {
        winstonLogger.warn(message, {
            category: LogCategory.SECURITY,
            ...meta
        });
    },

    business: (message: string, meta?: any): void => {
        winstonLogger.info(message, {
            category: LogCategory.BUSINESS,
            ...meta
        });
    }
};