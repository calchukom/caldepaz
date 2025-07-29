import { Router } from "express";
import {
    sendInviteHandler,
    acceptInviteHandler,
    getInviteDetailsHandler,
    revokeInviteHandler
} from "./invite.controller";
import { adminRoleAuth } from "../middleware/bearAuth";
import validate from "../middleware/validate";
import { inviteUserSchema, acceptInviteSchema, revokeInviteSchema, getInviteDetailsSchema } from "../validation/invite.validator";

const inviteRouter = Router();

/**
 * @route POST /api/auth/invite
 * @desc Send user invitation
 * @access Admin only
 */
inviteRouter.post(
    "/invite",
    adminRoleAuth,
    sendInviteHandler
);

/**
 * @route POST /api/auth/accept-invitation
 * @desc Accept invitation and create account
 * @access Public
 */
inviteRouter.post(
    "/accept-invitation",
    validate(acceptInviteSchema),
    acceptInviteHandler
);

/**
 * @route GET /api/auth/invitation/:code
 * @desc Get invitation details
 * @access Public
 */
inviteRouter.get(
    "/invitation",
    validate(getInviteDetailsSchema),
    getInviteDetailsHandler
);

/**
 * @route DELETE /api/auth/invitation/:code
 * @desc Revoke invitation
 * @access Admin only
 */
inviteRouter.delete(
    "/invitation",
    adminRoleAuth,
    validate(revokeInviteSchema),
    revokeInviteHandler
);

export default inviteRouter;