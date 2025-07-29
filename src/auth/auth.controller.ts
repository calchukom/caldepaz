import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { users, type User, type NewUser } from "../drizzle/schema";
import {
    createJWTToken,
    createRefreshToken,
    generateVerificationCode,
    blacklistToken,
    type UserRole
} from "../middleware/bearAuth";
import { EmailTemplate, sendEmail } from "../middleware/googleMailer";
import { logger } from "../middleware/logger";
import { ErrorFactory } from "../middleware/appError";
import { ResponseUtil } from "../middleware/response";

// In-memory stores (use Redis in production)
const refreshTokens: string[] = [];
const verificationCodes: Map<string, {
    code: string;
    expires: Date;
    type: 'email' | 'phone' | 'reset';
    userId?: string;
}> = new Map();

// Rate limiting store (use Redis in production)
const loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account in the system
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - email
 *               - password
 *             properties:
 *               firstname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: User's first name
 *                 example: "John"
 *               lastname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: User's last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User's password (min 8 characters)
 *                 example: "SecurePassword123!"
 *               contact_phone:
 *                 type: string
 *                 description: User's contact phone number (optional)
 *                 example: "+254700123456"
 *               address:
 *                 type: string
 *                 description: User's address (optional)
 *                 example: "123 Main St, Nairobi, Kenya"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const registerHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { firstname, lastname, email, password, contact_phone, address } = req.body;

        logger.info(`Registration attempt for email: ${email}`, {
            email: email,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Check if user already exists
        const existingUser = await db.select({ user_id: users.user_id })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (existingUser.length > 0) {
            logger.warn(`Registration failed: User already exists`, {
                email: email,
                ip: req.ip
            });
            return next(ErrorFactory.conflict("User with this email already exists", "email"));
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUserData: NewUser = {
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            contact_phone: contact_phone?.trim() || null,
            address: address?.trim() || null,
            role: "user" // Default role for public registration
        };

        const result = await db.insert(users).values(newUserData).returning({
            user_id: users.user_id,
            firstname: users.firstname,
            lastname: users.lastname,
            email: users.email,
            contact_phone: users.contact_phone,
            address: users.address,
            role: users.role,
            created_at: users.created_at,
            updated_at: users.updated_at,
        });

        if (result.length === 0) {
            throw ErrorFactory.badRequest("Failed to create user");
        }

        const newUser = result[0];

        // Generate tokens
        const accessToken = createJWTToken({
            userId: newUser.user_id,
            email: newUser.email,
            role: newUser.role,
            firstname: newUser.firstname,
            lastname: newUser.lastname,
            contact_phone: newUser.contact_phone || undefined
        });

        const refreshToken = createRefreshToken({
            userId: newUser.user_id,
            email: newUser.email,
            role: "user"
        });

        // Store refresh token
        refreshTokens.push(refreshToken);

        // Send welcome email
        try {
            const emailResult = await sendEmail({
                to: newUser.email,
                subject: "Welcome to Vehicle Rental System",
                template: EmailTemplate.WELCOME,
                data: {
                    firstName: newUser.firstname,
                    lastName: newUser.lastname,
                    fullName: `${newUser.firstname} ${newUser.lastname}`,
                    email: newUser.email
                }
            });

            if (emailResult.success) {
                logger.info(`Welcome email sent to: ${newUser.email}`, {
                    userId: newUser.user_id,
                    emailType: "welcome"
                });
            } else {
                logger.warn(`Failed to send welcome email`, {
                    error: emailResult.error,
                    userId: newUser.user_id,
                    emailType: "welcome"
                });
            }
        } catch (emailError) {
            logger.warn("Failed to send welcome email", {
                error: emailError,
                userId: newUser.user_id,
                emailType: "welcome"
            });
        }

        logger.info(`User registered successfully: ${email}`, {
            userId: newUser.user_id,
            email: newUser.email
        });

        ResponseUtil.created(res, {
            user: {
                id: newUser.user_id,          // Frontend expects 'id'
                user_id: newUser.user_id,     // Keep for backward compatibility
                firstname: newUser.firstname,
                lastname: newUser.lastname,
                email: newUser.email,
                contact_phone: newUser.contact_phone,
                address: newUser.address,
                role: newUser.role,
                created_at: newUser.created_at,
                updated_at: newUser.updated_at
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, "User registered successfully");

    } catch (error: any) {
        logger.error("Registration error", {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });
        next(error);
    }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "SecurePassword123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const loginHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const clientIp = req.ip || 'unknown';

        logger.info(`Login attempt for email: ${email}`, {
            email: email,
            ip: clientIp,
            userAgent: req.headers['user-agent']
        });

        // Check rate limiting
        const attemptKey = `${email}:${clientIp}`;
        const attempts = loginAttempts.get(attemptKey);
        const now = new Date();

        if (attempts) {
            // Reset attempts if more than 15 minutes have passed
            if (now.getTime() - attempts.lastAttempt.getTime() > 15 * 60 * 1000) {
                loginAttempts.delete(attemptKey);
            } else if (attempts.count >= 5) {
                logger.warn(`Rate limit exceeded for login attempt`, {
                    email: email,
                    ip: clientIp,
                    attempts: attempts.count
                });
                return next(ErrorFactory.rateLimit("Too many login attempts. Please try again later."));
            }
        }

        // Find user
        const userResult = await db.select({
            user_id: users.user_id,
            firstname: users.firstname,
            lastname: users.lastname,
            email: users.email,
            password: users.password,
            contact_phone: users.contact_phone,
            address: users.address,
            role: users.role,
            created_at: users.created_at,
            updated_at: users.updated_at
        })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (userResult.length === 0) {
            // Increment failed attempts
            const currentAttempts = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: now };
            loginAttempts.set(attemptKey, { count: currentAttempts.count + 1, lastAttempt: now });

            logger.warn(`Login failed: User not found`, {
                email: email,
                ip: clientIp
            });
            return next(ErrorFactory.unauthorized("Invalid email or password"));
        }

        const user = userResult[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Increment failed attempts
            const currentAttempts = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: now };
            loginAttempts.set(attemptKey, { count: currentAttempts.count + 1, lastAttempt: now });

            logger.warn(`Login failed: Invalid password`, {
                email: email,
                ip: clientIp,
                userId: user.user_id
            });
            return next(ErrorFactory.unauthorized("Invalid email or password"));
        }

        // Clear failed attempts on successful login
        loginAttempts.delete(attemptKey);

        // Generate tokens
        const accessToken = createJWTToken({
            userId: user.user_id,
            email: user.email,
            role: user.role,
            firstname: user.firstname,
            lastname: user.lastname,
            contact_phone: user.contact_phone || undefined
        });

        const refreshToken = createRefreshToken({
            userId: user.user_id,
            email: user.email,
            role: "user"
        });

        // Store refresh token
        refreshTokens.push(refreshToken);

        logger.info(`User logged in successfully: ${email}`, {
            userId: user.user_id,
            ip: clientIp
        });

        // Return user data without password
        const userResponse = {
            id: user.user_id,          // Frontend expects 'id'
            user_id: user.user_id,     // Keep for backward compatibility
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            contact_phone: user.contact_phone,
            address: user.address,
            role: user.role,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        ResponseUtil.success(res, {
            user: userResponse,
            accessToken,
            refreshToken
        }, "Login successful");

    } catch (error: any) {
        logger.error("Login error", {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });
        next(error);
    }
};

/**
 * Refresh Token
 * @route POST /api/auth/refresh
 * @access Public
 */
export const refreshTokenHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Try to get refresh token from body first, then from Authorization header
        let refreshToken = req.body.refreshToken;

        if (!refreshToken) {
            const authHeader = req.headers.authorization;
            refreshToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        }

        if (!refreshToken) {
            return next(ErrorFactory.unauthorized("No refresh token provided"));
        }

        // Log token details for debugging (first 50 chars only for security)
        logger.info("Refresh token attempt", {
            tokenSource: req.body.refreshToken ? 'body' : 'header',
            tokenPreview: refreshToken.substring(0, 50) + '...',
            tokenLength: refreshToken.length
        });

        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as any;

            // Find user
            const userResult = await db.select({
                user_id: users.user_id,
                firstname: users.firstname,
                lastname: users.lastname,
                email: users.email,
                contact_phone: users.contact_phone,
                address: users.address,
                role: users.role
            })
                .from(users)
                .where(eq(users.user_id, decoded.userId))
                .limit(1);

            if (userResult.length === 0) {
                return next(ErrorFactory.unauthorized("User not found"));
            }

            const user = userResult[0];

            // Generate new access token
            const newAccessToken = createJWTToken({
                userId: user.user_id,
                email: user.email,
                role: user.role,
                firstname: user.firstname,
                lastname: user.lastname,
                contact_phone: user.contact_phone || undefined
            });

            logger.info(`Token refreshed for user: ${user.email}`, {
                userId: user.user_id
            });

            ResponseUtil.success(res, {
                accessToken: newAccessToken
            }, "Token refreshed successfully");

        } catch (jwtError) {
            logger.warn("Invalid refresh token attempt", {
                error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
                tokenSource: req.body.refreshToken ? 'body' : 'header',
                hasToken: !!refreshToken,
                tokenLength: refreshToken?.length || 0,
                tokenStructure: {
                    hasBearer: refreshToken?.startsWith('Bearer ') || false,
                    hasDots: (refreshToken?.match(/\./g) || []).length,
                    isBase64Like: /^[A-Za-z0-9+/]+=*$/.test(refreshToken?.split('.')[1] || '')
                }
            });
            return next(ErrorFactory.unauthorized("Invalid refresh token"));
        }

    } catch (error: any) {
        logger.error("Refresh token error", {
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};

/**
 * Logout
 * @route POST /api/auth/logout
 * @access Private
 */
export const logoutHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        const authHeader = req.headers.authorization;

        // Remove refresh token
        if (refreshToken) {
            const index = refreshTokens.indexOf(refreshToken);
            if (index > -1) {
                refreshTokens.splice(index, 1);
            }
        }

        // Blacklist access token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
                await blacklistToken(token, decoded.email, decoded.exp);
            } catch (error) {
                // Token might be invalid, but we still want to complete logout
                logger.warn('Failed to decode token for blacklisting', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        logger.info(`User logged out`, {
            userId: req.user?.userId,
            ip: req.ip
        });

        ResponseUtil.success(res, null, "Logged out successfully");

    } catch (error: any) {
        logger.error("Logout error", {
            error: error.message,
            stack: error.stack,
            userId: req.user?.userId
        });
        next(error);
    }
};

/**
 * Forgot Password
 * @route POST /api/auth/forgot-password
 * @access Public
 */

/**
 * Reset Password
 * @route POST /api/auth/reset-password
 * @access Public
 */
/**
 * Change Password
 * @route PUT /api/auth/change-password
 * @access Private
 */
export const changePasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return next(ErrorFactory.unauthorized("Authentication required"));
        }

        // Find user
        const userResult = await db.select({
            user_id: users.user_id,
            email: users.email,
            password: users.password
        })
            .from(users)
            .where(eq(users.user_id, userId))
            .limit(1);

        if (userResult.length === 0) {
            return next(ErrorFactory.notFound("User"));
        }

        const user = userResult[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return next(ErrorFactory.badRequest("Current password is incorrect", "currentPassword"));
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await db.update(users)
            .set({
                password: hashedPassword,
                updated_at: new Date()
            })
            .where(eq(users.user_id, userId));

        logger.info(`Password changed for user: ${user.email}`, {
            userId: user.user_id
        });

        ResponseUtil.success(res, null, "Password changed successfully");

    } catch (error: any) {
        logger.error("Change password error", {
            error: error.message,
            stack: error.stack,
            userId: req.user?.userId
        });
        next(error);
    }
};

// Add this new handler after forgotPasswordHandler
/**
 * Reset Password with Code
 * @route POST /api/auth/reset-password-with-code
 * @access Public
 */
export const resetPasswordWithCodeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, resetCode, newPassword } = req.body;

        logger.info(`Password reset with code attempt for email: ${email}`, {
            email: email,
            ip: req.ip
        });

        // Check if reset code exists and is valid
        const codeData = verificationCodes.get(resetCode);
        if (!codeData || codeData.type !== 'reset' || codeData.expires < new Date()) {
            logger.warn(`Invalid or expired reset code attempt`, {
                email: email,
                ip: req.ip
                // Reset code not logged for security reasons
            });
            return next(ErrorFactory.badRequest("Invalid or expired reset code", "resetCode"));
        }

        // Verify the email matches the user
        const userResult = await db.select({ email: users.email })
            .from(users)
            .where(eq(users.user_id, codeData.userId!))
            .limit(1);

        if (userResult.length === 0 || userResult[0].email.toLowerCase() !== email.toLowerCase()) {
            logger.warn(`Reset code email mismatch`, {
                email: email,
                ip: req.ip
            });
            return next(ErrorFactory.badRequest("Invalid or expired reset code", "resetCode"));
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        const result = await db.update(users)
            .set({
                password: hashedPassword,
                updated_at: new Date()
            })
            .where(eq(users.user_id, codeData.userId!))
            .returning({ user_id: users.user_id, email: users.email });

        if (result.length === 0) {
            return next(ErrorFactory.notFound("User"));
        }

        // Remove the used code
        verificationCodes.delete(resetCode);

        logger.info(`Password reset with code successful for user: ${result[0].email}`, {
            userId: result[0].user_id
        });

        ResponseUtil.success(res, null, "Password reset successfully");

    } catch (error: any) {
        logger.error("Reset password with code error", {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });
        next(error);
    }
};

// Update the forgotPasswordHandler to generate both token and code:
export const forgotPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;

        logger.info(`Password reset request for email: ${email}`, {
            email: email,
            ip: req.ip
        });

        // Find user
        const userResult = await db.select({
            user_id: users.user_id,
            firstname: users.firstname,
            lastname: users.lastname,
            email: users.email
        })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (userResult.length === 0) {
            // Don't reveal if user exists or not for security
            ResponseUtil.success(res, null, "If the email exists, a password reset code has been sent");
            return;
        }

        const user = userResult[0];

        // Generate 6-digit reset code
        const resetCode = generateVerificationCode();

        // Store code with expiration (15 minutes)
        const expirationTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Use resetCode as the key for simpler lookup
        verificationCodes.set(resetCode, {
            code: resetCode,
            expires: expirationTime,
            type: 'reset',
            userId: user.user_id
        });

        // Send reset email with the 6-digit code
        try {
            const emailResult = await sendEmail({
                to: user.email,
                subject: "Password Reset Code",
                template: EmailTemplate.PASSWORD_RESET,
                data: {
                    firstName: user.firstname,
                    lastName: user.lastname,
                    verificationCode: resetCode,
                    expiresIn: "15"
                }
            });

            if (!emailResult.success) {
                logger.error(`Failed to send password reset email`, {
                    error: emailResult.error,
                    userId: user.user_id,
                    emailType: "password_reset"
                });

                // Remove the stored code if email failed
                verificationCodes.delete(resetCode);

                return next(ErrorFactory.internal("Failed to send reset email. Please try again later."));
            }

            logger.info(`Password reset email sent successfully to: ${user.email}`, {
                userId: user.user_id,
                emailType: "password_reset"
                // resetCode removed for security - never log sensitive credentials
            });

        } catch (emailError) {
            logger.error("Failed to send password reset email", {
                error: emailError,
                userId: user.user_id,
                emailType: "password_reset"
            });

            // Remove the stored code if email failed
            verificationCodes.delete(resetCode); return next(ErrorFactory.internal("Failed to send reset email. Please try again later."));
        }

        ResponseUtil.success(res, null, "Password reset code has been sent to your email");

    } catch (error: any) {
        logger.error("Forgot password error", {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });
        next(error);
    }
};

/**
 * Get Current User Profile
 * @route GET /api/auth/me
 * @access Private
 */
export const getMeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.userId; // Fixed: changed user_id to userId

        if (!userId) {
            logger.warn('Get profile attempt without valid user ID', {
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            return next(ErrorFactory.unauthorized('User not authenticated'));
        }

        logger.info(`Get profile request for user: ${userId}`, {
            userId: userId,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Get user from database
        const userResult = await db.select({
            user_id: users.user_id,
            firstname: users.firstname,
            lastname: users.lastname,
            email: users.email,
            contact_phone: users.contact_phone,
            address: users.address,
            role: users.role,
            created_at: users.created_at,
            updated_at: users.updated_at
        })
            .from(users)
            .where(eq(users.user_id, userId))
            .limit(1);

        if (userResult.length === 0) {
            logger.warn(`User not found in database: ${userId}`, {
                userId: userId,
                ip: req.ip
            });
            return next(ErrorFactory.notFound('User not found'));
        }

        const user = userResult[0];

        logger.info(`Profile retrieved successfully for user: ${userId}`, {
            userId: userId,
            email: user.email,
            role: user.role
        });

        ResponseUtil.success(res, {
            user: {
                id: user.user_id,          // Frontend expects 'id'
                user_id: user.user_id,     // Keep for backward compatibility
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                contact_phone: user.contact_phone,
                address: user.address,
                role: user.role,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        }, 'Profile retrieved successfully');
    } catch (error) {
        logger.error('Error getting user profile:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        next(ErrorFactory.internal('Failed to get user profile'));
    }
};

/**
 * Reset Password Handler
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { resetCode, newPassword } = req.body;

        logger.info(`Password reset attempt with code`, {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Find the reset code
        const codeData = verificationCodes.get(resetCode);

        if (!codeData || codeData.type !== 'reset') {
            logger.warn(`Invalid reset code used`, {
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            return next(ErrorFactory.badRequest("Invalid reset code"));
        }

        // Check if code is expired
        if (new Date() > codeData.expires) {
            logger.warn(`Expired reset code used`, {
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            verificationCodes.delete(resetCode);
            return next(ErrorFactory.badRequest("Reset code has expired"));
        }

        const userId = codeData.userId;
        if (!userId) {
            logger.error(`Reset code missing user ID`, {
                ip: req.ip
            });
            verificationCodes.delete(resetCode);
            return next(ErrorFactory.badRequest("Invalid reset code"));
        }

        // Hash the new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user's password
        const updateResult = await db.update(users)
            .set({
                password: hashedPassword,
                updated_at: new Date()
            })
            .where(eq(users.user_id, userId))
            .returning({
                user_id: users.user_id,
                email: users.email,
                firstname: users.firstname,
                lastname: users.lastname
            });

        if (updateResult.length === 0) {
            logger.error(`User not found during password reset`, {
                userId: userId,
                ip: req.ip
            });
            verificationCodes.delete(resetCode);
            return next(ErrorFactory.notFound("User not found"));
        }

        const user = updateResult[0];

        // Remove the used reset code
        verificationCodes.delete(resetCode);

        // Send confirmation email
        try {
            await sendEmail({
                to: user.email,
                subject: "Password Reset Successful",
                template: EmailTemplate.PASSWORD_RESET_SUCCESS,
                data: {
                    firstName: user.firstname,
                    lastName: user.lastname,
                    resetTime: new Date().toLocaleString()
                }
            });
        } catch (emailError) {
            logger.error("Failed to send password reset confirmation email", {
                error: emailError,
                userId: user.user_id,
                emailType: "password_reset_success"
            });
            // Don't fail the request if email fails
        }

        logger.info(`Password reset successful for user: ${user.email}`, {
            userId: user.user_id,
            ip: req.ip
        });

        ResponseUtil.success(res, null, "Password reset successful");

    } catch (error: any) {
        logger.error("Reset password error", {
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });
        next(error);
    }
};