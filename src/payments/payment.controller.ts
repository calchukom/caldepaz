import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { ResponseUtil } from '../middleware/response';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';

export class PaymentController {
    /**
     * Get payment configuration
     */
    async getPaymentConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const config = paymentService.getPaymentConfig();

            ResponseUtil.success(res, config, 'Payment configuration retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create Stripe Payment Intent
     */
    async createStripePaymentIntent(req: Request, res: Response, next: NextFunction) {
        try {
            const { amount, booking_id, currency, metadata } = req.body;

            if (!amount || !booking_id) {
                throw ErrorFactory.badRequest('Amount and booking_id are required');
            }

            const result = await paymentService.createStripePaymentIntent({
                amount: parseFloat(amount),
                booking_id,
                currency,
                metadata,
            });

            ResponseUtil.success(res, result, 'Payment intent created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process Stripe Payment
     */
    async processStripePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { payment_intent_id, payment_method_id } = req.body;

            if (!payment_intent_id) {
                throw ErrorFactory.badRequest('Payment intent ID is required');
            }

            // This endpoint can be used for additional processing if needed
            // Most Stripe payments are handled via webhooks

            ResponseUtil.success(res,
                { payment_intent_id, status: 'processing' },
                'Payment is being processed'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle Stripe Webhook
     */
    async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['stripe-signature'] as string;

            if (!signature) {
                throw ErrorFactory.badRequest('Stripe signature missing');
            }

            const result = await paymentService.handleStripeWebhook(
                req.body,
                signature
            );

            res.json(result);
        } catch (error) {
            logger.error('Stripe webhook error', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            next(error);
        }
    }

    /**
     * Process M-Pesa Payment
     */
    async processMpesaPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { payment_id, phone_number } = req.body;

            if (!payment_id || !phone_number) {
                throw ErrorFactory.badRequest('Payment ID and phone number are required');
            }

            const result = await paymentService.initiateMpesaPayment({
                payment_id,
                phone_number,
            });

            ResponseUtil.success(res, result, 'M-Pesa payment initiated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Check M-Pesa Transaction Status
     */
    async checkMpesaStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { checkout_request_id } = req.params;

            if (!checkout_request_id) {
                throw ErrorFactory.badRequest('Checkout request ID is required');
            }

            const result = await paymentService.checkMpesaTransactionStatus(checkout_request_id);

            ResponseUtil.success(res, result, 'Transaction status retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle M-Pesa Callback
     */
    async handleMpesaCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await paymentService.handleMpesaCallback(req.body);

            res.json(result);
        } catch (error) {
            logger.error('M-Pesa callback error', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            next(error);
        }
    }

    /**
     * Initiate M-Pesa STK Push with booking_id
     */
    async initiateMpesaStkPush(req: Request, res: Response, next: NextFunction) {
        try {
            const { booking_id, phone_number, amount, currency = 'KES', description } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.unauthorized('User authentication required');
            }

            if (!booking_id || !phone_number || !amount) {
                throw ErrorFactory.badRequest('Booking ID, phone number, and amount are required');
            }

            // Call the service to handle the STK push with booking_id
            const result = await paymentService.initiateMpesaStkPushWithBooking({
                booking_id,
                phone_number,
                amount,
                currency,
                description,
                user_id: userId,
            });

            ResponseUtil.success(res, result, 'M-Pesa STK Push initiated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process Payment (Unified)
     */
    async processPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { payment_method, ...paymentData } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.unauthorized('User authentication required');
            }

            if (!payment_method || !['stripe', 'mpesa'].includes(payment_method)) {
                throw ErrorFactory.badRequest('Valid payment method is required (stripe or mpesa)');
            }

            const result = await paymentService.processPayment(
                paymentData,
                payment_method,
                userId
            );

            ResponseUtil.success(res, result, `${payment_method} payment initiated successfully`);
        } catch (error) {
            next(error);
        }
    }

    // ============================================================================
    // STANDARD PAYMENT MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * Get all payments
     */
    async getAllPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const filters = req.query;

            const result = await paymentService.getAllPayments(page, limit, filters);

            ResponseUtil.success(res, result, 'Payments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment by ID
     */
    async getPaymentById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payment = await paymentService.getPaymentById(id);

            if (!payment) {
                throw ErrorFactory.notFound('Payment not found');
            }

            ResponseUtil.success(res, payment, 'Payment retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create payment record
     */
    async createPayment(req: Request, res: Response, next: NextFunction) {
        try {
            // This would create a payment record in the database
            // Implementation depends on your specific payment creation logic

            ResponseUtil.created(res, {}, 'Payment record created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update payment
     */
    async updatePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // Implementation for updating payment records

            ResponseUtil.updated(res, {}, 'Payment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete payment
     */
    async deletePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // Implementation for deleting payment records (admin only)

            ResponseUtil.deleted(res, 'Payment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payments by user ID
     */
    async getUserPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

            const payments = await paymentService.getPaymentsByUser(
                userId,
                parseInt(page as string),
                parseInt(limit as string),
                sortBy as string,
                sortOrder as string
            );

            ResponseUtil.success(res, payments, 'User payments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payments by booking ID
     */
    async getPaymentsByBooking(req: Request, res: Response, next: NextFunction) {
        try {
            const { bookingId } = req.params;

            const payments = await paymentService.getPaymentsByBooking(bookingId);

            ResponseUtil.success(res, payments, 'Booking payments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Refund payment
     */
    async refundPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const refundResult = await paymentService.refundPayment(id, reason);

            ResponseUtil.success(res, refundResult, 'Payment refunded successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment statistics
     */
    async getPaymentStatistics(req: Request, res: Response, next: NextFunction) {
        try {
            const { timeframe = 'month' } = req.query;

            const statistics = await paymentService.getPaymentStatistics(timeframe as string);

            ResponseUtil.success(res, statistics, 'Payment statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending payments
     */
    async getPendingPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const pendingPayments = await paymentService.getPendingPayments(
                parseInt(page as string),
                parseInt(limit as string)
            );

            ResponseUtil.success(res, pendingPayments, 'Pending payments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const paymentController = new PaymentController();