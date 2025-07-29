import { Response } from 'express';
import { logger } from './logger';

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    timestamp: string;
    pagination?: PaginationInfo;
    error?: {
        code: string;
        details?: any;
    };
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export class ResponseUtil {
    /**
     * Success response
     */
    static success<T>(res: Response, data: T, message: string = 'Success'): void {
        const response: ApiResponse<T> = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    }

    /**
     * Created response (201)
     */
    static created<T>(res: Response, data: T, message: string = 'Resource created successfully'): void {
        const response: ApiResponse<T> = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        res.status(201).json(response);
    }

    /**
     * Updated response
     */
    static updated<T>(res: Response, data: T, message: string = 'Resource updated successfully'): void {
        const response: ApiResponse<T> = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    }

    /**
     * Deleted response
     */
    static deleted(res: Response, message: string = 'Resource deleted successfully'): void {
        const response: ApiResponse<null> = {
            success: true,
            message,
            data: null,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    }

    /**
     * Paginated response
     */
    static paginated<T>(
        res: Response,
        data: T[],
        page: number,
        limit: number,
        total: number,
        message: string = 'Data retrieved successfully'
    ): void {
        const totalPages = Math.ceil(total / limit);

        const pagination: PaginationInfo = {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
        };

        const response: ApiResponse<T[]> = {
            success: true,
            message,
            data,
            pagination,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    }

    /**
     * No content response (204)
     */
    static noContent(res: Response): void {
        res.status(204).send();
    }

    /**
     * Error response
     */
    static error(
        res: Response,
        statusCode: number,
        message: string,
        errorCode?: string,
        details?: any
    ): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: errorCode || 'UNKNOWN_ERROR',
                details
            }
        };

        logger.error('API Error Response', {
            statusCode,
            message,
            errorCode,
            details
        });

        res.status(statusCode).json(response);
    }

    /**
     * Validation error response (400)
     */
    static validationError(
        res: Response,
        errors: any[],
        message: string = 'Validation failed'
    ): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: 'VALIDATION_ERROR',
                details: errors
            }
        };

        res.status(400).json(response);
    }

    /**
     * Unauthorized response (401)
     */
    static unauthorized(res: Response, message: string = 'Unauthorized access'): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: 'UNAUTHORIZED'
            }
        };

        res.status(401).json(response);
    }

    /**
     * Forbidden response (403)
     */
    static forbidden(res: Response, message: string = 'Forbidden access'): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: 'FORBIDDEN'
            }
        };

        res.status(403).json(response);
    }

    /**
     * Not found response (404)
     */
    static notFound(res: Response, resource: string = 'Resource'): void {
        const response: ApiResponse<null> = {
            success: false,
            message: `${resource} not found`,
            timestamp: new Date().toISOString(),
            error: {
                code: 'NOT_FOUND'
            }
        };

        res.status(404).json(response);
    }

    /**
     * Conflict response (409)
     */
    static conflict(res: Response, message: string, details?: any): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: 'CONFLICT',
                details
            }
        };

        res.status(409).json(response);
    }

    /**
     * Too many requests response (429)
     */
    static tooManyRequests(res: Response, message: string = 'Too many requests'): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: 'TOO_MANY_REQUESTS'
            }
        };

        res.status(429).json(response);
    }

    /**
     * Internal server error response (500)
     */
    static internalError(res: Response, message: string = 'Internal server error'): void {
        const response: ApiResponse<null> = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: 'INTERNAL_ERROR'
            }
        };

        res.status(500).json(response);
    }
}

/**
 * Alternative class name for compatibility with your existing code
 */
export class ResponseHandler {
    /**
     * Success response
     */
    static success<T>(res: Response<any, Record<string, any>>, result: { available: any; vehicle: any; conflicting_bookings: any; overlapping_bookings: any; }, p0: string, data: T, message: string = 'Success'): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Created response (201)
     */
    static created<T>(data: T, message: string = 'Resource created successfully'): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Updated response
     */
    static updated<T>(data: T, message: string = 'Resource updated successfully'): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Deleted response
     */
    static deleted(res: Response<any, Record<string, any>>, message: string = 'Resource deleted successfully'): ApiResponse<null> {
        return {
            success: true,
            message,
            data: null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Paginated response
     */
    static paginated<T>(
        data: T[],
        page: number,
        limit: number,
        total: number,
        message: string = 'Data retrieved successfully'
    ): ApiResponse<T[]> {
        const totalPages = Math.ceil(total / limit);

        const pagination: PaginationInfo = {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
        };

        return {
            success: true,
            message,
            data,
            pagination,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Error response
     */
    static error(message: string, errorCode?: string, details?: any): ApiResponse<null> {
        return {
            success: false,
            message,
            timestamp: new Date().toISOString(),
            error: {
                code: errorCode || 'UNKNOWN_ERROR',
                details
            }
        };
    }
}

// Export default instance
export default ResponseUtil;
