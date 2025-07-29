import { z } from 'zod';

// Booking Query Schema (defined first to be used by other schemas)
export const bookingQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).refine(val => val > 0, 'Page must be greater than 0').default('1'),
        limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100').default('10'),
        sortBy: z.enum(['created_at', 'booking_date', 'return_date', 'total_amount', 'booking_status']).default('created_at'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        search: z.string().min(2, 'Search query must be at least 2 characters').optional(),
        user_id: z.string().uuid('User ID must be a valid UUID').optional(),
        vehicle_id: z.string().uuid('Vehicle ID must be a valid UUID').optional(),
        location_id: z.string().uuid('Location ID must be a valid UUID').optional(),
        booking_status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
        date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date from must be in YYYY-MM-DD format').optional(),
        date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date to must be in YYYY-MM-DD format').optional(),
        min_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Min amount must be a valid number').transform(Number).optional(),
        max_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Max amount must be a valid number').transform(Number).optional(),
    }),
});

// Create Booking Schema
export const createBookingSchema = z.object({
    body: z.object({
        vehicle_id: z.string().uuid('Vehicle ID must be a valid UUID'),
        location_id: z.string().uuid('Location ID must be a valid UUID'),
        booking_date: z.string().datetime('Booking date must be a valid datetime'),
        return_date: z.string().datetime('Return date must be a valid datetime'),
        special_requests: z.string().max(1000, 'Special requests must be 1000 characters or less').optional(),
    }).refine((data) => {
        return new Date(data.return_date) > new Date(data.booking_date);
    }, {
        message: 'Return date must be after booking date',
        path: ['return_date'],
    }),
});

// Update Booking Schema
export const updateBookingSchema = z.object({
    params: z.object({
        id: z.string().uuid('Booking ID must be a valid UUID'),
    }),
    body: z.object({
        vehicle_id: z.string().uuid('Vehicle ID must be a valid UUID').optional(),
        location_id: z.string().uuid('Location ID must be a valid UUID').optional(),
        booking_date: z.string().datetime('Booking date must be a valid datetime').optional(),
        return_date: z.string().datetime('Return date must be a valid datetime').optional(),
        special_requests: z.string().max(1000, 'Special requests must be 1000 characters or less').optional(),
        booking_status: z.enum(['confirmed', 'cancelled', 'completed']).optional(),
    }).refine((data) => {
        if (data.booking_date && data.return_date) {
            return new Date(data.return_date) > new Date(data.booking_date);
        }
        return true;
    }, {
        message: 'Return date must be after booking date',
        path: ['return_date'],
    }),
});

// Get Booking Schema (for single booking by ID)
export const getBookingSchema = z.object({
    params: z.object({
        id: z.string().uuid('Booking ID must be a valid UUID'),
    }),
});

// Get Bookings Schema (for listing bookings with query params)
export const getBookingsSchema = bookingQuerySchema;

// Booking Status Schema
export const bookingStatusSchema = z.object({
    body: z.object({
        status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], {
            errorMap: () => ({ message: 'Status must be one of: pending, confirmed, in_progress, completed, cancelled' })
        }),
    }),
});

// Cancel Booking Schema
export const cancelBookingSchema = z.object({
    body: z.object({
        cancellation_reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Cancellation reason must be 500 characters or less').optional(),
    }),
});

// Extend Booking Schema
export const extendBookingSchema = z.object({
    body: z.object({
        new_return_date: z.string().datetime('New return date must be a valid datetime'),
    }),
});

// Check Availability Schema
export const checkAvailabilitySchema = z.object({
    body: z.object({
        vehicle_id: z.string().uuid('Vehicle ID must be a valid UUID'),
        booking_date_from: z.string().datetime('Booking date from must be a valid datetime'),
        booking_date_to: z.string().datetime('Booking date to must be a valid datetime'),
        location_id: z.string().uuid('Location ID must be a valid UUID').optional(),
    }).refine((data) => {
        return new Date(data.booking_date_to) > new Date(data.booking_date_from);
    }, {
        message: 'End date must be after start date',
        path: ['booking_date_to'],
    }),
});

// Export types
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ExtendBookingInput = z.infer<typeof extendBookingSchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;