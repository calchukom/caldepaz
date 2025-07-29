import { Router } from "express";
import {
    registerHandler,
    loginHandler,
    refreshTokenHandler,
    logoutHandler,
    forgotPasswordHandler,
    resetPasswordHandler,
    changePasswordHandler,
    getMeHandler
} from "./auth.controller";
import { debugToken } from "./token-debug.controller";
import {
    sendInviteHandler,
    acceptInviteHandler,
    getInviteDetailsHandler,
    revokeInviteHandler
} from "./invite.controller";
import validate from "../middleware/validate";
import { verifyToken, adminRoleAuth } from "../middleware/bearAuth";
import {
    authRateLimiter,
    registrationRateLimiter,
    passwordResetRateLimiter,
    emailVerificationRateLimiter,
    apiRateLimiter,
    resetRateLimitsForClient,
    getCurrentRateLimitStatus
} from "../middleware/rateLimiter";
import { getAuthStatus, initiateBooking } from "../middleware/authFlow";
import {
    createUserSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    resetPasswordWithCodeSchema,
    refreshTokenSchema,
    updatePasswordSchema
} from "../validation/user.validator";
import { acceptInviteSchema } from "../validation/invite.validator";

const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
authRouter.post(
    "/register",
    registrationRateLimiter,
    validate(createUserSchema),
    registerHandler
);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
authRouter.post(
    "/login",
    authRateLimiter,
    validate(loginSchema),
    loginHandler
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
authRouter.post(
    "/refresh",
    authRateLimiter,
    validate(refreshTokenSchema),
    refreshTokenHandler
);

/**
 * @route POST /api/auth/debug-token
 * @desc Debug token format and structure (development only)
 * @access Public
 */
authRouter.post(
    "/debug-token",
    debugToken
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user and invalidate tokens
 * @access Private
 */
authRouter.post(
    "/logout",
    authRateLimiter,
    verifyToken,
    logoutHandler
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
authRouter.post(
    "/forgot-password",
    passwordResetRateLimiter,
    validate(forgotPasswordSchema),
    forgotPasswordHandler
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
authRouter.post(
    "/reset-password",
    passwordResetRateLimiter,
    validate(resetPasswordSchema),
    resetPasswordHandler
);

/**
 * @route POST /api/auth/reset-password-with-code
 * @desc Reset password with 6-digit verification code
 * @access Public
 */
authRouter.post(
    "/reset-password-with-code",
    passwordResetRateLimiter,
    validate(resetPasswordWithCodeSchema),
    resetPasswordHandler
);

/**
 * @route PUT /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
authRouter.put(
    "/change-password",
    authRateLimiter,
    verifyToken,
    validate(updatePasswordSchema),
    changePasswordHandler
);


/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 * @desc Get current user details
 */
authRouter.get(
    "/me",
    apiRateLimiter,
    verifyToken,
    getMeHandler
);

// Invite routes
/**
 * @route POST /api/auth/invite
 * @desc Send invitation to new user
 * @access Admin
 */
authRouter.post(
    "/invite",
    emailVerificationRateLimiter,
    verifyToken,
    adminRoleAuth,
    sendInviteHandler
);

/**
 * @route POST /api/auth/invite/accept
 * @desc Accept invitation and create account
 * @access Public
 */
authRouter.post(
    "/invite/accept",
    registrationRateLimiter,
    validate(acceptInviteSchema),
    acceptInviteHandler
);

/**
 * @route GET /api/auth/invite/:token
 * @desc Get invitation details
 * @access Public
 */
authRouter.get(
    "/invite/:token",
    apiRateLimiter,
    getInviteDetailsHandler
);

/**
 * @route DELETE /api/auth/invite/:inviteId
 * @desc Revoke invitation
 * @access Admin
 */
authRouter.delete(
    "/invite/:inviteId",
    verifyToken,
    adminRoleAuth,
    revokeInviteHandler
);

// ============================================================================
// DEVELOPMENT ENDPOINTS (Only available in non-production environments)
// ============================================================================

/**
 * @route GET /api/auth/dev/test-cors
 * @desc Test CORS and connectivity (Development only)
 * @access Public (Development only)
 */
if (process.env.NODE_ENV !== 'production') {
    authRouter.get("/dev/test-cors", (req, res) => {
        res.json({
            success: true,
            message: 'CORS and connectivity test successful',
            data: {
                timestamp: new Date().toISOString(),
                origin: req.get('Origin'),
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                headers: {
                    origin: req.get('Origin'),
                    referer: req.get('Referer'),
                    host: req.get('Host')
                },
                corsConfig: {
                    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['fallback origins'],
                    developmentMode: process.env.NODE_ENV === 'development'
                }
            }
        });
    });

    // Add a simple ping endpoint that accepts any origin
    authRouter.get("/dev/ping", (req, res) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', '*');
        res.json({
            success: true,
            message: 'Backend is reachable',
            timestamp: new Date().toISOString(),
            origin: req.get('Origin'),
            referer: req.get('Referer')
        });
    });

    /**
     * @route POST /api/auth/dev/reset-rate-limit
    
        /**
         * @route POST /api/auth/dev/reset-rate-limit
         * @desc Reset rate limits for current client (Development only)
         * @access Public (Development only)
         */
    authRouter.post("/dev/reset-rate-limit", async (req, res) => {
        try {
            const clientId = req.ip || req.connection.remoteAddress || 'unknown';
            await resetRateLimitsForClient(clientId);

            res.json({
                success: true,
                message: `Rate limits reset for client: ${clientId}`,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to reset rate limits'
            });
        }
    });

    /**
     * @route GET /api/auth/dev/rate-limit-status
     * @desc Get current rate limit status (Development only)
     * @access Public (Development only)
     */
    authRouter.get("/dev/rate-limit-status", async (req, res) => {
        try {
            const clientId = req.ip || req.connection.remoteAddress || 'unknown';
            const limiterType = req.query.type as string || 'auth';
            const status = await getCurrentRateLimitStatus(clientId, limiterType);

            res.json({
                success: true,
                clientId,
                limiterType,
                status,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get rate limit status'
            });
        }
    });
}

/**
 * @route GET /api/auth/status
 * @desc Check authentication status for frontend
 * @access Public
 */
authRouter.get('/status', apiRateLimiter, getAuthStatus);

/**
 * @route POST /api/auth/initiate-booking/:vehicleId
 * @desc Initiate booking process with auth check
 * @access Public
 */
authRouter.post('/initiate-booking/:vehicleId', apiRateLimiter, initiateBooking);

export default authRouter;
