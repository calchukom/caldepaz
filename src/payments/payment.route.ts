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

const router = Router();

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