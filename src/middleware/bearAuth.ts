import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import db from "../drizzle/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger, LogCategory } from "./logger";
import { ResponseHandler } from './response';

declare global {
    namespace Express {
        interface Request {
            user?: DecodedToken;
            authenticatedUser?: AuthenticatedUser;
        }
    }
}

// User role type matching the schema enum - Extended to include support_agent
export type UserRole = "user" | "admin" | "support_agent";

// User type for vehicle rental system - can be extended as needed
export type UserType = "user" | "admin" | "support_agent" | "guest";

export interface DecodedToken {
    user_type: any;
    userId: string; // UUID format
    email: string;
    role: UserRole;
    firstname?: string;
    lastname?: string;
    contact_phone?: string;
    iat?: number;
    exp?: number;
}

// Extended user object for authenticated requests
export interface AuthenticatedUser {
    user_id: string;
    firstname: string;
    lastname: string;
    email: string;
    role: UserRole;
    contact_phone: string | null;
    address: string | null;
    created_at: Date;
    updated_at: Date;
}

// New interface for modern authenticated requests
export interface AuthenticatedRequest extends Omit<Request, 'user'> {
    user?: {
        userId: string;
        email: string;
        role: UserRole;
        firstname?: string;
        lastname?: string;
        contact_phone?: string;
    };
    rateLimit?: {
        max: number;
        windowMs: number;
    };
}

export const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

export const generatePasswordResetToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const createJWTToken = (payload: {
    userId: string;
    email: string;
    role: UserRole;
    firstname?: string;
    lastname?: string;
    contact_phone?: string;
}): string => {
    const JWT_SECRET = process.env.JWT_SECRET!;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m"
    } as jwt.SignOptions);
};

export const createRefreshToken = (payload: {
    userId: string;
    email: string;
    role: UserRole;
}): string => {
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;
    if (!REFRESH_TOKEN_SECRET) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
    }

    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"
    } as jwt.SignOptions);
};

/**
 * Middleware to verify JWT token and attach user info to request
 */
export const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Access token is required"
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        const JWT_SECRET = process.env.JWT_SECRET!;

        if (!JWT_SECRET) {
            logger.error(LogCategory.AUTH, "JWT_SECRET is not defined");
            res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
            return;
        }

        // Check if the token is blacklisted
        if (isTokenBlacklisted(token)) {
            logger.warn("Blacklisted token used", { category: LogCategory.AUTH, token });
            res.status(401).json({
                success: false,
                message: "Invalidated token. Please log in again."
            });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

        // Fetch full user details from database
        const user = await db.select().from(users).where(eq(users.user_id, decoded.userId)).limit(1);

        if (!user || user.length === 0) {
            res.status(401).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        req.user = decoded;
        req.authenticatedUser = user[0] as AuthenticatedUser;

        logger.info(LogCategory.AUTH, `User authenticated: ${decoded.email}`);
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn("Invalid JWT token", { category: LogCategory.AUTH, error });
            res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        } else if (error instanceof jwt.TokenExpiredError) {
            logger.warn("JWT token expired", { category: LogCategory.AUTH, error });
            res.status(401).json({
                success: false,
                message: "Token expired"
            });
        } else {
            logger.error("Token verification error", error);
            res.status(500).json({
                success: false,
                message: "Token verification failed"
            });
        }
    }
};

/**
 * Modern JWT authentication middleware (compatible with new systems)
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json(
            ResponseHandler.error('Access denied. No token provided.', 'NO_TOKEN')
        );
        return;
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, jwtSecret) as any;

        // Check if the token is blacklisted
        if (isTokenBlacklisted(token)) {
            logger.warn("Blacklisted token used", { category: LogCategory.AUTH, token });
            res.status(401).json(
                ResponseHandler.error('Invalidated token. Please log in again.', 'BLACKLISTED_TOKEN')
            );
            return;
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            firstname: decoded.firstname,
            lastname: decoded.lastname,
            contact_phone: decoded.contact_phone,
            user_type: decoded.user_type || decoded.role
        };
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(403).json(
                ResponseHandler.error('Invalid token.', 'INVALID_TOKEN')
            );
            return;
        } else if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json(
                ResponseHandler.error('Token expired.', 'TOKEN_EXPIRED')
            );
            return;
        } else {
            res.status(500).json(
                ResponseHandler.error('Token verification failed.', 'TOKEN_VERIFICATION_ERROR')
            );
            return;
        }
    }
};

/**
 * Middleware that requires admin role
 */
export const adminRoleAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    await verifyToken(req, res, () => {
        if (!req.user || req.user.role !== "admin") {
            logger.warn(LogCategory.AUTH, `Access denied for non-admin user: ${req.user?.email}`);
            res.status(403).json({
                success: false,
                message: "Admin access required"
            });
            return;
        }
        next();
    });
};

/**
 * Modern middleware to require Admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || userRole !== 'admin') {
        res.status(403).json(
            ResponseHandler.error('Access denied. Admin role required.', 'ACCESS_DENIED')
        );
        return;
    }

    next();
};

/**
 * Middleware to require Admin or Support Agent role
 */
export const requireAdminOrAgent = (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !['admin', 'support_agent'].includes(userRole)) {
        res.status(403).json(
            ResponseHandler.error('Access denied. Admin or Support Agent role required.', 'ACCESS_DENIED')
        );
        return;
    }

    next();
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json(
                ResponseHandler.error(`Access denied. Required roles: ${roles.join(', ')}`, 'ACCESS_DENIED')
            );
        }

        next();
    };
};

/**
 * Middleware to check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (userIdField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const currentUserId = req.user?.userId;
        const currentUserRole = req.user?.role;
        const resourceUserId = req.params[userIdField] || req.body[userIdField];

        if (!currentUserId) {
            return res.status(401).json(
                ResponseHandler.error('Authentication required.', 'AUTH_REQUIRED')
            );
        }

        // Admin can access any resource
        if (currentUserRole === 'admin') {
            return next();
        }

        // User can only access their own resources
        if (currentUserId !== resourceUserId) {
            return res.status(403).json(
                ResponseHandler.error('Access denied. You can only access your own resources.', 'ACCESS_DENIED')
            );
        }

        next();
    };
};

/**
 * Middleware that allows both admin and regular users (authenticated users)
 */
export const userOrAdminAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    await verifyToken(req, res, () => {
        if (!req.user || !["user", "admin"].includes(req.user.role)) {
            logger.warn(LogCategory.AUTH, `Access denied for user: ${req.user?.email}`);
            res.status(403).json({
                success: false,
                message: "User authentication required"
            });
            return;
        }
        next();
    });
};

/**
 * Middleware that allows users to access only their own resources or admin to access any
 */
export const ownerOrAdminAuth = (userIdParam: string = "id") => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        await verifyToken(req, res, () => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
                return;
            }

            const targetUserId = req.params[userIdParam];
            const isOwner = req.user.userId === targetUserId;
            const isAdmin = req.user.role === "admin";

            if (!isOwner && !isAdmin) {
                logger.warn(LogCategory.AUTH,
                    `Access denied: User ${req.user.email} attempted to access resource belonging to ${targetUserId}`
                );
                res.status(403).json({
                    success: false,
                    message: "Access denied. You can only access your own resources"
                });
                return;
            }

            next();
        });
    };
};

/**
 * Optional auth middleware - attaches user if token is present but doesn't require it
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            next();
            return;
        }

        const token = authHeader.split(" ")[1];
        const JWT_SECRET = process.env.JWT_SECRET!;

        if (!JWT_SECRET) {
            next();
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

        // Fetch full user details from database
        const user = await db.select().from(users).where(eq(users.user_id, decoded.userId)).limit(1);

        if (user && user.length > 0) {
            req.user = decoded;
            req.authenticatedUser = user[0] as AuthenticatedUser;
        }

        next();
    } catch (error) {
        // Silently fail for optional auth
        next();
    }
};

/**
 * Middleware for rate limiting based on user role
 */
export const roleBasedRateLimit = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    // Admin and support agents get higher rate limits
    if (userRole === 'admin' || userRole === 'support_agent') {
        req.rateLimit = {
            max: 1000, // 1000 requests per window
            windowMs: 15 * 60 * 1000, // 15 minutes
        };
    } else {
        req.rateLimit = {
            max: 100, // 100 requests per window
            windowMs: 15 * 60 * 1000, // 15 minutes
        };
    }

    next();
};

/**
 * Middleware to check if user account is active
 */
export const requireActiveAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json(
                ResponseHandler.error('Authentication required.', 'AUTH_REQUIRED')
            );
        }

        // Fetch user details to check account status
        const user = await db.select().from(users).where(eq(users.user_id, userId)).limit(1);

        if (!user || user.length === 0) {
            return res.status(404).json(
                ResponseHandler.error('User account not found.', 'USER_NOT_FOUND')
            );
        }

        // Check if account has any suspension or deactivation flags
        // This would depend on your user schema - adjust as needed
        const userAccount = user[0];

        // Example: Check if user has an 'active' status field
        // if (userAccount.status !== 'active') {
        //     return res.status(403).json(
        //         ResponseHandler.error('Account is not active. Please contact support.')
        //     );
        // }

        next();
    } catch (error) {
        logger.error('Error checking account status', error);
        return res.status(500).json(
            ResponseHandler.error('Failed to verify account status.', 'ACCOUNT_CHECK_ERROR')
        );
    }
};

/**
 * Define token blacklist to store invalidated tokens
 */
interface BlacklistedToken {
    token: string;
    expiry: number; // UNIX timestamp when the token expires
    email: string;  // User's email for logging purposes
}

// In-memory blacklist storage (in production, consider using Redis)
const tokenBlacklist: BlacklistedToken[] = [];

// Clean up expired tokens periodically (every 1 hour)
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    const initialLength = tokenBlacklist.length;

    // Remove expired tokens
    for (let i = tokenBlacklist.length - 1; i >= 0; i--) {
        if (tokenBlacklist[i].expiry < now) {
            tokenBlacklist.splice(i, 1);
        }
    }

    const removedCount = initialLength - tokenBlacklist.length;
    if (removedCount > 0) {
        logger.info(LogCategory.AUTH, `Cleaned up ${removedCount} expired tokens from blacklist`);
    }
}, 60 * 60 * 1000); // Run every hour

/**
 * Add a token to the blacklist
 */
export const blacklistToken = (token: string, email: string, expiryTimestamp: number): void => {
    tokenBlacklist.push({
        token,
        expiry: expiryTimestamp,
        email
    });
    logger.info(LogCategory.AUTH, `Token blacklisted for user: ${email}`);
};

/**
 * Check if a token is blacklisted
 */
export const isTokenBlacklisted = (token: string): boolean => {
    return tokenBlacklist.some(item => item.token === token);
};

/**
 * Bulk blacklist tokens (useful for logout from all devices)
 */
export const bulkBlacklistTokens = (tokens: Array<{ token: string, email: string, expiry: number }>) => {
    tokens.forEach(({ token, email, expiry }) => {
        blacklistToken(token, email, expiry);
    });
    logger.info(LogCategory.AUTH, `Bulk blacklisted ${tokens.length} tokens`);
};

/**
 * Get blacklist statistics
 */
export const getBlacklistStats = () => {
    const now = Math.floor(Date.now() / 1000);
    const activeTokens = tokenBlacklist.filter(item => item.expiry > now);
    const expiredTokens = tokenBlacklist.filter(item => item.expiry <= now);

    return {
        total: tokenBlacklist.length,
        active: activeTokens.length,
        expired: expiredTokens.length,
        uniqueUsers: new Set(tokenBlacklist.map(item => item.email)).size
    };
};

/**
 * Middleware aliases for backwards compatibility
 */
export const verifyTokenMiddleware = verifyToken;
export const adminOrMemberAuth = userOrAdminAuth;

/**
 * Additional utility functions
 */

/**
 * Extract user ID from request (works with both old and new auth patterns)
 */
export const getUserId = (req: Request | AuthenticatedRequest): string | undefined => {
    // Try new pattern first
    if ('user' in req && req.user && 'userId' in req.user) {
        return req.user.userId;
    }

    // Fallback to old pattern
    if ('user' in req && req.user && 'userId' in req.user) {
        return req.user.userId;
    }

    return undefined;
};

/**
 * Extract user role from request (works with both old and new auth patterns)
 */
export const getUserRole = (req: Request | AuthenticatedRequest): UserRole | undefined => {
    // Try new pattern first
    if ('user' in req && req.user && 'role' in req.user) {
        return req.user.role;
    }

    // Fallback to old pattern
    if ('user' in req && req.user && 'role' in req.user) {
        return req.user.role;
    }

    return undefined;
};

/**
 * Check if user has any of the specified roles
 */
export const hasRole = (req: Request | AuthenticatedRequest, roles: UserRole[]): boolean => {
    const userRole = getUserRole(req);
    return userRole ? roles.includes(userRole) : false;
};

/**
 * Check if user is admin
 */
export const isAdmin = (req: Request | AuthenticatedRequest): boolean => {
    return hasRole(req, ['admin']);
};

/**
 * Check if user is admin or support agent
 */
export const isAdminOrAgent = (req: Request | AuthenticatedRequest): boolean => {
    return hasRole(req, ['admin', 'support_agent']);
};

/**
 * Enhanced error handling for authentication
 */
export const handleAuthError = (error: any, req: Request, res: Response) => {
    if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid JWT token", {
            category: LogCategory.AUTH,
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(401).json(
            ResponseHandler.error('Invalid authentication token.', 'INVALID_TOKEN')
        );
    } else if (error instanceof jwt.TokenExpiredError) {
        logger.warn("JWT token expired", {
            category: LogCategory.AUTH,
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(401).json(
            ResponseHandler.error('Authentication token has expired.', 'TOKEN_EXPIRED')
        );
    } else {
        logger.error("Authentication error", {
            category: LogCategory.AUTH,
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(500).json(
            ResponseHandler.error('Authentication service error.', 'AUTH_SERVICE_ERROR')
        );
    }
};

// Export all the required types and interfaces
export type {
    BlacklistedToken
};