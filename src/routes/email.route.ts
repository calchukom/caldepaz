import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { ResponseUtil } from '../middleware/response';

const router = Router();

// Rate limiter for email endpoints
const emailRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 email requests per minute
    message: {
        error: 'Too many email requests from this IP, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        ResponseUtil.tooManyRequests(res, 'Too many email requests, please try again later');
    }
});

// Validation schema for receipt email
const receiptEmailSchema = z.object({
    body: z.object({
        to: z.string().email('Valid recipient email address is required'),
        subject: z.string().min(1, 'Email subject is required'),
        html: z.string().min(1, 'Email HTML content is required'),
        text: z.string().optional()
    })
});

/**
 * @route   POST /api/email/send
 * @desc    Send receipt email with custom HTML content
 * @access  Public (for frontend integration)
 */
router.post(
    '/send',
    emailRateLimiter,
    validate(receiptEmailSchema),
    emailController.sendReceiptEmail
);

/**
 * @route   GET /api/email/health
 * @desc    Check email service health and configuration
 * @access  Public
 */
router.get(
    '/health',
    emailController.checkEmailHealth
);

export default router;
