import { z } from 'zod';

// Schema for sending a chat message
export const chatMessageSchema = z.object({
    body: z.object({
        message: z.string()
            .min(1, 'Message cannot be empty')
            .max(5000, 'Message cannot exceed 5000 characters'),
        messageType: z.enum(['text', 'image', 'file']).default('text'),
        attachmentUrl: z.string().url().optional()
    })
});

// Schema for marking messages as read
export const markAsReadSchema = z.object({
    params: z.object({
        ticketId: z.string().uuid('Invalid ticket ID format')
    })
});

// Schema for getting chat messages
export const getChatMessagesSchema = z.object({
    params: z.object({
        ticketId: z.string().uuid('Invalid ticket ID format')
    }),
    query: z.object({
        page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
        limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('50')
    }).optional()
});

// Schema for getting chat statistics
export const getChatStatsSchema = z.object({
    params: z.object({
        ticketId: z.string().uuid('Invalid ticket ID format')
    })
});

// Schema for getting active chats (for support agents)
export const getActiveChatsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
        limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('20')
    }).optional()
});

// Schema for typing indicators
export const typingIndicatorSchema = z.object({
    params: z.object({
        ticketId: z.string().uuid('Invalid ticket ID format')
    })
});

// Export all schemas as a single object for easy importing
export const chatValidationSchemas = {
    chatMessageSchema,
    markAsReadSchema,
    getChatMessagesSchema,
    getChatStatsSchema,
    getActiveChatsSchema,
    typingIndicatorSchema
};
