import { Request, Response, NextFunction } from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateUserPassword,
    getUserStatistics
} from "./user.service";
import { sendEmail } from "../middleware/googleMailer";
import { logger } from "../middleware/logger";
import type { UserRole } from "../middleware/bearAuth";
import { ErrorFactory } from "../middleware/appError";
import { ResponseUtil } from "../middleware/response";

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users with filtering (Admin only)
 *     description: Retrieves all users with pagination, search, and filtering capabilities
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for user details
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, firstname, lastname, email]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
export const getUsersHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const role = req.query.role as UserRole;
        const sortBy = req.query.sortBy as string || 'created_at';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

        // Validate pagination
        if (page < 1 || limit < 1 || limit > 100) {
            return next(ErrorFactory.badRequest(
                "Invalid pagination parameters. Page must be >= 1, limit must be 1-100.",
                "pagination"
            ));
        }

        const result = await getAllUsers(page, limit, search, role, sortBy, sortOrder);

        logger.info(`Users retrieved by admin: ${req.user?.email}`, {
            page,
            limit,
            total: result.total,
            search: search || 'none',
            role: role || 'all'
        });

        ResponseUtil.paginated(
            res,
            result.users.map(user => ({
                ...user,
                id: user.user_id
            })),
            result.page,
            result.limit,
            result.total,
            "Users retrieved successfully"
        );

    } catch (error) {
        logger.error("Error retrieving users", error);
        next(error);
    }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Admin or owner
 */
export const getUserByIdHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return next(ErrorFactory.badRequest("User ID is required", "userId"));
        }

        const user = await getUserById(userId);

        if (!user) {
            return next(ErrorFactory.notFound("User"));
        }

        logger.info(`User retrieved: ${user.email}`, {
            userId: user.user_id,
            retrievedBy: req.user?.userId
        });

        ResponseUtil.success(
            res,
            {
                ...user,
                id: user.user_id
            },
            "User retrieved successfully"
        );

    } catch (error) {
        logger.error("Error retrieving user by ID", error);
        next(error);
    }
};

/**
 * Create new user
 * @route POST /api/users
 * @access Admin only
 */
export const createUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { firstname, lastname, email, password, contact_phone, address, role } = req.body;

        logger.info(`User creation attempt by admin for: ${email}`, {
            adminId: req.user?.userId,
            targetEmail: email
        });

        const newUser = await createUser({
            firstname,
            lastname,
            email,
            password,
            contact_phone,
            address,
            role: role || "user"
        });

        // Send welcome email
        try {
            const emailResult = await sendEmail({
                to: email,
                subject: "Welcome to Vehicle Rental System",
                template: "welcome",
                data: {
                    firstName: firstname,
                    lastName: lastname,
                    fullName: `${firstname} ${lastname}`,
                    email: email,
                    userType: role || "user"
                }
            });

            if (emailResult.success) {
                logger.info(`Welcome email sent to: ${email}`, {
                    emailType: "welcome",
                    userId: newUser.user_id
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

        logger.info(`User created successfully`, {
            adminId: req.user?.userId,
            newUserId: newUser.user_id,
            newUserEmail: newUser.email
        });

        ResponseUtil.created(res, {
            ...newUser,
            id: newUser.user_id
        }, "User created successfully");

    } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
            return next(ErrorFactory.conflict(error.message, "email"));
        }

        logger.error("Error creating user", error);
        next(error);
    }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Admin or owner
 */
export const updateUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;
        const { firstname, lastname, email, contact_phone, address, role } = req.body;

        if (!userId) {
            return next(ErrorFactory.badRequest("User ID is required", "userId"));
        }

        const updatedUser = await updateUser(userId, {
            firstname,
            lastname,
            email,
            contact_phone,
            address,
            role
        });

        if (!updatedUser) {
            return next(ErrorFactory.notFound("User"));
        }

        logger.info(`User updated successfully`, {
            userId: updatedUser.user_id,
            email: updatedUser.email,
            updatedBy: req.user?.userId
        });

        ResponseUtil.success(res, {
            ...updatedUser,
            id: updatedUser.user_id
        }, "User updated successfully");

    } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
            return next(ErrorFactory.conflict(error.message, "email"));
        }

        logger.error("Error updating user", error);
        next(error);
    }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Admin only
 */
export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return next(ErrorFactory.badRequest("User ID is required", "userId"));
        }

        // Prevent admin from deleting themselves
        if (req.user?.userId === userId) {
            return next(ErrorFactory.badRequest("Cannot delete your own account"));
        }

        try {
            const deleted = await deleteUser(userId);

            if (!deleted) {
                return next(ErrorFactory.notFound("User"));
            }

            logger.info(`User deleted successfully`, {
                deletedUserId: userId,
                deletedBy: req.user?.userId
            });

            ResponseUtil.success(res, null, "User deleted successfully");
        } catch (deleteError: any) {
            if (deleteError.message && deleteError.message.includes('foreign key constraint')) {
                return next(ErrorFactory.badRequest(
                    "Cannot delete user with related records. Please delete associated bookings first.",
                    "userId"
                ));
            } else {
                throw deleteError; // Re-throw for the outer catch block
            }
        }
    } catch (error) {
        logger.error("Error deleting user", error);
        next(error);
    }
};

/**
 * Update user password
 * @route PUT /api/users/:id/password
 * @access Owner only
 */
export const updatePasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            return next(ErrorFactory.badRequest("User ID is required", "userId"));
        }

        // Ensure user can only update their own password
        if (req.user?.userId !== userId) {
            return next(ErrorFactory.forbidden("You can only update your own password"));
        }

        const result = await updateUserPassword(userId, currentPassword, newPassword);

        if (!result.success) {
            return next(ErrorFactory.badRequest(result.message, "password"));
        }

        ResponseUtil.success(res, null, result.message);

    } catch (error) {
        logger.error("Error updating password", error);
        next(error);
    }
};

/**
 * Get user statistics
 * @route GET /api/users/statistics
 * @access Admin only
 */
export const getUserStatisticsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const statistics = await getUserStatistics();

        logger.info(`User statistics retrieved by admin`, {
            adminId: req.user?.userId
        });

        ResponseUtil.success(res, statistics, "User statistics retrieved successfully");

    } catch (error) {
        logger.error("Error retrieving user statistics", error);
        next(error);
    }
};

/**
 * Search users
 * @route GET /api/users/search
 * @access Admin only
 */
export const searchUsersHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const query = req.query.q as string;
        const role = req.query.role as UserRole;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!query || query.trim().length < 2) {
            return next(ErrorFactory.badRequest("Search query must be at least 2 characters long", "q"));
        }

        const result = await getAllUsers(1, limit, query.trim(), role);

        logger.info(`User search performed`, {
            adminId: req.user?.userId,
            query: query.trim(),
            role: role || 'all',
            resultCount: result.users.length
        });

        ResponseUtil.success(res, {
            users: result.users.map(user => ({
                ...user,
                id: user.user_id
            })),
            total: result.total,
            query: query.trim()
        }, "Search completed successfully");

    } catch (error) {
        logger.error("Error searching users", error);
        next(error);
    }
};


