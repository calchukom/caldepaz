import Stripe from 'stripe';
import axios from 'axios';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { payments, bookings, users } from '../drizzle/schema';
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

        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-07-30.basil',
        });

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
     * Handle M-Pesa Callback with automatic email sending
     */
    async handleMpesaCallback(callbackData: any) {
        try {
            console.log('📨 M-Pesa Callback received:', JSON.stringify(callbackData, null, 2));

            const { Body } = callbackData;
            const { stkCallback } = Body;

            const {
                MerchantRequestID,
                CheckoutRequestID,
                ResultCode,
                ResultDesc,
                CallbackMetadata,
            } = stkCallback;

            console.log(`🔍 Processing callback for checkout: ${CheckoutRequestID}, result: ${ResultCode}`);

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
            const booking_id = payment[0].booking_id;

            if (ResultCode === 0) {
                // Payment successful
                const metadata = CallbackMetadata?.Item || [];
                const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
                const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
                const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;
                const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value;

                console.log('✅ Payment successful, updating records...', {
                    mpesaReceiptNumber,
                    amount,
                    phoneNumber
                });

                await this.updatePaymentStatus(payment_id, 'completed', {
                    payment_method: 'mpesa',
                    transaction_id: mpesaReceiptNumber || CheckoutRequestID,
                    metadata: {
                        mpesa_receipt_number: mpesaReceiptNumber,
                        transaction_date: transactionDate,
                        phone_number: phoneNumber,
                        amount: amount,
                        merchant_request_id: MerchantRequestID,
                        checkout_request_id: CheckoutRequestID,
                    },
                });

                // ============================================================================
                // 📧 AUTOMATIC EMAIL RECEIPT INTEGRATION
                // ============================================================================

                try {
                    if (booking_id) {
                        console.log('📧 Sending email receipt for successful M-Pesa payment...');

                        // Get booking details with user information
                        const bookingDetails = await db
                            .select({
                                booking_id: bookings.booking_id,
                                user_id: bookings.user_id,
                                vehicle_id: bookings.vehicle_id,
                                pickup_date: bookings.booking_date,
                                return_date: bookings.return_date,
                                total_amount: bookings.total_amount,
                                booking_status: bookings.booking_status,
                                user_email: users.email,
                                user_name: users.firstname,
                            })
                            .from(bookings)
                            .leftJoin(users, eq(bookings.user_id, users.user_id))
                            .where(eq(bookings.booking_id, booking_id))
                            .limit(1);

                        if (bookingDetails.length && bookingDetails[0].user_email) {
                            const booking = bookingDetails[0];

                            // Generate receipt email content
                            const receiptHtml = `
                                <html>
                                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                                            <h1>🚗 CARLEB CALEB VEHICLE RENT</h1>
                                            <h2>M-Pesa Payment Receipt</h2>
                                        </div>
                                        
                                        <div style="padding: 30px; background-color: #f9f9f9;">
                                            <h3 style="color: #28a745;">✅ Payment Confirmed!</h3>
                                            
                                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Booking ID:</td>
                                                    <td style="padding: 10px;">#${booking.booking_id}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Customer:</td>
                                                    <td style="padding: 10px;">${booking.user_name || 'Customer'}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Pickup Date:</td>
                                                    <td style="padding: 10px;">${new Date(booking.pickup_date).toLocaleDateString()}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Return Date:</td>
                                                    <td style="padding: 10px;">${new Date(booking.return_date).toLocaleDateString()}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Total Amount:</td>
                                                    <td style="padding: 10px; font-size: 18px; font-weight: bold; color: #28a745;">KES ${amount || booking.total_amount}</td>
                                                </tr>
                                            </table>

                                            <h3 style="color: #007bff;">M-Pesa Payment Details</h3>
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">M-Pesa Receipt:</td>
                                                    <td style="padding: 10px; color: #28a745; font-weight: bold;">${mpesaReceiptNumber}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Phone Number:</td>
                                                    <td style="padding: 10px;">${phoneNumber}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #ddd;">
                                                    <td style="padding: 10px; font-weight: bold;">Transaction Date:</td>
                                                    <td style="padding: 10px;">${transactionDate ? new Date(parseInt(transactionDate)).toLocaleString() : new Date().toLocaleString()}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <div style="background-color: #667eea; color: white; padding: 20px; text-align: center;">
                                            <p>Thank you for choosing CARLEB CALEB VEHICLE RENT!</p>
                                            <p>📧 support@carlebrent.com | 📞 +254-XXX-XXXXX</p>
                                        </div>
                                    </body>
                                </html>
                            `;

                            // Send email using internal endpoint (assuming it's available)
                            try {
                                const axios = require('axios');
                                const emailResponse = await axios.post(
                                    'https://momanyicalebcarrent-awf5ffdbh8fnhca5.southafricanorth-01.azurewebsites.net/api/email/send',
                                    {
                                        to: booking.user_email,
                                        subject: `M-Pesa Payment Receipt - Booking #${booking.booking_id}`,
                                        html: receiptHtml
                                    },
                                    {
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        timeout: 10000
                                    }
                                );

                                console.log('📧 Email receipt sent successfully!', {
                                    to: booking.user_email,
                                    booking_id: booking.booking_id,
                                    mpesa_receipt: mpesaReceiptNumber
                                });

                            } catch (emailError) {
                                console.error('📧 Failed to send email receipt via API:', (emailError as Error).message);

                                // Try direct email sending as fallback
                                try {
                                    const nodemailer = require('nodemailer');
                                    const transporter = nodemailer.createTransporter({
                                        host: 'smtp.gmail.com',
                                        port: 587,
                                        secure: false,
                                        auth: {
                                            user: process.env.EMAIL_SENDER,
                                            pass: process.env.EMAIL_PASSWORD
                                        }
                                    });

                                    await transporter.sendMail({
                                        from: `"CARLEB Car Rental" <${process.env.EMAIL_SENDER}>`,
                                        to: booking.user_email,
                                        subject: `M-Pesa Payment Receipt - Booking #${booking.booking_id}`,
                                        html: receiptHtml
                                    });

                                    console.log('📧 Email receipt sent via direct SMTP!');
                                } catch (directEmailError) {
                                    console.error('📧 Direct email also failed:', (directEmailError as Error).message);
                                }
                            }

                        } else {
                            console.log('⚠️ No user email found for booking:', booking_id);
                        }
                    }
                } catch (emailError) {
                    console.error('📧 Failed to send email receipt:', emailError);
                    // Don't fail the callback if email fails
                    logger.error('Failed to send M-Pesa receipt email', {
                        module: 'payments',
                        error: emailError instanceof Error ? emailError.message : 'Unknown error',
                        booking_id,
                        payment_id
                    });
                }

                logger.info('M-Pesa payment completed', {
                    module: 'payments',
                    payment_id,
                    mpesaReceiptNumber,
                });

            } else {
                // Payment failed
                console.log('❌ Payment failed, updating status...', {
                    resultCode: ResultCode,
                    resultDesc: ResultDesc
                });

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
            console.error('💥 Error handling M-Pesa callback:', error);
            logger.error('Error handling M-Pesa callback', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                callbackData,
            });
            throw ErrorFactory.internal('Failed to process M-Pesa callback');
        }
    }

    /**
     * Check M-Pesa transaction status with enhanced error handling and frontend compatibility
     */
    async checkMpesaTransactionStatus(checkoutRequestId: string) {
        try {
            console.log(`🔍 Checking M-Pesa status for: ${checkoutRequestId}`);

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

            console.log('🌐 Querying M-Pesa API...', { checkoutRequestId, businessShortCode });

            const response = await axios.post(
                `${this.mpesaBaseUrl}/mpesa/stkpushquery/v1/query`,
                queryPayload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000, // 30 second timeout
                }
            );

            const mpesaData = response.data;
            console.log('📡 M-Pesa API Response:', JSON.stringify(mpesaData, null, 2));

            // Parse M-Pesa response and standardize format
            let paymentStatus = 'pending';
            let mpesaReceiptNumber = null;
            let errorMessage = null;
            let amount = null;
            let phoneNumber = null;

            if (mpesaData.ResponseCode === "0") {
                if (mpesaData.ResultCode === "0") {
                    paymentStatus = 'completed';

                    // Extract details from CallbackMetadata
                    if (mpesaData.CallbackMetadata && mpesaData.CallbackMetadata.Item) {
                        const metadataItems = mpesaData.CallbackMetadata.Item;

                        const receiptItem = metadataItems.find((item: any) => item.Name === 'MpesaReceiptNumber');
                        const amountItem = metadataItems.find((item: any) => item.Name === 'Amount');
                        const phoneItem = metadataItems.find((item: any) => item.Name === 'PhoneNumber');

                        if (receiptItem) mpesaReceiptNumber = receiptItem.Value;
                        if (amountItem) amount = amountItem.Value;
                        if (phoneItem) phoneNumber = phoneItem.Value;
                    }

                    console.log('✅ Payment completed successfully', {
                        mpesaReceiptNumber,
                        amount,
                        phoneNumber
                    });

                } else if (mpesaData.ResultCode === "1032") {
                    paymentStatus = 'cancelled';
                    errorMessage = 'Payment was cancelled by user';
                    console.log('❌ Payment cancelled by user');

                } else if (mpesaData.ResultCode === "1037") {
                    paymentStatus = 'timeout';
                    errorMessage = 'Payment request timed out';
                    console.log('⏰ Payment request timed out');

                } else if (mpesaData.ResultCode === "1001") {
                    paymentStatus = 'failed';
                    errorMessage = 'Insufficient funds in M-Pesa account';
                    console.log('💰 Insufficient funds');

                } else if (mpesaData.ResultCode === "1025") {
                    paymentStatus = 'failed';
                    errorMessage = 'Unable to lock subscriber, a transaction is already in process for the current subscriber';
                    console.log('🔒 Transaction already in process');

                } else {
                    paymentStatus = 'failed';
                    errorMessage = mpesaData.ResultDesc || 'Payment failed';
                    console.log('❌ Payment failed:', mpesaData.ResultDesc);
                }
            } else if (mpesaData.ResponseCode === "500.001.1001") {
                // Request is still being processed
                paymentStatus = 'pending';
                console.log('⏳ Payment still being processed');

            } else {
                paymentStatus = 'failed';
                errorMessage = mpesaData.ResponseDescription || 'Unknown error occurred';
                console.log('❌ API Error:', mpesaData.ResponseDescription);
            }

            // Return standardized response for frontend compatibility
            const standardizedResponse = {
                success: true,
                data: {
                    checkout_request_id: checkoutRequestId,
                    payment_status: paymentStatus,
                    mpesa_receipt_number: mpesaReceiptNumber,
                    amount: amount,
                    phone_number: phoneNumber,
                    result_code: mpesaData.ResultCode,
                    result_description: mpesaData.ResultDesc,
                    error_message: errorMessage,
                    timestamp: new Date().toISOString(),
                    raw_mpesa_response: mpesaData // For debugging
                }
            };

            console.log('📤 Sending standardized response:', JSON.stringify(standardizedResponse, null, 2));
            return standardizedResponse;

        } catch (error) {
            console.error('💥 Error checking M-Pesa status:', error);

            // Handle specific axios errors
            if ((error as any).response) {
                console.error('M-Pesa API Error Response:', (error as any).response.data);
                console.error('Status:', (error as any).response.status);

                if ((error as any).response.status === 400) {
                    return {
                        success: false,
                        error: 'Invalid checkout request ID',
                        message: 'The provided checkout request ID is not valid or has expired',
                        data: {
                            checkout_request_id: checkoutRequestId,
                            payment_status: 'failed',
                            error_message: 'Invalid or expired checkout request ID',
                            timestamp: new Date().toISOString()
                        }
                    };
                }

                if ((error as any).response.status === 401) {
                    return {
                        success: false,
                        error: 'Authentication failed',
                        message: 'M-Pesa authentication failed. Please check credentials.',
                        data: {
                            checkout_request_id: checkoutRequestId,
                            payment_status: 'failed',
                            error_message: 'Authentication failed',
                            timestamp: new Date().toISOString()
                        }
                    };
                }
            }

            logger.error('Error checking M-Pesa transaction status', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                checkoutRequestId,
                stack: (error as Error).stack
            });

            return {
                success: false,
                error: 'Internal server error',
                message: 'Failed to check payment status. Please try again.',
                data: {
                    checkout_request_id: checkoutRequestId,
                    payment_status: 'error',
                    error_message: 'Failed to check payment status',
                    timestamp: new Date().toISOString()
                }
            };
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

    // ============================================================================
    // ENHANCED STRIPE FEATURES
    // ============================================================================

    /**
     * Create Stripe Checkout Session for vehicle rental
     */
    async createCheckoutSession(data: {
        booking_id: string;
        amount: number;
        currency?: string;
        customer_email?: string;
        success_url?: string;
        cancel_url?: string;
        metadata?: Record<string, string>;
    }) {
        try {
            const {
                booking_id,
                amount,
                currency = 'usd',
                customer_email,
                success_url = process.env.STRIPE_SUCCESS_URL,
                cancel_url = process.env.STRIPE_CANCEL_URL,
                metadata = {}
            } = data;

            // Get booking details for session description
            const booking = await db
                .select({
                    booking_id: bookings.booking_id,
                    user_id: bookings.user_id,
                    vehicle_id: bookings.vehicle_id,
                    booking_date: bookings.booking_date,
                    return_date: bookings.return_date,
                    total_amount: bookings.total_amount,
                })
                .from(bookings)
                .where(eq(bookings.booking_id, booking_id))
                .limit(1);

            if (!booking.length) {
                throw ErrorFactory.notFound('Booking not found');
            }

            const bookingData = booking[0];
            const startDate = new Date(bookingData.booking_date).toLocaleDateString();
            const endDate = new Date(bookingData.return_date).toLocaleDateString();

            const session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: customer_email,
                line_items: [
                    {
                        price_data: {
                            currency: currency,
                            product_data: {
                                name: 'Vehicle Rental',
                                description: `Rental from ${startDate} to ${endDate}`,
                                metadata: {
                                    booking_id: booking_id,
                                    vehicle_id: bookingData.vehicle_id,
                                },
                            },
                            unit_amount: Math.round(amount * 100), // Convert to cents
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    booking_id,
                    user_id: bookingData.user_id,
                    ...metadata,
                },
                success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking_id}`,
                cancel_url: `${cancel_url}?booking_id=${booking_id}`,
                expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
            });

            logger.info('Stripe Checkout Session created', {
                module: 'payments',
                sessionId: session.id,
                booking_id,
                amount,
                currency,
            });

            return {
                session_id: session.id,
                checkout_url: session.url,
                expires_at: session.expires_at,
                amount_total: session.amount_total ? session.amount_total / 100 : amount,
                currency: session.currency || currency,
            };
        } catch (error) {
            logger.error('Error creating Stripe Checkout Session', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error instanceof Error ? ErrorFactory.internal(error.message) : ErrorFactory.internal('Failed to create checkout session');
        }
    }

    /**
     * Create or update Stripe customer
     */
    async createOrUpdateCustomer(userData: {
        user_id: string;
        email: string;
        name?: string;
        phone?: string;
        metadata?: Record<string, string>;
    }) {
        try {
            const { user_id, email, name, phone, metadata = {} } = userData;

            // Check if customer already exists
            const existingCustomers = await this.stripe.customers.list({
                email: email,
                limit: 1,
            });

            let customer: Stripe.Customer;

            if (existingCustomers.data.length > 0) {
                // Update existing customer
                customer = await this.stripe.customers.update(existingCustomers.data[0].id, {
                    name: name,
                    phone: phone,
                    metadata: {
                        user_id,
                        ...metadata,
                    },
                });
            } else {
                // Create new customer
                customer = await this.stripe.customers.create({
                    email: email,
                    name: name,
                    phone: phone,
                    metadata: {
                        user_id,
                        ...metadata,
                    },
                });
            }

            logger.info('Stripe customer created/updated', {
                module: 'payments',
                customer_id: customer.id,
                user_id,
                email,
            });

            return {
                customer_id: customer.id,
                email: customer.email,
                name: customer.name,
                created: customer.created,
            };
        } catch (error) {
            logger.error('Error creating/updating Stripe customer', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                userData,
            });
            throw ErrorFactory.internal('Failed to create/update customer');
        }
    }

    /**
     * Create subscription for recurring rentals
     */
    async createSubscription(data: {
        customer_id: string;
        price_id: string;
        user_id: string;
        metadata?: Record<string, string>;
    }) {
        try {
            const { customer_id, price_id, user_id, metadata = {} } = data;

            const subscription = await this.stripe.subscriptions.create({
                customer: customer_id,
                items: [{ price: price_id }],
                metadata: {
                    user_id,
                    ...metadata,
                },
                expand: ['latest_invoice.payment_intent'],
            });

            logger.info('Stripe subscription created', {
                module: 'payments',
                subscription_id: subscription.id,
                customer_id,
                user_id,
            });

            return {
                subscription_id: subscription.id,
                status: subscription.status,
                current_period_start: (subscription as any).current_period_start,
                current_period_end: (subscription as any).current_period_end,
                latest_invoice: subscription.latest_invoice,
            };
        } catch (error) {
            logger.error('Error creating subscription', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw ErrorFactory.internal('Failed to create subscription');
        }
    }

    /**
     * Get comprehensive payment analytics
     */
    async getPaymentAnalytics(filters: {
        start_date?: Date;
        end_date?: Date;
        payment_method?: string;
        user_id?: string;
        currency?: string;
    } = {}) {
        try {
            const {
                start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                end_date = new Date(),
                payment_method,
                user_id,
                currency
            } = filters;

            // Build WHERE conditions
            const whereConditions = [
                sql`created_at >= ${start_date}`,
                sql`created_at <= ${end_date}`
            ];

            if (payment_method) {
                whereConditions.push(eq(payments.payment_method, payment_method as any));
            }

            if (user_id) {
                whereConditions.push(eq(payments.user_id, user_id));
            }

            if (currency) {
                whereConditions.push(eq(payments.currency, currency));
            }

            // Get overall statistics
            const overallStats = await db
                .select({
                    total_transactions: sql<number>`count(*)`,
                    total_revenue: sql<number>`sum(CAST(amount AS DECIMAL))`,
                    avg_transaction_value: sql<number>`avg(CAST(amount AS DECIMAL))`,
                    successful_transactions: sql<number>`count(*) filter (where payment_status = 'completed')`,
                    failed_transactions: sql<number>`count(*) filter (where payment_status = 'failed')`,
                    pending_transactions: sql<number>`count(*) filter (where payment_status = 'pending')`,
                    refunded_transactions: sql<number>`count(*) filter (where payment_status = 'refunded')`,
                    total_refunded: sql<number>`sum(CAST(amount AS DECIMAL)) filter (where payment_status = 'refunded')`,
                })
                .from(payments)
                .where(and(...whereConditions));

            // Get payment method breakdown
            const paymentMethodStats = await db
                .select({
                    payment_method: payments.payment_method,
                    transaction_count: sql<number>`count(*)`,
                    total_amount: sql<number>`sum(CAST(amount AS DECIMAL))`,
                    success_rate: sql<number>`(count(*) filter (where payment_status = 'completed'))::float / count(*) * 100`,
                })
                .from(payments)
                .where(and(...whereConditions))
                .groupBy(payments.payment_method);

            // Get daily revenue trends
            const dailyRevenue = await db
                .select({
                    date: sql<string>`DATE(created_at)`,
                    total_revenue: sql<number>`sum(CAST(amount AS DECIMAL)) filter (where payment_status = 'completed')`,
                    transaction_count: sql<number>`count(*) filter (where payment_status = 'completed')`,
                    avg_transaction_value: sql<number>`avg(CAST(amount AS DECIMAL)) filter (where payment_status = 'completed')`,
                })
                .from(payments)
                .where(and(...whereConditions))
                .groupBy(sql`DATE(created_at)`)
                .orderBy(sql`DATE(created_at)`);

            // Get currency breakdown
            const currencyStats = await db
                .select({
                    currency: payments.currency,
                    transaction_count: sql<number>`count(*)`,
                    total_amount: sql<number>`sum(CAST(amount AS DECIMAL))`,
                })
                .from(payments)
                .where(and(...whereConditions, eq(payments.payment_status, 'completed')))
                .groupBy(payments.currency);

            // Calculate success rate and other metrics
            const stats = overallStats[0];
            const successRate = stats ? (stats.successful_transactions / (stats.total_transactions || 1)) * 100 : 0;
            const conversionRate = stats ? (stats.successful_transactions / (stats.total_transactions || 1)) * 100 : 0;

            return {
                period: {
                    start_date,
                    end_date,
                    days: Math.ceil((end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24)),
                },
                filters,
                overall_statistics: {
                    ...stats,
                    success_rate: Math.round(successRate * 100) / 100,
                    conversion_rate: Math.round(conversionRate * 100) / 100,
                    average_daily_revenue: stats ? Math.round((stats.total_revenue || 0) / Math.max(1, Math.ceil((end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24)))) : 0,
                },
                payment_method_breakdown: paymentMethodStats,
                daily_trends: dailyRevenue,
                currency_breakdown: currencyStats,
                insights: this.generatePaymentInsights(stats, paymentMethodStats, dailyRevenue),
            };
        } catch (error) {
            logger.error('Error generating payment analytics', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                filters,
            });
            throw ErrorFactory.internal('Failed to generate payment analytics');
        }
    }

    /**
     * Generate payment insights
     */
    private generatePaymentInsights(
        overallStats: any,
        methodStats: any[],
        dailyTrends: any[]
    ) {
        const insights = [];

        if (overallStats) {
            // Success rate insights
            const successRate = (overallStats.successful_transactions / (overallStats.total_transactions || 1)) * 100;
            if (successRate > 95) {
                insights.push({
                    type: 'positive',
                    metric: 'success_rate',
                    message: `Excellent success rate of ${Math.round(successRate * 100) / 100}%`,
                    value: successRate,
                });
            } else if (successRate < 85) {
                insights.push({
                    type: 'warning',
                    metric: 'success_rate',
                    message: `Low success rate of ${Math.round(successRate * 100) / 100}%. Consider investigating failed payments.`,
                    value: successRate,
                });
            }

            // Revenue insights
            if (overallStats.total_revenue > 10000) {
                insights.push({
                    type: 'positive',
                    metric: 'revenue',
                    message: `Strong revenue performance with $${Math.round(overallStats.total_revenue).toLocaleString()}`,
                    value: overallStats.total_revenue,
                });
            }
        }

        // Payment method insights
        if (methodStats.length > 1) {
            const topMethod = methodStats.reduce((prev, current) =>
                (prev.total_amount > current.total_amount) ? prev : current
            );
            insights.push({
                type: 'info',
                metric: 'payment_method',
                message: `${topMethod.payment_method} is the top payment method by revenue`,
                value: topMethod.total_amount,
            });
        }

        return insights;
    }

    /**
     * Enhanced webhook handler with booking status updates
     */
    async handleEnhancedStripeWebhook(body: string, signature: string) {
        try {
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!endpointSecret) {
                throw ErrorFactory.internal('Stripe webhook secret not configured');
            }

            const event = this.stripe.webhooks.constructEvent(body, signature, endpointSecret);

            logger.info('Processing enhanced Stripe webhook', {
                module: 'payments',
                event_type: event.type,
                event_id: event.id,
            });

            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
                    break;

                case 'payment_intent.succeeded':
                    await this.updateBookingStatusOnPaymentSuccess(event.data.object as Stripe.PaymentIntent);
                    break;

                case 'payment_intent.payment_failed':
                    await this.updateBookingStatusOnPaymentFailure(event.data.object as Stripe.PaymentIntent);
                    break;

                default:
                    logger.info('Unhandled enhanced Stripe webhook event', {
                        module: 'payments',
                        eventType: event.type,
                    });
            }

            return { received: true };
        } catch (error) {
            logger.error('Error handling enhanced Stripe webhook', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error instanceof Error ? ErrorFactory.internal(error.message) : ErrorFactory.internal('Webhook processing failed');
        }
    }

    /**
     * Handle successful checkout session
     */
    private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
        try {
            const booking_id = session.metadata?.booking_id;
            const payment_intent_id = session.payment_intent as string;

            if (!booking_id) {
                logger.warn('Booking ID not found in checkout session metadata', {
                    module: 'payments',
                    sessionId: session.id,
                });
                return;
            }

            // Update payment record
            const existingPayment = await db
                .select()
                .from(payments)
                .where(and(
                    eq(payments.booking_id, booking_id),
                    eq(payments.payment_method, 'stripe')
                ))
                .limit(1);

            if (existingPayment.length > 0) {
                await db
                    .update(payments)
                    .set({
                        payment_status: 'completed',
                        transaction_id: payment_intent_id,
                        updated_at: new Date(),
                        metadata: JSON.stringify({
                            checkout_session_id: session.id,
                            payment_intent_id,
                            customer_email: session.customer_email,
                        }),
                    })
                    .where(eq(payments.payment_id, existingPayment[0].payment_id));
            } else {
                await db
                    .insert(payments)
                    .values({
                        booking_id,
                        user_id: session.metadata?.user_id || '',
                        amount: ((session.amount_total || 0) / 100).toString(),
                        currency: session.currency || 'usd',
                        payment_method: 'stripe',
                        payment_status: 'completed',
                        transaction_id: payment_intent_id,
                        metadata: JSON.stringify({
                            checkout_session_id: session.id,
                            payment_intent_id,
                            customer_email: session.customer_email,
                        }),
                        created_at: new Date(),
                        updated_at: new Date(),
                    });
            }

            // Update booking status to confirmed
            await db
                .update(bookings)
                .set({
                    booking_status: 'confirmed',
                    updated_at: new Date(),
                })
                .where(eq(bookings.booking_id, booking_id));

            logger.info('Checkout session completed and booking confirmed', {
                module: 'payments',
                booking_id,
                session_id: session.id,
                amount: (session.amount_total || 0) / 100,
            });
        } catch (error) {
            logger.error('Error handling checkout session completion', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                session_id: session.id,
            });
        }
    }

    /**
     * Update booking status on successful payment
     */
    private async updateBookingStatusOnPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
        try {
            const booking_id = paymentIntent.metadata?.booking_id;

            if (!booking_id) {
                logger.warn('Booking ID not found in payment intent metadata', {
                    module: 'payments',
                    payment_intent_id: paymentIntent.id,
                });
                return;
            }

            // Update booking status to confirmed
            await db
                .update(bookings)
                .set({
                    booking_status: 'confirmed',
                    updated_at: new Date(),
                })
                .where(eq(bookings.booking_id, booking_id));

            logger.info('Booking confirmed after successful Stripe payment', {
                module: 'payments',
                booking_id,
                payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
            });
        } catch (error) {
            logger.error('Error updating booking status on payment success', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                payment_intent_id: paymentIntent.id,
            });
        }
    }

    /**
     * Update booking status on failed payment
     */
    private async updateBookingStatusOnPaymentFailure(paymentIntent: Stripe.PaymentIntent) {
        try {
            const booking_id = paymentIntent.metadata?.booking_id;

            if (!booking_id) {
                logger.warn('Booking ID not found in payment intent metadata', {
                    module: 'payments',
                    payment_intent_id: paymentIntent.id,
                });
                return;
            }

            // Update booking status to payment_failed
            await db
                .update(bookings)
                .set({
                    booking_status: 'payment_failed',
                    updated_at: new Date(),
                })
                .where(eq(bookings.booking_id, booking_id));

            logger.info('Booking marked as payment failed', {
                module: 'payments',
                booking_id,
                payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
            });
        } catch (error) {
            logger.error('Error updating booking status on payment failure', {
                module: 'payments',
                error: error instanceof Error ? error.message : 'Unknown error',
                payment_intent_id: paymentIntent.id,
            });
        }
    }
}

export const paymentService = new PaymentService();