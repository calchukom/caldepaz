import { z } from 'zod';

// Create location schema
export const createLocationSchema = z.object({
    body: z.object({
        name: z.string()
            .min(1, 'Name is required')
            .max(255, 'Name must be less than 255 characters')
            .trim(),

        address: z.string()
            .min(1, 'Address is required')
            .max(500, 'Address must be less than 500 characters')
            .trim(),

        contact_phone: z.string()
            .min(1, 'Contact phone is required')
            .max(20, 'Contact phone must be less than 20 characters')
            .trim()
    }).strict()
});

// Update location schema
export const updateLocationSchema = z.object({
    body: z.object({
        name: z.string()
            .min(1, 'Name cannot be empty')
            .max(255, 'Name must be less than 255 characters')
            .trim()
            .optional(),

        address: z.string()
            .min(1, 'Address cannot be empty')
            .max(500, 'Address must be less than 500 characters')
            .trim()
            .optional(),

        contact_phone: z.string()
            .min(1, 'Contact phone cannot be empty')
            .max(20, 'Contact phone must be less than 20 characters')
            .trim()
            .optional()
    }).strict()
});

// Location query schema for filtering/searching
export const locationQuerySchema = z.object({
    query: z.object({
        page: z.string()
            .regex(/^\d+$/, 'Page must be a positive number')
            .transform(Number)
            .refine(n => n > 0, 'Page must be greater than 0')
            .optional(),

        limit: z.string()
            .regex(/^\d+$/, 'Limit must be a positive number')
            .transform(Number)
            .refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100')
            .optional(),

        search: z.string()
            .min(1, 'Search term cannot be empty')
            .max(100, 'Search term must be less than 100 characters')
            .trim()
            .optional(),

        sortBy: z.enum(['name', 'address', 'contact_phone', 'created_at', 'updated_at'])
            .optional(),

        sortOrder: z.enum(['asc', 'desc'])
            .optional()
    }).strict()
});

// Popular locations query schema
export const popularLocationsQuerySchema = z.object({
    query: z.object({
        limit: z.string()
            .regex(/^\d+$/, 'Limit must be a positive number')
            .transform(Number)
            .refine(n => n > 0 && n <= 50, 'Limit must be between 1 and 50')
            .optional(),

        source: z.enum(['kenyan', 'database', 'external', 'api'])
            .optional()
    }).strict()
});

// Create from popular location schema
export const createFromPopularSchema = z.object({
    body: z.object({
        locationId: z.number()
            .int('Location ID must be an integer')
            .min(1, 'Location ID must be positive'),

        source: z.enum(['external', 'kenyan', 'api'])
    }).strict()
});

// Location parameters schema
export const locationParamsSchema = z.object({
    params: z.object({
        id: z.string()
            .uuid('Invalid location ID format')
    }).strict()
});

// Export types for TypeScript
export type CreateLocationDto = z.infer<typeof createLocationSchema>['body'];
export type UpdateLocationDto = z.infer<typeof updateLocationSchema>['body'];
export type LocationQueryDto = z.infer<typeof locationQuerySchema>['query'];
export type PopularLocationsQueryDto = z.infer<typeof popularLocationsQuerySchema>['query'];
export type CreateFromPopularDto = z.infer<typeof createFromPopularSchema>['body'];
export type LocationParamsDto = z.infer<typeof locationParamsSchema>['params'];