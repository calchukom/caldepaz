import { z } from 'zod';

// Base Support Ticket Schema
const supportTicketBaseSchema = z.object({
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject must be 200 characters or less'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be 5000 characters or less'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category: z.enum([
        'general',
        'technical',
        'billing',
        'booking',
        'vehicle',
        'emergency',
        'complaint',
        'feature_request',
        'other'
    ]),
    booking_id: z.string().uuid('Booking ID must be a valid UUID').optional(),
    vehicle_id: z.string().uuid('Vehicle ID must be a valid UUID').optional(),
    contact_email: z.string().email('Contact email must be a valid email address').optional(),
    contact_phone: z.string().regex(/^(\+254|254|0)?[17]\d{8}$/, 'Contact phone must be a valid Kenyan phone number').optional(),
});

// Create Support Ticket Schema
export const createSupportTicketSchema = z.object({
    body: supportTicketBaseSchema,
});

// Update Support Ticket Schema
export const updateSupportTicketSchema = z.object({
    body: supportTicketBaseSchema.partial().extend({
        assigned_to: z.string().uuid('Assigned agent ID must be a valid UUID').nullable().optional(),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
        resolution: z.string().min(10, 'Resolution must be at least 10 characters').max(2000, 'Resolution must be 2000 characters or less').optional(),
        admin_notes: z.string().max(1000, 'Admin notes must be 1000 characters or less').optional(),
    }),
    params: z.object({
        id: z.string().uuid('Ticket ID must be a valid UUID'),
    }),
});

// Support Ticket Query Schema
export const supportTicketQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).refine(val => val > 0, 'Page must be greater than 0').default('1'),
        limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100').default('10'),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        category: z.enum([
            'general',
            'technical',
            'billing',
            'booking',
            'vehicle',
            'emergency',
            'complaint',
            'feature_request',
            'other'
        ]).optional(),
        assigned_to: z.string().uuid('Assigned agent ID must be a valid UUID').optional(),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
        search: z.string().min(2, 'Search query must be at least 2 characters').optional(),
        sortBy: z.enum(['created_at', 'updated_at', 'priority', 'status', 'category']).default('created_at'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }).partial(),
});

// Update Ticket Status Schema
export const updateTicketStatusSchema = z.object({
    body: z.object({
        status: z.enum(['open', 'in_progress', 'resolved', 'closed'], {
            errorMap: () => ({ message: 'Status must be one of: open, in_progress, resolved, closed' })
        }),
        resolution: z.string().min(10, 'Resolution must be at least 10 characters').max(2000, 'Resolution must be 2000 characters or less').optional(),
    }),
    params: z.object({
        id: z.string().uuid('Ticket ID must be a valid UUID'),
    }),
});

// Assign Ticket Schema
export const assignTicketSchema = z.object({
    body: z.object({
        assigned_to: z.string().uuid('Assigned agent ID must be a valid UUID').nullable(),
    }),
    params: z.object({
        id: z.string().uuid('Ticket ID must be a valid UUID'),
    }),
});

// Add Ticket Response Schema
export const addTicketResponseSchema = z.object({
    body: z.object({
        response: z.string().min(10, 'Response must be at least 10 characters').max(2000, 'Response must be 2000 characters or less'),
        is_internal: z.boolean().default(false),
    }),
    params: z.object({
        id: z.string().uuid('Ticket ID must be a valid UUID'),
    }),
});

// Bulk Update Ticket Status Schema
export const bulkUpdateTicketStatusSchema = z.object({
    body: z.object({
        ticket_ids: z.array(z.string().uuid('Each ticket ID must be a valid UUID')).min(1, 'At least one ticket ID is required'),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
        resolution: z.string().min(10, 'Resolution must be at least 10 characters').max(2000, 'Resolution must be 2000 characters or less').optional(),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
});

// Get Single Ticket Schema
export const getSupportTicketSchema = z.object({
    params: z.object({
        id: z.string().uuid('Ticket ID must be a valid UUID'),
    }),
});

// Export types
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;
export type SupportTicketQueryInput = z.infer<typeof supportTicketQuerySchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type AddTicketResponseInput = z.infer<typeof addTicketResponseSchema>;
export type BulkUpdateTicketStatusInput = z.infer<typeof bulkUpdateTicketStatusSchema>;
export type GetSupportTicketInput = z.infer<typeof getSupportTicketSchema>;