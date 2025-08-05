import { Router } from 'express';
import { testEmailController } from '../controllers/testEmail.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const testEmailSchema = z.object({
    body: z.object({
        to: z.string().email('Valid email address is required'),
        subject: z.string().optional(),
        template: z.enum(['welcome', 'password_reset', 'password_reset_success', 'invitation', 'generic']).optional(),
        data: z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            fullName: z.string().optional(),
            customMessage: z.string().optional(),
            verificationCode: z.string().optional(),
            inviteCode: z.string().optional(),
            role: z.string().optional(),
            expiresIn: z.string().optional()
        }).optional()
    })
});

const testAllTemplatesSchema = z.object({
    body: z.object({
        to: z.string().email('Valid email address is required')
    })
});

/**
 * @route   POST /api/test/email
 * @desc    Test email sending functionality
 * @access  Private (Admin only)
 */
router.post(
    '/email',
    authenticateToken,
    requireAdmin,
    validate(testEmailSchema),
    testEmailController.testEmailSending
);

/**
 * @route   POST /api/test/email/all-templates
 * @desc    Test all email templates
 * @access  Private (Admin only)
 */
router.post(
    '/email/all-templates',
    authenticateToken,
    requireAdmin,
    validate(testAllTemplatesSchema),
    testEmailController.testAllEmailTemplates
);

/**
 * @route   GET /api/test/email/config
 * @desc    Check email configuration
 * @access  Private (Admin only)
 */
router.get(
    '/email/config',
    authenticateToken,
    requireAdmin,
    testEmailController.testEmailConfiguration
);

export default router;
