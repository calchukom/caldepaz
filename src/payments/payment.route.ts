import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import {
    apiRateLimiter,
    adminActionsRateLimiter,
    webhookRateLimiter,
    strictRateLimiter
} from '../middleware/rateLimiter';
import {
    createStripePaymentSchema,
    processMpesaPaymentSchema,
    initiateMpesaStkPushSchema,
    processPaymentSchema,
    createPaymentSchema,
    updatePaymentSchema,
} from '../validation/payment.validator';
import { z } from 'zod';

const router = Router();

// Enhanced validation schemas
const createCheckoutSessionSchema = z.object({
    body: z.object({
        booking_id: z.string().uuid('Booking ID must be a valid UUID'),
        amount: z.number().positive('Amount must be a positive number'),
        currency: z.string().length(3).optional().default('usd'),
        customer_email: z.string().email().optional(),
        success_url: z.string().url().optional(),
        cancel_url: z.string().url().optional(),
        metadata: z.record(z.string()).optional(),
    })
});

const createCustomerSchema = z.object({
    body: z.object({
        email: z.string().email('Valid email is required'),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        metadata: z.record(z.string()).optional(),
    })
});

const createSubscriptionSchema = z.object({
    body: z.object({
        customer_id: z.string().min(1, 'Customer ID is required'),
        price_id: z.string().min(1, 'Price ID is required'),
        metadata: z.record(z.string()).optional(),
    })
});

const analyticsQuerySchema = z.object({
    query: z.object({
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        payment_method: z.enum(['stripe', 'mpesa', 'cash', 'bank_transfer']).optional(),
        user_id: z.string().uuid().optional(),
        currency: z.string().length(3).optional(),
    })
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @route   GET /api/payments/config
 * @desc    Get payment configuration for frontend
 * @access  Public
 */
router.get('/config', apiRateLimiter, paymentController.getPaymentConfig);

/**
 * @route   POST /api/payments/stripe/webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (Webhook)
 */
router.post('/stripe/webhook', webhookRateLimiter, paymentController.handleStripeWebhook);

/**
 * @route   POST /api/payments/mpesa/callback
 * @desc    Handle M-Pesa callbacks
 * @access  Public (Webhook)
 */
router.post('/mpesa/callback', webhookRateLimiter, paymentController.handleMpesaCallback);

// ============================================================================
// AUTHENTICATED ROUTES (User authentication required)
// ============================================================================

/**
 * @route   POST /api/payments/stripe/create-intent
 * @desc    Create Stripe Payment Intent
 * @access  Private (User)
 */
router.post(
    '/stripe/create-intent',
    strictRateLimiter,
    authenticateToken,
    validate(createStripePaymentSchema),
    paymentController.createStripePaymentIntent
);

/**
 * @route   POST /api/payments/stripe/process
 * @desc    Process Stripe Payment
 * @access  Private (User)
 */
router.post(
    '/stripe/process',
    strictRateLimiter,
    authenticateToken,
    paymentController.processStripePayment
);

/**
 * @route   POST /api/payments/mpesa/process
 * @desc    Process M-Pesa Payment
 * @access  Private (User)
 */
router.post(
    '/mpesa/process',
    strictRateLimiter,
    authenticateToken,
    validate(processMpesaPaymentSchema),
    paymentController.processMpesaPayment
);

/**
 * @route   GET /api/payments/mpesa/status/:checkout_request_id
 * @desc    Check M-Pesa transaction status
 * @access  Private (User)
 */
router.get(
    '/mpesa/status/:checkout_request_id',
    apiRateLimiter,
    authenticateToken,
    paymentController.checkMpesaStatus
);

/**
 * @route   POST /api/payments/mpesa/stk-push
 * @desc    Initiate M-Pesa STK Push with booking_id
 * @access  Private (User)
 */
router.post(
    '/mpesa/stk-push',
    strictRateLimiter,
    authenticateToken,
    validate(initiateMpesaStkPushSchema),
    paymentController.initiateMpesaStkPush
);

/**
 * @route   POST /api/payments/process
 * @desc    Process payment (unified endpoint)
 * @access  Private (User)
 */
router.post(
    '/process',
    strictRateLimiter,
    authenticateToken,
    validate(processPaymentSchema),
    paymentController.processPayment
);

// ============================================================================
// ENHANCED STRIPE ROUTES
// ============================================================================

/**
 * @route   POST /api/payments/stripe/checkout-session
 * @desc    Create Stripe Checkout Session
 * @access  Private (User)
 */
router.post(
    '/stripe/checkout-session',
    strictRateLimiter,
    authenticateToken,
    validate(createCheckoutSessionSchema),
    paymentController.createCheckoutSession
);

/**
 * @route   POST /api/payments/stripe/customer
 * @desc    Create or update Stripe customer
 * @access  Private (User)
 */
router.post(
    '/stripe/customer',
    apiRateLimiter,
    authenticateToken,
    validate(createCustomerSchema),
    paymentController.createStripeCustomer
);

/**
 * @route   POST /api/payments/stripe/subscription
 * @desc    Create subscription for recurring rentals
 * @access  Private (User)
 */
router.post(
    '/stripe/subscription',
    strictRateLimiter,
    authenticateToken,
    validate(createSubscriptionSchema),
    paymentController.createSubscription
);

/**
 * @route   POST /api/payments/stripe/webhook-enhanced
 * @desc    Handle enhanced Stripe webhooks
 * @access  Public (Webhook)
 */
router.post(
    '/stripe/webhook-enhanced',
    webhookRateLimiter,
    paymentController.handleEnhancedStripeWebhook
);

/**
 * @route   GET /api/payments/analytics
 * @desc    Get comprehensive payment analytics
 * @access  Private (Admin)
 */
router.get(
    '/analytics',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    validate(analyticsQuerySchema),
    paymentController.getPaymentAnalytics
);

/**
 * @route   GET /api/payments/dashboard
 * @desc    Get payment dashboard data
 * @access  Private (Admin)
 */
router.get(
    '/dashboard',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    paymentController.getPaymentDashboard
);

/**
 * @route   GET /api/payments/revenue-forecast
 * @desc    Get revenue forecasting
 * @access  Private (Admin)
 */
router.get(
    '/revenue-forecast',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    paymentController.getRevenueForecast
);

/**
 * @route   GET /api/payments/test-integration
 * @desc    Test payment integration
 * @access  Private (Admin)
 */
router.get(
    '/test-integration',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    paymentController.testPaymentIntegration
);

// ============================================================================
// STANDARD PAYMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/payments
 * @desc    Get all payments
 * @access  Private (Admin)
 */
router.get(
    '/',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    paymentController.getAllPayments
);

/**
 * @route   GET /api/payments/statistics
 * @desc    Get payment statistics
 * @access  Private (Admin)
 */
router.get(
    '/statistics',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    paymentController.getPaymentStatistics
);

/**
 * @route   GET /api/payments/pending
 * @desc    Get pending payments
 * @access  Private (Admin)
 */
router.get(
    '/pending',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    paymentController.getPendingPayments
);

/**
 * @route   GET /api/payments/user/:userId
 * @desc    Get payments by user ID
 * @access  Private (User - own payments, Admin - all user payments)
 */
router.get(
    '/user/:userId',
    apiRateLimiter,
    authenticateToken,
    paymentController.getUserPayments
);

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get payments by booking ID
 * @access  Private (User/Admin)
 */
router.get(
    '/booking/:bookingId',
    authenticateToken,
    paymentController.getPaymentsByBooking
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private (User - own payments, Admin - all payments)
 */
router.get(
    '/:id',
    authenticateToken,
    paymentController.getPaymentById
);

/**
 * @route   POST /api/payments
 * @desc    Create payment record
 * @access  Private (User)
 */
router.post(
    '/',
    authenticateToken,
    validate(createPaymentSchema),
    paymentController.createPayment
);

/**
 * @route   PUT /api/payments/:id
 * @desc    Update payment
 * @access  Private (Admin)
 */
router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    validate(updatePaymentSchema),
    paymentController.updatePayment
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Refund payment
 * @access  Private (Admin)
 */
router.post(
    '/:id/refund',
    authenticateToken,
    requireAdmin,
    paymentController.refundPayment
);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Delete payment
 * @access  Private (Admin)
 */
router.delete(
    '/:id',
    authenticateToken,
    requireAdmin,
    paymentController.deletePayment
);

export default router;