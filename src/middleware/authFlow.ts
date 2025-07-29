import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface for auth flow properties
declare global {
    namespace Express {
        interface Request {
            isAuthenticated?: boolean;
        }
    }
}

/**
 * Middleware to check if user is authenticated without throwing an error
 * Returns user info if authenticated, null if not
 */
export const checkAuthStatus = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // Not authenticated - store this info but don't block request
            req.user = undefined;
            req.isAuthenticated = false;
            return next();
        }

        // Verify token (reuse your existing JWT verification logic)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET);

        req.user = decoded;
        req.isAuthenticated = true;
        next();
    } catch (error) {
        // Invalid token - treat as not authenticated
        req.user = undefined;
        req.isAuthenticated = false;
        next();
    }
};

/**
 * Enhanced auth status endpoint for frontend to check authentication
 */
export const getAuthStatus = (req: Request, res: Response): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.json({
                isAuthenticated: false,
                user: null,
                requiresAuth: true
            });
            return;
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET);

        res.json({
            isAuthenticated: true,
            user: {
                user_id: decoded.user_id,
                email: decoded.email,
                firstname: decoded.firstname,
                lastname: decoded.lastname,
                role: decoded.role
            },
            requiresAuth: false
        });
    } catch (error) {
        res.json({
            isAuthenticated: false,
            user: null,
            requiresAuth: true,
            error: 'Invalid token'
        });
    }
};

/**
 * Booking initiation endpoint that handles auth checking
 */
export const initiateBooking = (req: Request, res: Response): void => {
    const { vehicleId } = req.params;
    const { returnUrl } = req.query;

    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // User not authenticated - return auth required response
            res.json({
                requiresAuth: true,
                authUrl: `/login`,
                returnUrl: returnUrl || `/bookings/create?vehicleId=${vehicleId}`,
                vehicleId,
                message: 'Authentication required to proceed with booking'
            });
            return;
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET);

        // User is authenticated - proceed to booking
        res.json({
            requiresAuth: false,
            user: {
                user_id: decoded.user_id,
                email: decoded.email,
                firstname: decoded.firstname,
                lastname: decoded.lastname
            },
            bookingUrl: `/bookings/create?vehicleId=${vehicleId}`,
            vehicleId,
            message: 'Ready to proceed with booking'
        });
    } catch (error) {
        // Invalid token - treat as not authenticated
        res.json({
            requiresAuth: true,
            authUrl: `/login`,
            returnUrl: returnUrl || `/bookings/create?vehicleId=${vehicleId}`,
            vehicleId,
            error: 'Invalid authentication token',
            message: 'Please login to proceed with booking'
        });
    }
};