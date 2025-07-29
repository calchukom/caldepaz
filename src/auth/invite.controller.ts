import { Request, Response } from "express";
import { logger } from "../middleware/logger";
import {
    sendUserInvitation,
    acceptInvitation,
    getInvitationDetails,
    revokeInvitation
} from "./invite.service";
import type { UserRole } from "../middleware/bearAuth";

/**
 * Send user invitation
 * @route POST /api/auth/invite
 * @access Admin only
 */
export const sendInviteHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            res.status(400).json({
                success: false,
                message: "Email and role are required"
            });
            return;
        }

        if (!["user", "admin"].includes(role)) {
            res.status(400).json({
                success: false,
                message: "Invalid role. Must be 'user' or 'admin'"
            });
            return;
        }

        const invitedByUserId = req.user?.userId;
        if (!invitedByUserId) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const result = await sendUserInvitation(email, role as UserRole, invitedByUserId);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    inviteCode: result.inviteCode,
                    email,
                    role
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        logger.error("Error sending invitation", error);
        res.status(500).json({
            success: false,
            message: "Failed to send invitation"
        });
    }
};

/**
 * Accept invitation and create account
 * @route POST /api/auth/invite/accept
 * @access Public
 */
export const acceptInviteHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { inviteToken, firstname, lastname, password, contact_phone, address } = req.body;

        if (!inviteToken || !firstname || !lastname || !password) {
            res.status(400).json({
                success: false,
                message: "Invite token, firstname, lastname, and password are required"
            });
            return;
        }

        const result = await acceptInvitation(inviteToken, {
            firstname,
            lastname,
            password,
            contact_phone,
            address
        });

        if (result.success) {
            res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    user: result.user
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        logger.error("Error accepting invitation", error);
        res.status(500).json({
            success: false,
            message: "Failed to accept invitation"
        });
    }
};

/**
 * Get invitation details
 * @route GET /api/auth/invite/:token
 * @access Public
 */
export const getInviteDetailsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params;

        if (!token) {
            res.status(400).json({
                success: false,
                message: "Invitation token is required"
            });
            return;
        }

        const invitation = getInvitationDetails(token);

        if (!invitation) {
            res.status(404).json({
                success: false,
                message: "Invalid or expired invitation token"
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Invitation details retrieved successfully",
            data: invitation
        });

    } catch (error) {
        logger.error("Error getting invitation details", error);
        res.status(500).json({
            success: false,
            message: "Failed to get invitation details"
        });
    }
};

/**
 * Revoke invitation
 * @route DELETE /api/auth/invite/:token
 * @access Admin only
 */
export const revokeInviteHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params;

        if (!token) {
            res.status(400).json({
                success: false,
                message: "Invitation token is required"
            });
            return;
        }

        const revoked = revokeInvitation(token);

        if (revoked) {
            res.status(200).json({
                success: true,
                message: "Invitation revoked successfully"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Invitation not found"
            });
        }

    } catch (error) {
        logger.error("Error revoking invitation", error);
        res.status(500).json({
            success: false,
            message: "Failed to revoke invitation"
        });
    }
};
