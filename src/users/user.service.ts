import bcrypt from "bcrypt";
import { eq, ilike, or, desc, asc, count, and, sql } from "drizzle-orm";
import db, { pool } from "../drizzle/db";
import { users, bookings, payments, supportTickets, type User, type NewUser } from "../drizzle/schema";
import logger from "../middleware/logger";
import { AppError, ErrorFactory } from "../middleware/appError";
import type { UserRole } from "../middleware/bearAuth";
import { createUserAccount } from "../auth/auth.service";

// Interface for user search results
export interface UserSearchResult {
    users: Omit<User, 'password'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Interface for user statistics
export interface UserStatistics {
    totalUsers: number;
    totalAdmins: number;
    totalRegularUsers: number;
    recentRegistrations: number; // Last 30 days
    usersByMonth: Array<{
        month: string;
        count: number;
    }>;
}

// Interface for user update data
export interface UserUpdateData {
    firstname?: string;
    lastname?: string;
    email?: string;
    contact_phone?: string | null;
    address?: string | null;
    role?: UserRole;
}

// Interface for password update result
export interface PasswordUpdateResult {
    success: boolean;
    message: string;
}

/**
 * Get all users with pagination and search
 */
export const getAllUsers = async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: UserRole,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
): Promise<UserSearchResult> => {
    try {
        const offset = (page - 1) * limit;

        // Build where conditions
        const whereConditions = [];

        if (search) {
            whereConditions.push(
                or(
                    ilike(users.firstname, `%${search}%`),
                    ilike(users.lastname, `%${search}%`),
                    ilike(users.email, `%${search}%`)
                )
            );
        }

        if (role) {
            whereConditions.push(eq(users.role, role));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        // Get total count
        const totalResult = await db
            .select({ count: count() })
            .from(users)
            .where(whereClause);

        const total = totalResult[0]?.count || 0;

        // Get users
        const sortColumn = sortBy === 'name' ? users.firstname :
            sortBy === 'email' ? users.email :
                sortBy === 'role' ? users.role :
                    users.created_at;

        const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

        const userResults = await db
            .select({
                user_id: users.user_id,
                firstname: users.firstname,
                lastname: users.lastname,
                email: users.email,
                contact_phone: users.contact_phone,
                address: users.address,
                role: users.role,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        const totalPages = Math.ceil(total / limit);

        logger.info(`Retrieved ${userResults.length} users (page ${page}/${totalPages})`, {
            module: 'users',
            page,
            totalPages,
            total
        });

        return {
            users: userResults,
            total,
            page,
            limit,
            totalPages
        };

    } catch (error) {
        logger.error("Error retrieving users", { module: 'users', error });
        throw ErrorFactory.internal("Failed to retrieve users");
    }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<Omit<User, 'password'> | null> => {
    try {
        const userResult = await db
            .select({
                user_id: users.user_id,
                firstname: users.firstname,
                lastname: users.lastname,
                email: users.email,
                contact_phone: users.contact_phone,
                address: users.address,
                role: users.role,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users)
            .where(eq(users.user_id, userId))
            .limit(1);

        if (userResult.length === 0) {
            return null;
        }

        logger.info(`Retrieved user: ${userResult[0].email}`, { module: 'users' });
        return userResult[0];

    } catch (error) {
        logger.error(`Error retrieving user by ID: ${userId}`, { module: 'users', error });
        throw ErrorFactory.internal("Failed to retrieve user");
    }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<Omit<User, 'password'> | null> => {
    try {
        const userResult = await db
            .select({
                user_id: users.user_id,
                firstname: users.firstname,
                lastname: users.lastname,
                email: users.email,
                contact_phone: users.contact_phone,
                address: users.address,
                role: users.role,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (userResult.length === 0) {
            return null;
        }

        return userResult[0];

    } catch (error) {
        logger.error(`Error retrieving user by email: ${email}`, { module: 'users', error });
        throw ErrorFactory.internal("Failed to retrieve user");
    }
};

/**
 * Create new user (Admin only - uses auth service)
 */
export const createUser = async (userData: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    contact_phone?: string;
    address?: string;
    role?: UserRole;
}): Promise<Omit<User, 'password'>> => {
    try {
        logger.info(`Creating user: ${userData.email}`, { module: 'users' });

        // Use the auth service to create the user account
        const newUser = await createUserAccount(userData);

        logger.info(`User created successfully: ${userData.email}`, { module: 'users' });
        return newUser;

    } catch (error) {
        logger.error(`Error creating user: ${userData.email}`, { module: 'users', error });
        throw error;
    }
};

/**
 * Update user
 */
export const updateUser = async (
    userId: string,
    updateData: UserUpdateData
): Promise<Omit<User, 'password'> | null> => {
    try {
        // Check if user exists
        const existingUser = await getUserById(userId);
        if (!existingUser) {
            return null;
        }

        // Check if email is being updated and if it already exists
        if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await getUserByEmail(updateData.email);
            if (emailExists) {
                throw ErrorFactory.internal("Email already exists");
            }
        }

        // Prepare update data
        const updateFields: Partial<NewUser> = {
            updated_at: new Date()
        };

        if (updateData.firstname) updateFields.firstname = updateData.firstname.trim();
        if (updateData.lastname) updateFields.lastname = updateData.lastname.trim();
        if (updateData.email) updateFields.email = updateData.email.toLowerCase().trim();
        if (updateData.contact_phone !== undefined) updateFields.contact_phone = updateData.contact_phone?.trim() || null;
        if (updateData.address !== undefined) updateFields.address = updateData.address?.trim() || null;
        if (updateData.role) updateFields.role = updateData.role;

        const result = await db
            .update(users)
            .set(updateFields)
            .where(eq(users.user_id, userId))
            .returning({
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
            return null;
        }

        logger.info(`User updated: ${existingUser.email}`, { module: 'users' });
        return result[0];

    } catch (error) {
        logger.error(`Error updating user: ${userId}`, { module: 'users', error });
        throw error;
    }
};

/**
 * Delete user
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
    try {
        // First, check if the user exists
        const userResult = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.user_id, userId))
            .limit(1);

        if (userResult.length === 0) {
            logger.warn(`Attempted to delete non-existent user: ${userId}`, { module: 'users' });
            return false;
        }

        const userEmail = userResult[0].email;

        // Start a database transaction (simplified for Neon)
        // const client = await pool.connect(); // Disabled for Neon
        try {
            // await client.query('BEGIN'); // Disabled for Neon
            // 1. Find all bookings associated with this user
            const userBookings = await db
                .select({ bookingId: bookings.booking_id })
                .from(bookings)
                .where(eq(bookings.user_id, userId));

            // 2. Delete all payments associated with these bookings
            if (userBookings.length > 0) {
                for (const booking of userBookings) {
                    await db.delete(payments)
                        .where(eq(payments.booking_id, booking.bookingId));
                }
            }

            // 3. Delete support tickets associated with this user
            await db.delete(supportTickets)
                .where(eq(supportTickets.user_id, userId));

            // 4. Delete all bookings associated with this user
            await db.delete(bookings)
                .where(eq(bookings.user_id, userId));

            // 5. Finally delete the user
            await db.delete(users)
                .where(eq(users.user_id, userId));

            // await client.query('COMMIT'); // Disabled for Neon
            logger.info(`User deleted: ${userEmail}`, { module: 'users' });
            return true;
        } catch (txError) {
            // If something goes wrong, rollback the transaction
            // await client.query('ROLLBACK'); // Disabled for Neon
            logger.error(`Transaction error deleting user: ${userId}`, { module: 'users', txError });
            throw txError;
        } finally {
            // Always release the client back to the pool
            // client.release(); // Disabled for Neon
        }
    } catch (error) {
        logger.error(`Error deleting user: ${userId}`, { module: 'users', error });
        throw ErrorFactory.internal("Failed to delete user");
    }
};

/**
 * Update user password
 */
export const updateUserPassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
): Promise<PasswordUpdateResult> => {
    try {
        // Get user with password
        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.user_id, userId))
            .limit(1);

        if (userResult.length === 0) {
            return { success: false, message: "User not found" };
        }

        const user = userResult[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            logger.warn(`Password update failed: Invalid current password - ${userId}`, { module: 'users' });
            return { success: false, message: "Current password is incorrect" };
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await db
            .update(users)
            .set({
                password: hashedNewPassword,
                updated_at: new Date()
            })
            .where(eq(users.user_id, userId));

        logger.info(`Password updated for user: ${user.email}`, { module: 'users' });
        return { success: true, message: "Password updated successfully" };

    } catch (error) {
        logger.error(`Error updating password for user: ${userId}`, { module: 'users', error });
        return { success: false, message: "Password update failed" };
    }
};

/**
 * Get user statistics (admin only)
 */
export const getUserStatistics = async (): Promise<UserStatistics> => {
    try {
        // Get total users
        const totalUsersResult = await db.select({ count: count() }).from(users);
        const totalUsers = totalUsersResult[0]?.count || 0;

        // Get users by role
        const adminUsersResult = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.role, 'admin'));
        const totalAdmins = adminUsersResult[0]?.count || 0;

        const regularUsersResult = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.role, 'user'));
        const totalRegularUsers = regularUsersResult[0]?.count || 0;

        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentRegistrationsResult = await db
            .select({ count: count() })
            .from(users)
            .where(and(
                eq(users.role, 'user'),
                // Note: You might need to adjust this based on your timestamp column
            ));
        const recentRegistrations = recentRegistrationsResult[0]?.count || 0;

        // For now, return basic statistics
        // You can enhance this with more complex queries for monthly breakdowns
        const usersByMonth = [
            { month: 'Current Month', count: recentRegistrations }
        ];

        logger.info("User statistics retrieved", { module: 'users' });

        return {
            totalUsers,
            totalAdmins,
            totalRegularUsers,
            recentRegistrations,
            usersByMonth
        };

    } catch (error) {
        logger.error("Error retrieving user statistics", { module: 'users', error });
        throw ErrorFactory.internal("Failed to retrieve user statistics");
    }
};

/**
 * Check if user exists by email
 */
export const userExistsByEmail = async (email: string): Promise<boolean> => {
    try {
        const result = await db
            .select({ user_id: users.user_id })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        return result.length > 0;

    } catch (error) {
        logger.error(`Error checking user existence: ${email}`, { module: 'users', error });
        return false;
    }
};
