import { z } from 'zod';

// Stripe Payment Intent Schema
export const createStripePaymentSchema = z.object({
    amount: z.number().positive('Amount must be a positive number'),
    booking_id: z.string().uuid('Booking ID must be a valid UUID'),
    currency: z.string().length(3, 'Currency must be a 3-letter code').optional().default('usd'),
    metadata: z.record(z.string()).optional(),
});

// M-Pesa Payment Schema
export const processMpesaPaymentSchema = z.object({
    payment_id: z.string().uuid('Payment ID must be a valid UUID'),
    phone_number: z.string()
        .regex(/^(\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number format')
        .transform(val => {
            // Normalize phone number to 254XXXXXXXXX format
            const cleaned = val.replace(/\D/g, '');
            if (cleaned.startsWith('254')) return cleaned;
            if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
            if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
            throw new Error('Invalid phone number');
        }),
});

// M-Pesa STK Push Schema (booking-based)
export const initiateMpesaStkPushSchema = z.object({
    body: z.object({
        booking_id: z.string().uuid('Booking ID must be a valid UUID'),
        phone_number: z.string()
            .regex(/^(\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number format')
            .transform(val => {
                const cleaned = val.replace(/\D/g, '');
                if (cleaned.startsWith('254')) return cleaned;
                if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
                if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
                throw new Error('Invalid phone number');
            }),
        amount: z.number().positive('Amount must be a positive number'),
        currency: z.string().length(3).default('KES'),
        description: z.string().optional(),
    })
});

// Unified Process Payment Schema
export const processPaymentSchema = z.object({
    payment_method: z.enum(['stripe', 'mpesa'], {
        errorMap: () => ({ message: 'Payment method must be either stripe or mpesa' })
    }),
    // Stripe-specific fields
    amount: z.number().positive().optional(),
    booking_id: z.string().uuid().optional(),
    currency: z.string().length(3).optional(),
    metadata: z.record(z.string()).optional(),
    // M-Pesa-specific fields
    payment_id: z.string().uuid().optional(),
    phone_number: z.string().optional(),
}).refine((data) => {
    if (data.payment_method === 'stripe') {
        return data.amount && data.booking_id;
    }
    if (data.payment_method === 'mpesa') {
        return data.payment_id && data.phone_number;
    }
    return false;
}, {
    message: 'Required fields missing for the selected payment method',
});

// Create Payment Record Schema
export const createPaymentSchema = z.object({
    booking_id: z.string().uuid('Booking ID must be a valid UUID'),
    amount: z.number().positive('Amount must be a positive number').or(
        z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal')
            .transform(val => parseFloat(val))
    ),
    payment_method: z.enum(['stripe', 'mpesa', 'cash', 'bank_transfer', 'credit_card']),
    payment_status: z.enum(['pending', 'completed', 'failed', 'cancelled']).default('pending'),
    currency: z.string().length(3).default('USD'),
    external_transaction_id: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

// Update Payment Schema
export const updatePaymentSchema = z.object({
    payment_status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
    external_transaction_id: z.string().optional(),
    failure_reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

// Payment Query Schema
export const paymentQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    booking_id: z.string().uuid().optional(),
    payment_method: z.enum(['stripe', 'mpesa', 'cash', 'bank_transfer', 'credit_card']).optional(),
    payment_status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    min_amount: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
    max_amount: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
});

// Webhook Validation Schemas
export const stripeWebhookSchema = z.object({
    type: z.string(),
    data: z.object({
        object: z.any(),
    }),
    id: z.string(),
    created: z.number(),
});

export const mpesaCallbackSchema = z.object({
    Body: z.object({
        stkCallback: z.object({
            MerchantRequestID: z.string(),
            CheckoutRequestID: z.string(),
            ResultCode: z.number(),
            ResultDesc: z.string(),
            CallbackMetadata: z.object({
                Item: z.array(z.object({
                    Name: z.string(),
                    Value: z.any(),
                })).optional(),
            }).optional(),
        }),
    }),
});

// Export types
export type CreateStripePaymentInput = z.infer<typeof createStripePaymentSchema>;
export type ProcessMpesaPaymentInput = z.infer<typeof processMpesaPaymentSchema>;
export type InitiateMpesaStkPushInput = z.infer<typeof initiateMpesaStkPushSchema>;
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>;
export type MpesaCallbackInput = z.infer<typeof mpesaCallbackSchema>;