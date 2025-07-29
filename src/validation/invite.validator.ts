import { z } from "zod";

// Invite user schema
export const inviteUserSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email format")
            .max(255, "Email must be less than 255 characters")
            .toLowerCase(),
        role: z.enum(["user", "admin"]).default("user")
    })
});

// Accept invitation schema
export const acceptInviteSchema = z.object({
    body: z.object({
        inviteToken: z.string()
            .min(6, "Invitation token is required"),
        firstname: z.string()
            .min(1, "First name is required")
            .max(100, "First name must be less than 100 characters")
            .trim(),
        lastname: z.string()
            .min(1, "Last name is required")
            .max(100, "Last name must be less than 100 characters")
            .trim(),
        password: z.string()
            .min(6, "Password must be at least 6 characters")
            .max(255, "Password must be less than 255 characters"),
        contact_phone: z.string()
            .regex(/^\+254[0-9]{9}$/, "Phone number must be in format +254XXXXXXXXX")
            .optional(),
        address: z.string()
            .max(1000, "Address must be less than 1000 characters")
            .optional()
    })
});

// Revoke invitation schema  
export const revokeInviteSchema = z.object({
    params: z.object({
        token: z.string()
            .min(6, "Invitation token is required")
    })
});

// Get invitation details schema
export const getInviteDetailsSchema = z.object({
    params: z.object({
        token: z.string()
            .min(6, "Invitation token is required")
    })
});
