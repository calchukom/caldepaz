import Stripe from 'stripe';
import axios from 'axios';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { payments, bookings } from '../drizzle/schema';
import { logger } from '../middleware/logger';
import { AppError, ErrorFactory } from '../middleware/appError';

interface StripePaymentIntentData {
    amount: number;
    booking_id: string;
    currency?: string;
    metadata?: Record<string, string>;
}

interface MpesaPaymentData {
    payment_id: string;
    phone_number: string;
    amount?: number;
}

interface MpesaAuthResponse {
    access_token: string;
    expires_in: string;
}

interface MpesaPaymentResponse {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
}

export class PaymentService {
    private stripe: Stripe;
    private mpesaBaseUrl: string;
    private mpesaAuth: { token: string; expires: Date } | null = null;

    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is required');
        }

        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        this.mpesaBaseUrl = process.env.MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    // ============================================================================
    // STRIPE PAYMENT METHODS
    // ============================================================================

    /**
     * Create Stripe Payment Intent
     */
    async createStripePaymentIntent(data: StripePaymentIntentData) {
        try {
            const { amount, booking_id, currency = 'usd', metadata = {} } = data;

            // Validate booking exists
            const booking = await db
                .select()
                .from(bookings)
                .where(eq(bookings.booking_id, booking_id))
                .limit(1);

            if (!booking.length) {
                throw ErrorFactory.notFound('Booking not found');
            }

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                metadata: {
                    booking_id,
                    ...metadata,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            logger.info('Stripe Payment Intent created', {
                module: 'payments',
                paymentIntentId: paymentIntent.id,
                booking_id,
                amount,
            });

            return {
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
            };
        } catch (error) {
            logger.error('Error creating Stripe Payment Intent', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to create payment intent');
        }
    }

    /**
     * Handle Stripe Webhook
     */
    async handleStripeWebhook(body: string, signature: string) {
        try {
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!endpointSecret) {
                throw ErrorFactory.internal('Stripe webhook secret not configured');
            }

            const event = this.stripe.webhooks.constructEvent(body, signature, endpointSecret);

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handleStripePaymentSuccess(event.data.object as Stripe.PaymentIntent);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handleStripePaymentFailed(event.data.object as Stripe.PaymentIntent);
                    break;
                default:
                    logger.info('Unhandled Stripe webhook event', {
                        module: 'payments',
                        eventType: event.type,
                    });
            }

            return { received: true };
        } catch (error) {
            logger.error('Error handling Stripe webhook', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Webhook processing failed');
        }
    }

    private async handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
        const booking_id = paymentIntent.metadata.booking_id;

        if (booking_id) {
            await this.updatePaymentStatus(booking_id, 'completed', {
                payment_method: 'stripe',
                external_transaction_id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
            });
        }
    }

    private async handleStripePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
        const booking_id = paymentIntent.metadata.booking_id;

        if (booking_id) {
            await this.updatePaymentStatus(booking_id, 'failed', {
                payment_method: 'stripe',
                external_transaction_id: paymentIntent.id,
                failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
            });
        }
    }

    // ============================================================================
    // M-PESA PAYMENT METHODS
    // ============================================================================

    /**
     * Authenticate with M-Pesa API
     */
    private async authenticateMpesa(): Promise<string> {
        try {
            // Check if we have a valid cached token
            if (this.mpesaAuth && this.mpesaAuth.expires > new Date()) {
                return this.mpesaAuth.token;
            }

            const consumerKey = process.env.MPESA_CONSUMER_KEY;
            const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

            if (!consumerKey || !consumerSecret) {
                throw ErrorFactory.internal('M-Pesa credentials not configured');
            }

            const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

            const response = await axios.get(
                `${this.mpesaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                    },
                }
            );

            const { access_token, expires_in }: MpesaAuthResponse = response.data;

            // Cache the token with expiration
            this.mpesaAuth = {
                token: access_token,
                expires: new Date(Date.now() + (parseInt(expires_in) * 1000) - 60000), // 1 minute buffer
            };

            return access_token;
        } catch (error) {
            logger.error('M-Pesa authentication failed', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('M-Pesa authentication failed');
        }
    }

    /**
     * Initiate M-Pesa STK Push
     */
    async initiateMpesaPayment(data: MpesaPaymentData) {
        try {
            const { payment_id, phone_number } = data;

            // Get payment details
            const payment = await db
                .select()
                .from(payments)
                .where(eq(payments.payment_id, payment_id))
                .limit(1);

            if (!payment.length) {
                throw ErrorFactory.notFound('Payment not found');
            }

            const amount = parseFloat(payment[0].amount);
            const accessToken = await this.authenticateMpesa();

            // Format phone number (ensure it starts with 254)
            const formattedPhone = this.formatPhoneNumber(phone_number);

            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
            const businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || '174379';
            const passkey = process.env.MPESA_PASSKEY;

            if (!passkey) {
                throw ErrorFactory.internal('M-Pesa passkey not configured');
            }

            const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

            const stkPushPayload = {
                BusinessShortCode: businessShortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(amount),
                PartyA: formattedPhone,
                PartyB: businessShortCode,
                PhoneNumber: formattedPhone,
                CallBackURL: process.env.MPESA_CALLBACK_URL,
                AccountReference: `VR${payment_id.slice(-8)}`,
                TransactionDesc: `Vehicle Rental Payment - ${payment_id}`,
            };

            const response = await axios.post(
                `${this.mpesaBaseUrl}/mpesa/stkpush/v1/processrequest`,
                stkPushPayload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const mpesaResponse: MpesaPaymentResponse = response.data;

            if (mpesaResponse.ResponseCode === '0') {
                // Update payment with checkout request ID
                await db
                    .update(payments)
                    .set({
                        transaction_id: mpesaResponse.CheckoutRequestID,
                        payment_status: 'pending',
                        updated_at: new Date(),
                    })
                    .where(eq(payments.payment_id, payment_id));

                logger.info('M-Pesa STK Push initiated', {
                    module: 'payments',
                    payment_id,
                    checkoutRequestId: mpesaResponse.CheckoutRequestID,
                    phone_number: formattedPhone,
                });

                return {
                    checkout_request_id: mpesaResponse.CheckoutRequestID,
                    merchant_request_id: mpesaResponse.MerchantRequestID,
                    customer_message: mpesaResponse.CustomerMessage,
                };
            } else {
                throw ErrorFactory.badRequest(`M-Pesa request failed: ${mpesaResponse.ResponseDescription}`);
            }
        } catch (error) {
            logger.error('Error initiating M-Pesa payment', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to initiate M-Pesa payment');
        }
    }

    /**
     * Initiate M-Pesa STK Push with booking_id (creates payment record if needed)
     */
    async initiateMpesaStkPushWithBooking(data: {
        booking_id: string;
        phone_number: string;
        amount: number;
        currency?: string;
        description?: string;
        user_id: string;
    }) {
        try {
            const { booking_id, phone_number, amount, currency = 'KES', description, user_id } = data;

            // First, check if booking exists and belongs to user
            const booking = await db
                .select()
                .from(bookings)
                .where(and(
                    eq(bookings.booking_id, booking_id),
                    eq(bookings.user_id, user_id)
                ))
                .limit(1);

            if (!booking.length) {
                throw ErrorFactory.notFound('Booking not found or access denied');
            }

            // Check if there's already a pending payment for this booking
            let existingPayment = await db
                .select()
                .from(payments)
                .where(and(
                    eq(payments.booking_id, booking_id),
                    eq(payments.payment_method, 'mpesa'),
                    eq(payments.payment_status, 'pending')
                ))
                .limit(1);

            let payment_id: string;

            if (existingPayment.length > 0) {
                // Use existing pending payment
                payment_id = existingPayment[0].payment_id;

                // Update the amount if it's different
                if (parseFloat(existingPayment[0].amount) !== amount) {
                    await db
                        .update(payments)
                        .set({
                            amount: amount.toString(),
                            updated_at: new Date(),
                        })
                        .where(eq(payments.payment_id, payment_id));
                }
            } else {
                // Create new payment record
                const newPayment = await db
                    .insert(payments)
                    .values({
                        booking_id,
                        user_id,
                        amount: amount.toString(),
                        currency: currency,
                        payment_method: 'mpesa',
                        payment_status: 'pending',
                        metadata: description ? JSON.stringify({ description }) : null,
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                    .returning();

                payment_id = newPayment[0].payment_id;
            }

            // Now initiate M-Pesa payment with the payment_id
            const result = await this.initiateMpesaPayment({
                payment_id,
                phone_number,
            });

            return {
                ...result,
                payment_id,
                booking_id,
            };
        } catch (error) {
            logger.error('Error initiating M-Pesa STK Push with booking', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to initiate M-Pesa STK Push');
        }
    }

    /**
     * Handle M-Pesa Callback
     */
    async handleMpesaCallback(callbackData: any) {
        try {
            const { Body } = callbackData;
            const { stkCallback } = Body;

            const {
                MerchantRequestID,
                CheckoutRequestID,
                ResultCode,
                ResultDesc,
                CallbackMetadata,
            } = stkCallback;

            // Find payment by checkout request ID
            const payment = await db
                .select()
                .from(payments)
                .where(eq(payments.transaction_id, CheckoutRequestID))
                .limit(1);

            if (!payment.length) {
                logger.warn('Payment not found for M-Pesa callback', {
                    module: 'payments',
                    checkoutRequestId: CheckoutRequestID,
                });
                return { received: true };
            }

            const payment_id = payment[0].payment_id;

            if (ResultCode === 0) {
                // Payment successful
                const metadata = CallbackMetadata?.Item || [];
                const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
                const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
                const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;

                await this.updatePaymentStatus(payment_id, 'completed', {
                    payment_method: 'mpesa',
                    transaction_id: mpesaReceiptNumber || CheckoutRequestID,
                    metadata: {
                        mpesa_receipt_number: mpesaReceiptNumber,
                        transaction_date: transactionDate,
                        phone_number: phoneNumber,
                        merchant_request_id: MerchantRequestID,
                        checkout_request_id: CheckoutRequestID,
                    },
                });

                logger.info('M-Pesa payment completed', {
                    module: 'payments',
                    payment_id,
                    mpesaReceiptNumber,
                });
            } else {
                // Payment failed
                await this.updatePaymentStatus(payment_id, 'failed', {
                    payment_method: 'mpesa',
                    failure_reason: ResultDesc,
                    metadata: {
                        result_code: ResultCode,
                        merchant_request_id: MerchantRequestID,
                        checkout_request_id: CheckoutRequestID,
                    },
                });

                logger.info('M-Pesa payment failed', {
                    module: 'payments',
                    payment_id,
                    resultCode: ResultCode,
                    resultDesc: ResultDesc,
                });
            }

            return { received: true };
        } catch (error) {
            logger.error('Error handling M-Pesa callback', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                callbackData,
            });
            throw ErrorFactory.internal('Failed to process M-Pesa callback');
        }
    }

    /**
     * Check M-Pesa transaction status
     */
    async checkMpesaTransactionStatus(checkoutRequestId: string) {
        try {
            const accessToken = await this.authenticateMpesa();
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
            const businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || '174379';
            const passkey = process.env.MPESA_PASSKEY;

            if (!passkey) {
                throw ErrorFactory.internal('M-Pesa passkey not configured');
            }

            const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

            const queryPayload = {
                BusinessShortCode: businessShortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId,
            };

            const response = await axios.post(
                `${this.mpesaBaseUrl}/mpesa/stkpushquery/v1/query`,
                queryPayload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Error checking M-Pesa transaction status', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                checkoutRequestId,
            });
            throw ErrorFactory.internal('Failed to check transaction status');
        }
    }

    // ============================================================================
    // UNIFIED PAYMENT METHODS
    // ============================================================================

    /**
     * Process payment (unified method)
     */
    async processPayment(paymentData: any, paymentMethod: 'stripe' | 'mpesa', userId: string) {
        try {
            let result;

            switch (paymentMethod) {
                case 'stripe':
                    result = await this.createStripePaymentIntent(paymentData);
                    break;
                case 'mpesa':
                    result = await this.initiateMpesaPayment(paymentData);
                    break;
                default:
                    throw ErrorFactory.badRequest('Unsupported payment method');
            }

            logger.info('Payment processing initiated', {
                module: 'payments',
                paymentMethod,
                userId,
            });

            return result;
        } catch (error) {
            logger.error('Error processing payment', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                paymentMethod,
                userId,
            });
            throw error;
        }
    }

    /**
     * Update payment status
     */
    private async updatePaymentStatus(
        payment_id: string,
        status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded',
        additionalData: any = {}
    ) {
        try {
            const updateData: any = {
                payment_status: status,
                updated_at: new Date(),
            };

            // Handle metadata serialization
            if (additionalData.metadata) {
                updateData.metadata = JSON.stringify(additionalData.metadata);
                delete additionalData.metadata;
            }

            // Merge other fields
            Object.assign(updateData, additionalData);

            await db
                .update(payments)
                .set(updateData)
                .where(eq(payments.payment_id, payment_id));

            // Update booking status based on payment status
            if (status === 'completed') {
                const payment = await db
                    .select()
                    .from(payments)
                    .where(eq(payments.payment_id, payment_id))
                    .limit(1);

                if (payment.length && payment[0].booking_id) {
                    await db
                        .update(bookings)
                        .set({
                            booking_status: 'confirmed',
                            updated_at: new Date(),
                        })
                        .where(eq(bookings.booking_id, payment[0].booking_id));
                }
            }
        } catch (error) {
            logger.error('Error updating payment status', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                payment_id,
                status,
            });
            throw error;
        }
    }

    /**
     * Format phone number for M-Pesa
     */
    private formatPhoneNumber(phoneNumber: string): string {
        // Remove any non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');

        // Handle different formats
        if (cleaned.startsWith('254')) {
            return cleaned; // Already in correct format
        } else if (cleaned.startsWith('0')) {
            return '254' + cleaned.slice(1); // Convert from 07xx to 2547xx
        } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
            return '254' + cleaned; // Add country code
        }

        throw ErrorFactory.badRequest('Invalid phone number format');
    }

    /**
     * Get payment configuration for frontend
     */
    getPaymentConfig() {
        return {
            stripe: {
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                currency: 'usd',
            },
            mpesa: {
                businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
                environment: process.env.MPESA_ENV || 'sandbox',
            },
            supportedMethods: ['stripe', 'mpesa'],
        };
    }

    // ============================================================================
    // PAYMENT MANAGEMENT METHODS
    // ============================================================================

    /**
     * Get all payments with pagination
     */
    async getAllPayments(page: number = 1, limit: number = 10, filters: any = {}) {
        try {
            const offset = (page - 1) * limit;

            const result = await db
                .select()
                .from(payments)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(payments.created_at));

            const total = await db
                .select({ count: sql<number>`count(*)` })
                .from(payments);

            return {
                payments: result,
                pagination: {
                    page,
                    limit,
                    total: total[0]?.count || 0,
                    totalPages: Math.ceil((total[0]?.count || 0) / limit),
                },
            };
        } catch (error) {
            logger.error('Error retrieving payments', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('Failed to retrieve payments');
        }
    }

    /**
     * Get payment by ID
     */
    async getPaymentById(payment_id: string) {
        try {
            const result = await db
                .select()
                .from(payments)
                .where(eq(payments.payment_id, payment_id))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            logger.error('Error retrieving payment', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                payment_id,
            });
            throw ErrorFactory.internal('Failed to retrieve payment');
        }
    }

    // ============================================================================
    // NEW PAYMENT MANAGEMENT METHODS
    // ============================================================================

    /**
     * Get payments by user ID
     */
    async getPaymentsByUser(
        userId: string,
        page: number = 1,
        limit: number = 10,
        sortBy: string = 'created_at',
        sortOrder: string = 'desc'
    ) {
        try {
            const offset = (page - 1) * limit;

            // Get booking IDs for the user first
            const userBookings = await db
                .select({ booking_id: bookings.booking_id })
                .from(bookings)
                .where(eq(bookings.user_id, userId));

            const bookingIds = userBookings.map((b: any) => b.booking_id);

            if (bookingIds.length === 0) {
                return {
                    payments: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }

            // Get payments for those bookings using raw SQL for IN clause
            const result = await db
                .select()
                .from(payments)
                .where(sql`${payments.booking_id} = ANY(${bookingIds})`)
                .orderBy(sortOrder.toLowerCase() === 'desc' ? desc(payments.created_at) : payments.created_at)
                .limit(limit)
                .offset(offset);

            // Get total count for pagination
            const totalResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(payments)
                .where(sql`${payments.booking_id} = ANY(${bookingIds})`);

            const total = totalResult[0]?.count || 0;

            return {
                payments: result,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error('Error retrieving user payments', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                userId,
            });
            throw ErrorFactory.internal('Failed to retrieve user payments');
        }
    }

    /**
     * Get payments by booking ID
     */
    async getPaymentsByBooking(bookingId: string) {
        try {
            const result = await db
                .select()
                .from(payments)
                .where(eq(payments.booking_id, bookingId))
                .orderBy(desc(payments.created_at));

            return result;
        } catch (error) {
            logger.error('Error retrieving booking payments', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                bookingId,
            });
            throw ErrorFactory.internal('Failed to retrieve booking payments');
        }
    }

    /**
     * Refund payment
     */
    async refundPayment(paymentId: string, reason?: string) {
        try {
            // Get the payment details
            const payment = await db
                .select()
                .from(payments)
                .where(eq(payments.payment_id, paymentId))
                .limit(1);

            if (!payment.length) {
                throw ErrorFactory.notFound('Payment not found');
            }

            const paymentRecord = payment[0];

            // Check if payment can be refunded
            if (paymentRecord.payment_status !== 'completed') {
                throw ErrorFactory.badRequest('Only completed payments can be refunded');
            }

            // Handle refund based on payment method
            let refundResult;

            if (paymentRecord.payment_method === 'stripe') {
                // Handle Stripe refund
                refundResult = await this.processStripeRefund(paymentRecord, reason);
            } else if (paymentRecord.payment_method === 'mpesa') {
                // M-Pesa refunds typically need to be handled manually
                // For now, we'll just update the status
                refundResult = await this.processMpesaRefund(paymentRecord, reason);
            } else {
                throw ErrorFactory.badRequest('Refund not supported for this payment method');
            }

            // Update payment status to refunded
            await db
                .update(payments)
                .set({
                    payment_status: 'refunded',
                    updated_at: new Date(),
                })
                .where(eq(payments.payment_id, paymentId));

            // Update booking status if needed
            if (paymentRecord.booking_id) {
                await db
                    .update(bookings)
                    .set({
                        booking_status: 'cancelled',
                        updated_at: new Date(),
                    })
                    .where(eq(bookings.booking_id, paymentRecord.booking_id));
            }

            logger.info('Payment refunded successfully', {
                module: 'payments',
                paymentId,
                amount: paymentRecord.amount,
                method: paymentRecord.payment_method,
                reason,
            });

            return {
                payment_id: paymentId,
                refund_amount: parseFloat(paymentRecord.amount),
                refund_status: 'completed',
                refund_reason: reason,
                refunded_at: new Date(),
                ...refundResult,
            };
        } catch (error) {
            logger.error('Error processing refund', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                paymentId,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to process refund');
        }
    }

    /**
     * Process Stripe refund
     */
    private async processStripeRefund(payment: any, reason?: string) {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: payment.transaction_id,
                reason: reason ? 'requested_by_customer' : undefined,
                metadata: {
                    payment_id: payment.payment_id,
                    refund_reason: reason || 'No reason provided',
                },
            });

            return {
                stripe_refund_id: refund.id,
                refund_status: refund.status,
            };
        } catch (error) {
            logger.error('Stripe refund failed', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                paymentId: payment.payment_id,
            });
            throw ErrorFactory.internal('Stripe refund failed');
        }
    }

    /**
     * Process M-Pesa refund (manual process)
     */
    private async processMpesaRefund(payment: any, reason?: string) {
        // M-Pesa refunds are typically handled manually
        // This method creates a record for manual processing
        logger.info('M-Pesa refund request created for manual processing', {
            module: 'payments',
            paymentId: payment.payment_id,
            amount: payment.amount,
            reason,
        });

        return {
            refund_method: 'manual_processing',
            note: 'M-Pesa refunds require manual processing by admin',
        };
    }

    /**
     * Get payment statistics
     */
    async getPaymentStatistics(timeframe: string = 'month') {
        try {
            let startDate: Date;
            const now = new Date();

            // Calculate start date based on timeframe
            switch (timeframe) {
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            // Get payment statistics
            const stats = await db
                .select({
                    total_payments: sql<number>`count(*)`,
                    total_amount: sql<number>`sum(CAST(amount AS DECIMAL))`,
                    completed_payments: sql<number>`count(*) filter (where payment_status = 'completed')`,
                    completed_amount: sql<number>`sum(CAST(amount AS DECIMAL)) filter (where payment_status = 'completed')`,
                    pending_payments: sql<number>`count(*) filter (where payment_status = 'pending')`,
                    failed_payments: sql<number>`count(*) filter (where payment_status = 'failed')`,
                    refunded_payments: sql<number>`count(*) filter (where payment_status = 'refunded')`,
                    refunded_amount: sql<number>`sum(CAST(amount AS DECIMAL)) filter (where payment_status = 'refunded')`,
                })
                .from(payments)
                .where(sql`created_at >= ${startDate}`);

            // Get payment method breakdown
            const methodStats = await db
                .select({
                    payment_method: payments.payment_method,
                    count: sql<number>`count(*)`,
                    total_amount: sql<number>`sum(CAST(amount AS DECIMAL))`,
                })
                .from(payments)
                .where(sql`created_at >= ${startDate} AND payment_status = 'completed'`)
                .groupBy(payments.payment_method);

            // Get daily payment trends (last 30 days)
            const dailyTrends = await db
                .select({
                    date: sql<string>`DATE(created_at)`,
                    count: sql<number>`count(*)`,
                    amount: sql<number>`sum(CAST(amount AS DECIMAL))`,
                })
                .from(payments)
                .where(sql`created_at >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)} AND payment_status = 'completed'`)
                .groupBy(sql`DATE(created_at)`)
                .orderBy(sql`DATE(created_at)`);

            const result = {
                timeframe,
                period: {
                    start: startDate,
                    end: now,
                },
                summary: stats[0] || {
                    total_payments: 0,
                    total_amount: 0,
                    completed_payments: 0,
                    completed_amount: 0,
                    pending_payments: 0,
                    failed_payments: 0,
                    refunded_payments: 0,
                    refunded_amount: 0,
                },
                payment_methods: methodStats,
                daily_trends: dailyTrends,
                success_rate: stats[0] ?
                    ((stats[0].completed_payments || 0) / (stats[0].total_payments || 1) * 100) : 0,
            };

            return result;
        } catch (error) {
            logger.error('Error retrieving payment statistics', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                timeframe,
            });
            throw ErrorFactory.internal('Failed to retrieve payment statistics');
        }
    }

    /**
     * Get pending payments
     */
    async getPendingPayments(page: number = 1, limit: number = 10) {
        try {
            const offset = (page - 1) * limit;

            const result = await db
                .select()
                .from(payments)
                .where(eq(payments.payment_status, 'pending'))
                .orderBy(desc(payments.created_at))
                .limit(limit)
                .offset(offset);

            // Get total count of pending payments
            const totalResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(payments)
                .where(eq(payments.payment_status, 'pending'));

            const total = totalResult[0]?.count || 0;

            return {
                pending_payments: result,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error('Error retrieving pending payments', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('Failed to retrieve pending payments');
        }
    }
}

export const paymentService = new PaymentService();