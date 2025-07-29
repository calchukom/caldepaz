import { Router } from "express";
import {
    getUsersHandler,
    getUserByIdHandler,
    createUserHandler,
    updateUserHandler,
    deleteUserHandler,
    updatePasswordHandler,
    getUserStatisticsHandler,
    searchUsersHandler
} from "./user.controller";
import { verifyToken, adminRoleAuth, ownerOrAdminAuth } from "../middleware/bearAuth";
import validate from "../middleware/validate";
import {
    apiRateLimiter,
    adminActionsRateLimiter,
    searchRateLimiter
} from "../middleware/rateLimiter";
import {
    createUserSchema,
    updateUserSchema,
    updatePasswordSchema,
    userIdParamSchema
} from "../validation/user.validator";

const userRouter = Router();

/**
 * @route GET /api/users/statistics
 * @desc Get user statistics
 * @access Admin only
 */
userRouter.get("/statistics", adminActionsRateLimiter, adminRoleAuth, getUserStatisticsHandler);

/**
 * @route GET /api/users/search
 * @desc Search users
 * @access Admin only
 */
userRouter.get("/search", searchRateLimiter, adminRoleAuth, searchUsersHandler);

/**
 * @route GET /api/users
 * @desc Get all users with pagination and filtering
 * @access Admin only
 */
userRouter.get("/", adminActionsRateLimiter, adminRoleAuth, getUsersHandler);

/**
 * @route POST /api/users
 * @desc Create new user
 * @access Admin only
 */
userRouter.post(
    "/",
    adminActionsRateLimiter,
    adminRoleAuth,
    validate(createUserSchema),
    createUserHandler
);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Admin or owner
 */
userRouter.get(
    "/details/:userId",
    apiRateLimiter,
    ownerOrAdminAuth("userId"),
    validate(userIdParamSchema),
    getUserByIdHandler
);

/**
 * @route PUT /api/users/:id
 * @desc Update user
 * @access Admin or owner
 */
userRouter.put(
    "/update/:userId",
    apiRateLimiter,
    ownerOrAdminAuth("userId"),
    validate(updateUserSchema),
    updateUserHandler
);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user
 * @access Admin only
 */
userRouter.delete("/delete/:userId", adminRoleAuth, validate(userIdParamSchema), deleteUserHandler);

/**
 * @route PUT /api/users/:id/password
 * @desc Update user password
 * @access Owner only (users can only change their own password)
 */
userRouter.put(
    "/password/:userId",
    verifyToken, // Only authenticated users, ownership check in controller
    validate(updatePasswordSchema),
    updatePasswordHandler
);

export default userRouter;
