import { z } from "zod";

// User registration schema
export const createUserSchema = z.object({
    body: z.object({
        firstname: z.string()
            .min(1, "First name is required")
            .max(100, "First name must be less than 100 characters")
            .trim(),
        lastname: z.string()
            .min(1, "Last name is required")
            .max(100, "Last name must be less than 100 characters")
            .trim(),
        email: z.string()
            .email("Invalid email format")
            .max(255, "Email must be less than 255 characters")
            .toLowerCase(),
        password: z.string()
            .min(6, "Password must be at least 6 characters")
            .max(255, "Password must be less than 255 characters"),
        contact_phone: z.string()
            .regex(/^\+254[0-9]{9}$/, "Phone number must be in format +254XXXXXXXXX")
            .optional(),
        address: z.string()
            .max(1000, "Address must be less than 1000 characters")
            .optional(),
        role: z.enum(["user", "admin", "support_agent"]).default("user").optional(),
    })
});

// User update schema
export const updateUserSchema = z.object({
    body: z.object({
        firstname: z.string()
            .min(1, "First name is required")
            .max(100, "First name must be less than 100 characters")
            .trim()
            .optional(),
        lastname: z.string()
            .min(1, "Last name is required")
            .max(100, "Last name must be less than 100 characters")
            .trim()
            .optional(),
        email: z.string()
            .email("Invalid email format")
            .max(255, "Email must be less than 255 characters")
            .toLowerCase()
            .optional(),
        contact_phone: z.string()
            .regex(/^\+254[0-9]{9}$/, "Phone number must be in format +254XXXXXXXXX")
            .optional(),
        address: z.string()
            .max(1000, "Address must be less than 1000 characters")
            .optional(),
        role: z.enum(["user", "admin", "support_agent"]).optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    })
});

// Password update schema
export const updatePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string()
            .min(1, "Current password is required"),
        newPassword: z.string()
            .min(6, "New password must be at least 6 characters")
            .max(255, "New password must be less than 255 characters"),
        confirmPassword: z.string()
            .min(1, "Password confirmation is required"),
    }).refine(data => data.newPassword === data.confirmPassword, {
        message: "New password and confirmation must match",
        path: ["confirmPassword"]
    })
});

// Login schema
export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email format")
            .toLowerCase(),
        password: z.string()
            .min(1, "Password is required"),
    })
});

// Phone verification request schema
export const phoneVerificationSchema = z.object({
    body: z.object({
        contact_phone: z.string()
            .regex(/^\+254[0-9]{9}$/, "Phone number must be in format +254XXXXXXXXX"),
    })
});

// Phone verification code schema
export const verifyPhoneSchema = z.object({
    body: z.object({
        contact_phone: z.string()
            .regex(/^\+254[0-9]{9}$/, "Phone number must be in format +254XXXXXXXXX"),
        verification_code: z.string()
            .length(6, "Verification code must be 6 digits")
            .regex(/^\d{6}$/, "Verification code must contain only digits"),
    })
});

// Email verification schema
export const verifyEmailSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email format")
            .toLowerCase(),
        verification_code: z.string()
            .length(6, "Verification code must be 6 digits")
            .regex(/^\d{6}$/, "Verification code must contain only digits"),
    })
});

// User ID param schema
export const userIdParamSchema = z.object({
    params: z.object({
        userId: z.string()
            .uuid("Invalid user ID format"),
    })
});

// Email param schema
export const emailParamSchema = z.object({
    params: z.object({
        email: z.string()
            .email("Invalid email format")
            .toLowerCase(),
    })
});

// Password reset request schema
export const resetPasswordRequestSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email format")
            .toLowerCase(),
    })
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email format")
            .toLowerCase(),
    })
});

// Password reset with code schema
export const resetPasswordWithCodeSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email format")
            .toLowerCase(),
        resetCode: z.string()
            .min(1, "Reset code is required")
            .max(10, "Reset code must be less than 10 characters"),
        newPassword: z.string()
            .min(6, "New password must be at least 6 characters")
            .max(255, "New password must be less than 255 characters"),
    })
});

// Reset password schema (simplified version)
export const resetPasswordSchema = z.object({
    body: z.object({
        resetCode: z.string()
            .min(1, "Reset code is required")
            .max(10, "Reset code must be less than 10 characters"),
        newPassword: z.string()
            .min(6, "New password must be at least 6 characters")
            .max(255, "New password must be less than 255 characters"),
    })
});

// Refresh token schema
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string()
            .min(1, "Refresh token is required")
            .optional(),
    })
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PhoneVerificationInput = z.infer<typeof phoneVerificationSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordWithCodeInput = z.infer<typeof resetPasswordWithCodeSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
