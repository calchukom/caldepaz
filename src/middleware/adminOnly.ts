import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./bearAuth";
import { logger, LogCategory } from "./logger";

/**
 * Middleware to allow only admin users for Vehicle Renting Management System.
 * This middleware verifies the JWT token and ensures the user has admin role.
 */
export const adminOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            logger.warn(LogCategory.AUTH, "Admin access attempted without token");
            res.status(401).json({
                success: false,
                message: "Access token is required for admin operations"
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

        if (!ACCESS_TOKEN_SECRET) {
            logger.error(LogCategory.AUTH, "ACCESS_TOKEN_SECRET is not defined");
            res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
            return;
        }

        // Use the existing verifyToken logic but enforce admin role
        await verifyToken(req, res, () => {
            if (!req.user || req.user.role !== "admin") {
                logger.warn(LogCategory.AUTH,
                    `Non-admin user attempted admin access: ${req.user?.email || "unknown"}`
                );
                res.status(403).json({
                    success: false,
                    message: "Admin privileges required for this operation"
                });
                return;
            }

            logger.info(LogCategory.AUTH, `Admin access granted to: ${req.user.email}`);
            next();
        });

    } catch (error) {
        logger.error("Error in adminOnly middleware", { category: LogCategory.AUTH, error });
        res.status(500).json({
            success: false,
            message: "Authentication service error"
        });
    }
};

/**
 * Alternative admin-only middleware that works with the existing auth flow
 * Use this for routes that need both token verification and admin role check
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required"
        });
        return;
    }

    if (req.user.role !== "admin") {
        logger.warn(LogCategory.AUTH,
            `Non-admin user attempted admin operation: ${req.user.email}`
        );
        res.status(403).json({
            success: false,
            message: "Admin privileges required"
        });
        return;
    }

    next();
};

export default adminOnly;