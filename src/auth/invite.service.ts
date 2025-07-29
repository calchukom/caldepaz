import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { users, type User, type NewUser } from "../drizzle/schema";
import logger, { LogCategory } from "../middleware/logger";
import { sendEmail } from "../middleware/googleMailer";
import { generateVerificationCode, type UserRole } from "../middleware/bearAuth";
import bcrypt from "bcrypt";

// In-memory store for invite codes (use Redis in production)
const inviteCodes: Map<string, {
    code: string;
    email: string;
    role: UserRole;
    invitedBy: string;
    expires: Date;
}> = new Map();

/**
 * Send user invitation (Admin only)
 */
export const sendUserInvitation = async (
    email: string,
    role: UserRole,
    invitedByUserId: string
): Promise<{ success: boolean; message: string; inviteCode?: string }> => {
    try {
        logger.info(LogCategory.AUTH, `Sending invitation to: ${email}`);

        // Check if user already exists
        const existingUser = await db.select({ user_id: users.user_id })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (existingUser.length > 0) {
            return {
                success: false,
                message: "User with this email already exists"
            };
        }

        // Generate invitation code
        const inviteCode = generateVerificationCode();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store invitation
        inviteCodes.set(inviteCode, {
            code: inviteCode,
            email: email.toLowerCase(),
            role,
            invitedBy: invitedByUserId,
            expires
        });

        // Send invitation email
        const emailResult = await sendEmail({
            to: email,
            subject: "Invitation to Vehicle Rental System",
            template: "invitation",
            data: {
                inviteCode,
                role,
                expiresIn: "24 hours",
                acceptUrl: `${process.env.FRONTEND_URL}/accept-invitation?code=${inviteCode}`
            }
        });

        if (!emailResult.success) {
            // Remove the code if email failed
            inviteCodes.delete(inviteCode);
            return {
                success: false,
                message: "Failed to send invitation email"
            };
        }

        logger.info(LogCategory.AUTH, `Invitation sent successfully to: ${email}`);
        return {
            success: true,
            message: "Invitation sent successfully",
            inviteCode
        };

    } catch (error) {
        logger.error(LogCategory.AUTH, `Error sending invitation to: ${email}: ${error}`);
        return {
            success: false,
            message: "Failed to send invitation"
        };
    }
};

/**
 * Accept user invitation and create account
 */
export const acceptInvitation = async (
    inviteCode: string,
    userData: {
        firstname: string;
        lastname: string;
        password: string;
        contact_phone?: string;
        address?: string;
    }
): Promise<{ success: boolean; message: string; user?: Omit<User, 'password'> }> => {
    try {
        logger.info(LogCategory.AUTH, `Processing invitation acceptance with code: ${inviteCode}`);

        // Get invitation details
        const invitation = inviteCodes.get(inviteCode);
        if (!invitation) {
            return {
                success: false,
                message: "Invalid or expired invitation code"
            };
        }

        // Check if invitation has expired
        if (new Date() > invitation.expires) {
            inviteCodes.delete(inviteCode);
            return {
                success: false,
                message: "Invitation code has expired"
            };
        }

        // Check if user already exists
        const existingUser = await db.select({ user_id: users.user_id })
            .from(users)
            .where(eq(users.email, invitation.email))
            .limit(1);

        if (existingUser.length > 0) {
            inviteCodes.delete(inviteCode);
            return {
                success: false,
                message: "User with this email already exists"
            };
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // Create user
        const newUserData: NewUser = {
            firstname: userData.firstname.trim(),
            lastname: userData.lastname.trim(),
            email: invitation.email,
            password: hashedPassword,
            contact_phone: userData.contact_phone?.trim() || null,
            address: userData.address?.trim() || null,
            role: invitation.role
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
            throw new Error("Failed to create user");
        }

        const newUser = result[0];

        // Remove invitation code
        inviteCodes.delete(inviteCode);

        logger.info(LogCategory.AUTH, `User created successfully from invitation: ${newUser.email}`);
        return {
            success: true,
            message: "Account created successfully",
            user: newUser
        };

    } catch (error) {
        logger.error(LogCategory.AUTH, `Error accepting invitation: ${inviteCode}: ${error}`);
        return {
            success: false,
            message: "Failed to create account"
        };
    }
};

/**
 * Get invitation details by code
 */
export const getInvitationDetails = (inviteCode: string) => {
    const invitation = inviteCodes.get(inviteCode);
    if (!invitation || new Date() > invitation.expires) {
        return null;
    }

    return {
        email: invitation.email,
        role: invitation.role,
        expires: invitation.expires
    };
};

/**
 * Cancel/revoke an invitation
 */
export const revokeInvitation = (inviteCode: string): boolean => {
    return inviteCodes.delete(inviteCode);
};

/**
 * Clean up expired invitations (should be called periodically)
 */
export const cleanupExpiredInvitations = (): number => {
    const now = new Date();
    let cleaned = 0;

    for (const [code, invitation] of inviteCodes.entries()) {
        if (now > invitation.expires) {
            inviteCodes.delete(code);
            cleaned++;
        }
    }

    return cleaned;
};