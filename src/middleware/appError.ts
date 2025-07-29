import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { ResponseUtil } from './response';

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public errorCode: string;
    public details?: any;

    constructor(
        message: string,
        statusCode: number = 500,
        errorCode: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        details?: any
    ) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode;
        this.details = details;

        // Maintain proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error Factory for creating consistent errors
 */
export class ErrorFactory {

    /**
     * Bad Request Error (400)
     */
    static badRequest(message: string, field?: string, details?: any): AppError {
        return new AppError(
            message,
            400,
            'BAD_REQUEST',
            true,
            { field, ...details }
        );
    }

    /**
     * Unauthorized Error (401)
     */
    static unauthorized(message: string = 'Unauthorized access'): AppError {
        return new AppError(
            message,
            401,
            'UNAUTHORIZED',
            true
        );
    }

    /**
     * Forbidden Error (403)
     */
    static forbidden(message: string = 'Forbidden access'): AppError {
        return new AppError(
            message,
            403,
            'FORBIDDEN',
            true
        );
    }

    /**
     * Not Found Error (404)
     */
    static notFound(resource: string = 'Resource'): AppError {
        return new AppError(
            `${resource} not found`,
            404,
            'NOT_FOUND',
            true,
            { resource }
        );
    }

    /**
     * Conflict Error (409)
     */
    static conflict(message: string, field?: string, details?: any): AppError {
        return new AppError(
            message,
            409,
            'CONFLICT',
            true,
            { field, ...details }
        );
    }

    /**
     * Validation Error (422)
     */
    static validation(message: string, errors?: any): AppError {
        return new AppError(
            message,
            422,
            'VALIDATION_ERROR',
            true,
            { errors }
        );
    }

    /**
     * Validation Error (422) - alias for backward compatibility
     */
    static validationError(message: string, errors: any[]): AppError {
        return new AppError(
            message,
            422,
            'VALIDATION_ERROR',
            true,
            { errors }
        );
    }

    /**
     * Rate Limit Error (429)
     */
    static rateLimit(message: string = 'Too many requests'): AppError {
        return new AppError(
            message,
            429,
            'TOO_MANY_REQUESTS',
            true
        );
    }

    /**
     * Too Many Requests Error (429)
     */
    static tooManyRequests(message: string = 'Too many requests'): AppError {
        return new AppError(
            message,
            429,
            'TOO_MANY_REQUESTS',
            true
        );
    }

    /**
     * Internal Server Error (500)
     */
    static internal(message: string = 'Internal server error', details?: any): AppError {
        return new AppError(
            message,
            500,
            'INTERNAL_ERROR',
            true,
            details
        );
    }

    /**
     * Database Error (500)
     */
    static database(message: string = 'Database error', details?: any): AppError {
        return new AppError(
            message,
            500,
            'DATABASE_ERROR',
            true,
            details
        );
    }

    /**
     * External Service Error (502)
     */
    static externalService(service: string, details?: any): AppError {
        return new AppError(
            `External service error: ${service}`,
            502,
            'EXTERNAL_SERVICE_ERROR',
            true,
            { service, ...details }
        );
    }

    /**
     * Service Unavailable Error (503)
     */
    static serviceUnavailable(message: string = 'Service temporarily unavailable'): AppError {
        return new AppError(
            message,
            503,
            'SERVICE_UNAVAILABLE',
            true
        );
    }

    /**
     * Custom Error
     */
    static custom(
        message: string,
        statusCode: number,
        errorCode: string,
        details?: any
    ): AppError {
        return new AppError(
            message,
            statusCode,
            errorCode,
            true,
            details
        );
    }
}

/**
 * Global Error Handler Middleware
 */
export const globalErrorHandler = (
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = undefined;

    // Handle custom AppError
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        errorCode = error.errorCode;
        details = error.details;
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        errorCode = 'INVALID_TOKEN';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        errorCode = 'TOKEN_EXPIRED';
    }
    // Handle Zod validation errors
    else if (error.name === 'ZodError') {
        statusCode = 422;
        message = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
        details = (error as any).errors;
    }
    // Handle database constraint errors
    else if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        statusCode = 409;
        message = 'Resource already exists';
        errorCode = 'DUPLICATE_RESOURCE';
    }
    else if (error.message.includes('foreign key constraint')) {
        statusCode = 400;
        message = 'Cannot perform operation due to related records';
        errorCode = 'FOREIGN_KEY_CONSTRAINT';
    }
    // Handle other known errors
    else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        statusCode = 502;
        message = 'External service unavailable';
        errorCode = 'EXTERNAL_SERVICE_ERROR';
    }

    // Log the error
    logger.error('Global error handler caught error', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            statusCode,
            errorCode
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: (req as any).user?.userId
        }
    });

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal server error';
        details = undefined;
    }

    // Send error response
    ResponseUtil.error(res, statusCode, message, errorCode, details);
};

/**
 * Catch async errors wrapper
 */
export const catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
    });

    // Gracefully close the server
    process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    });

    // Gracefully close the server
    process.exit(1);
});

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = ErrorFactory.notFound(`Route ${req.originalUrl} not found`);
    next(error);
};

/**
 * Request timeout handler
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                const error = ErrorFactory.custom(
                    'Request timeout',
                    408,
                    'REQUEST_TIMEOUT'
                );
                next(error);
            }
        }, timeoutMs);

        res.on('finish', () => {
            clearTimeout(timeout);
        });

        res.on('close', () => {
            clearTimeout(timeout);
        });

        next();
    };
};

export default {
    AppError,
    ErrorFactory,
    globalErrorHandler,
    catchAsync,
    notFoundHandler,
    timeoutHandler
};