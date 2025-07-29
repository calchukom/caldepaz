import { Request, Response, NextFunction } from 'express';
import { isDatabaseConnected } from '../drizzle/db';
import { logger } from './logger';

// Middleware to check database connection before processing requests
export const checkDatabaseConnection = (req: Request, res: Response, next: NextFunction): void => {
    if (!isDatabaseConnected()) {
        logger.warn(`Database not connected - Request to ${req.path} may fail`);
        res.status(503).json({
            success: false,
            error: 'Database temporarily unavailable',
            message: 'The database service is currently unavailable. Please try again later.'
        });
        return;
    }
    next();
};

// Optional middleware - only logs warning but continues
export const logDatabaseStatus = (req: Request, res: Response, next: NextFunction): void => {
    if (!isDatabaseConnected()) {
        logger.warn(`Database not connected - Processing request to ${req.path} without database`);
    }
    next();
};
