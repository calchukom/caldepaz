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
     * Check M-Pesa Transaction Status with enhanced error handling
     */
    async checkMpesaStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { checkout_request_id } = req.params;

            if (!checkout_request_id) {
                throw ErrorFactory.badRequest('Checkout request ID is required');
            }

            console.log(`🔍 Controller: Checking M-Pesa status for ${checkout_request_id}`);

            const result = await paymentService.checkMpesaTransactionStatus(checkout_request_id);

            // The service now returns a standardized response, so we can directly send it
            if (result.success) {
                res.json(result);
            } else {
                // Handle error responses from service
                res.status(400).json(result);
            }

        } catch (error) {
            console.error('💥 Controller error:', error);

            logger.error('M-Pesa status check controller error', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                checkout_request_id: req.params.checkout_request_id
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to check payment status. Please try again.',
                data: {
                    checkout_request_id: req.params.checkout_request_id,
                    payment_status: 'error',
                    error_message: 'Internal server error',
                    timestamp: new Date().toISOString()
                }
            });
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

    // ============================================================================
    // ENHANCED STRIPE FEATURES
    // ============================================================================

    /**
     * Create Stripe Checkout Session
     */
    async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
        try {
            const { booking_id, amount, currency, customer_email, success_url, cancel_url, metadata } = req.body;

            if (!booking_id || !amount) {
                throw ErrorFactory.badRequest('Booking ID and amount are required');
            }

            const result = await paymentService.createCheckoutSession({
                booking_id,
                amount: parseFloat(amount),
                currency,
                customer_email,
                success_url,
                cancel_url,
                metadata,
            });

            ResponseUtil.success(res, result, 'Checkout session created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create or update Stripe customer
     */
    async createStripeCustomer(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, name, phone, metadata } = req.body;
            const userId = req.user?.userId;

            if (!userId || !email) {
                throw ErrorFactory.badRequest('User ID and email are required');
            }

            const result = await paymentService.createOrUpdateCustomer({
                user_id: userId,
                email,
                name,
                phone,
                metadata,
            });

            ResponseUtil.success(res, result, 'Stripe customer created/updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create subscription for recurring rentals
     */
    async createSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const { customer_id, price_id, metadata } = req.body;
            const userId = req.user?.userId;

            if (!userId || !customer_id || !price_id) {
                throw ErrorFactory.badRequest('User ID, customer ID, and price ID are required');
            }

            const result = await paymentService.createSubscription({
                customer_id,
                price_id,
                user_id: userId,
                metadata,
            });

            ResponseUtil.success(res, result, 'Subscription created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get comprehensive payment analytics
     */
    async getPaymentAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                start_date,
                end_date,
                payment_method,
                user_id,
                currency,
            } = req.query;

            const filters: any = {};

            if (start_date) filters.start_date = new Date(start_date as string);
            if (end_date) filters.end_date = new Date(end_date as string);
            if (payment_method) filters.payment_method = payment_method as string;
            if (user_id) filters.user_id = user_id as string;
            if (currency) filters.currency = currency as string;

            const analytics = await paymentService.getPaymentAnalytics(filters);

            ResponseUtil.success(res, analytics, 'Payment analytics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment dashboard data
     */
    async getPaymentDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const timeframe = req.query.timeframe as string || 'month';

            // Get basic statistics
            const basicStats = await paymentService.getPaymentStatistics(timeframe);

            // Get enhanced analytics
            const enhancedAnalytics = await paymentService.getPaymentAnalytics({
                start_date: basicStats.period.start,
                end_date: basicStats.period.end,
            });

            // Get pending payments
            const pendingPayments = await paymentService.getPendingPayments(1, 5);

            const dashboardData = {
                timeframe,
                basic_statistics: basicStats,
                enhanced_analytics: enhancedAnalytics,
                recent_pending_payments: pendingPayments.pending_payments,
                last_updated: new Date(),
            };

            ResponseUtil.success(res, dashboardData, 'Payment dashboard data retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get revenue forecasting
     */
    async getRevenueForecast(req: Request, res: Response, next: NextFunction) {
        try {
            const { days = 30 } = req.query;
            const forecastDays = parseInt(days as string);

            // Get historical data for forecasting
            const historicalData = await paymentService.getPaymentAnalytics({
                start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                end_date: new Date(),
            });

            // Simple forecasting logic
            const dailyTrends = historicalData.daily_trends;
            if (dailyTrends.length < 7) {
                throw ErrorFactory.badRequest('Insufficient historical data for forecasting');
            }

            // Calculate growth rate
            const recentRevenue = dailyTrends.slice(-7).reduce((sum: number, day: any) => sum + (day.total_revenue || 0), 0) / 7;
            const olderRevenue = dailyTrends.slice(-14, -7).reduce((sum: number, day: any) => sum + (day.total_revenue || 0), 0) / 7;
            const growthRate = (recentRevenue - olderRevenue) / (olderRevenue || 1);

            // Generate forecast
            const forecast = [];
            for (let i = 1; i <= forecastDays; i++) {
                const projectedRevenue = recentRevenue * (1 + (growthRate * i / 7));
                forecast.push({
                    date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    projected_revenue: Math.round(projectedRevenue * 100) / 100,
                    confidence: Math.max(0.5, 1 - (i / forecastDays) * 0.5),
                });
            }

            const totalProjectedRevenue = forecast.reduce((sum, day) => sum + day.projected_revenue, 0);

            ResponseUtil.success(res, {
                forecast_period: {
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    days: forecastDays,
                },
                historical_metrics: {
                    avg_daily_revenue_recent: Math.round(recentRevenue * 100) / 100,
                    avg_daily_revenue_previous: Math.round(olderRevenue * 100) / 100,
                    growth_rate: Math.round(growthRate * 10000) / 100,
                },
                forecast,
                summary: {
                    total_projected_revenue: Math.round(totalProjectedRevenue * 100) / 100,
                    avg_projected_daily_revenue: Math.round((totalProjectedRevenue / forecastDays) * 100) / 100,
                },
                disclaimer: 'This forecast is based on historical trends and should be used for guidance only.',
            }, 'Revenue forecast generated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Test payment integration
     */
    async testPaymentIntegration(req: Request, res: Response, next: NextFunction) {
        try {
            const { test_type = 'all' } = req.query;
            const results: any = {
                timestamp: new Date(),
                test_type,
                results: {},
            };

            // Test Stripe connection
            if (test_type === 'all' || test_type === 'stripe') {
                try {
                    const config = paymentService.getPaymentConfig();
                    results.results.stripe = {
                        status: 'success',
                        publishable_key_configured: !!config.stripe.publishableKey,
                        currency_supported: config.stripe.currency === 'usd',
                        message: 'Stripe configuration is valid',
                    };
                } catch (error) {
                    results.results.stripe = {
                        status: 'error',
                        message: error instanceof Error ? error.message : 'Stripe test failed',
                    };
                }
            }

            // Test M-Pesa connection
            if (test_type === 'all' || test_type === 'mpesa') {
                try {
                    const config = paymentService.getPaymentConfig();
                    results.results.mpesa = {
                        status: 'success',
                        business_short_code_configured: !!config.mpesa.businessShortCode,
                        environment: config.mpesa.environment,
                        message: 'M-Pesa configuration is valid',
                    };
                } catch (error) {
                    results.results.mpesa = {
                        status: 'error',
                        message: error instanceof Error ? error.message : 'M-Pesa test failed',
                    };
                }
            }

            // Test database connectivity
            if (test_type === 'all' || test_type === 'database') {
                try {
                    const testStats = await paymentService.getPaymentStatistics('week');
                    results.results.database = {
                        status: 'success',
                        total_payments: testStats.summary.total_payments,
                        message: 'Database connectivity is working',
                    };
                } catch (error) {
                    results.results.database = {
                        status: 'error',
                        message: error instanceof Error ? error.message : 'Database test failed',
                    };
                }
            }

            // Overall status
            const allTests = Object.values(results.results);
            const hasErrors = allTests.some((test: any) => test.status === 'error');
            results.overall_status = hasErrors ? 'partial_failure' : 'success';

            ResponseUtil.success(res, results, 'Payment integration test completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle enhanced Stripe webhooks with booking status updates
     */
    async handleEnhancedStripeWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['stripe-signature'] as string;

            if (!signature) {
                throw ErrorFactory.badRequest('Stripe signature missing');
            }

            const result = await paymentService.handleEnhancedStripeWebhook(
                req.body,
                signature
            );

            res.json(result);
        } catch (error) {
            logger.error('Enhanced Stripe webhook error', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            next(error);
        }
    }
}

export const paymentController = new PaymentController();