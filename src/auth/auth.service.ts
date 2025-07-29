import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { users, type User, type NewUser } from "../drizzle/schema";
import {
    createJWTToken,
    createRefreshToken,
    type UserRole
} from "../middleware/bearAuth";
import { logger } from "../middleware/logger";
import { ErrorFactory } from "../middleware/appError";

// Interface for authentication result
export interface AuthResult {
    success: boolean;
    user?: Omit<User, 'password'>;
    tokens?: {
        accessToken: string;
        refreshToken: string;
    };
    message?: string;
}

// Interface for token validation result
export interface TokenValidationResult {
    valid: boolean;
    user?: Omit<User, 'password'>;
    message?: string;
}

// Interface for user creation data
export interface CreateUserData {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    contact_phone?: string | null;
    address?: string | null;
    role?: UserRole;
}

/**
 * Authenticate user with email and password
 */
export const authenticateUser = async (email: string, password: string): Promise<AuthResult> => {
    try {
        logger.info(`Authentication attempt for: ${email}`, {
            email: email
        });

        // Get user by email
        const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

        if (userResult.length === 0) {
            logger.warn(`Authentication failed: User not found`, {
                email: email
            });
            return {
                success: false,
                message: "Invalid email or password"
            };
        }

        const user = userResult[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn(`Authentication failed: Invalid password`, {
                email: email,
                userId: user.user_id
            });
            return {
                success: false,
                message: "Invalid email or password"
            };
        }

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
            role: user.role
        });

        // Remove password from user object
        const { password: _, ...userWithoutPassword } = user;

        logger.info(`Authentication successful for: ${email}`, {
            userId: user.user_id,
            email: user.email
        });

        return {
            success: true,
            user: userWithoutPassword,
            tokens: {
                accessToken,
                refreshToken
            },
            message: "Authentication successful"
        };

    } catch (error: any) {
        logger.error("Authentication error", {
            error: error.message,
            stack: error.stack,
            email: email
        });
        throw ErrorFactory.badRequest("Authentication failed");
    }
};

/**
 * Create a new user account
 */
export const createUserAccount = async (userData: CreateUserData): Promise<Omit<User, 'password'>> => {
    try {
        logger.info(`Creating user account for: ${userData.email}`, {
            email: userData.email
        });

        // Check if user already exists
        const existingUser = await db.select({ user_id: users.user_id })
            .from(users)
            .where(eq(users.email, userData.email.toLowerCase()))
            .limit(1);

        if (existingUser.length > 0) {
            logger.warn(`User creation failed: User already exists`, {
                email: userData.email
            });
            throw ErrorFactory.conflict("User with this email already exists", "email");
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // Prepare user data
        const newUserData: NewUser = {
            firstname: userData.firstname.trim(),
            lastname: userData.lastname.trim(),
            email: userData.email.toLowerCase().trim(),
            password: hashedPassword,
            contact_phone: userData.contact_phone?.trim() || null,
            address: userData.address?.trim() || null,
            role: userData.role || "user"
        };

        // Create user
        const result = await db.insert(users).values(newUserData).returning({
            user_id: users.user_id,
            firstname: users.firstname,
            lastname: users.lastname,
            email: users.email,
            contact_phone: users.contact_phone,
            address: users.address,
            role: users.role,
            created_at: users.created_at,
            updated_at: users.updated_at
        });

        if (result.length === 0) {
            throw ErrorFactory.badRequest("Failed to create user");
        }

        const newUser = result[0];

        logger.info(`User account created successfully: ${userData.email}`, {
            userId: newUser.user_id,
            email: newUser.email
        });

        return newUser;

    } catch (error: any) {
        if (error.code === '23505') { // PostgreSQL unique violation
            logger.error("User creation failed: Email already exists", {
                error: error.message,
                email: userData.email
            });
            throw ErrorFactory.conflict("User with this email already exists", "email");
        }

        logger.error("User creation error", {
            error: error.message,
            stack: error.stack,
            email: userData.email
        });
        throw error;
    }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<Omit<User, 'password'> | null> => {
    try {
        logger.debug(`Getting user by ID: ${userId}`, {
            userId: userId
        });

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
            return null;
        }

        return userResult[0];

    } catch (error: any) {
        logger.error("Error getting user by ID", {
            error: error.message,
            stack: error.stack,
            userId: userId
        });
        throw ErrorFactory.badRequest("Failed to get user");
    }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<Omit<User, 'password'> | null> => {
    try {
        logger.debug(`Getting user by email: ${email}`, {
            email: email
        });

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
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (userResult.length === 0) {
            return null;
        }

        return userResult[0];

    } catch (error: any) {
        logger.error("Error getting user by email", {
            error: error.message,
            stack: error.stack,
            email: email
        });
        throw ErrorFactory.badRequest("Failed to get user");
    }
};

/**
 * Update user password
 */
export const updateUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    try {
        logger.info(`Updating password for user: ${userId}`, {
            userId: userId
        });

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        const result = await db.update(users)
            .set({
                password: hashedPassword,
                updated_at: new Date()
            })
            .where(eq(users.user_id, userId))
            .returning({ user_id: users.user_id });

        if (result.length === 0) {
            throw ErrorFactory.notFound("User");
        }

        logger.info(`Password updated successfully for user: ${userId}`, {
            userId: userId
        });

        return true;

    } catch (error: any) {
        logger.error("Error updating user password", {
            error: error.message,
            stack: error.stack,
            userId: userId
        });
        throw error;
    }
};

/**
 * Verify user password
 */
export const verifyUserPassword = async (userId: string, password: string): Promise<boolean> => {
    try {
        logger.debug(`Verifying password for user: ${userId}`, {
            userId: userId
        });

        const userResult = await db.select({ password: users.password })
            .from(users)
            .where(eq(users.user_id, userId))
            .limit(1);

        if (userResult.length === 0) {
            throw ErrorFactory.notFound("User");
        }

        const isValid = await bcrypt.compare(password, userResult[0].password);

        return isValid;

    } catch (error: any) {
        logger.error("Error verifying user password", {
            error: error.message,
            stack: error.stack,
            userId: userId
        });
        throw error;
    }
};
