import { z } from 'zod';

// Create Vehicle Specification Schema
export const createVehicleSpecSchema = z.object({
    body: z.object({
        manufacturer: z.string().min(2, 'Manufacturer must be at least 2 characters').max(50, 'Manufacturer must be 50 characters or less'),
        model: z.string().min(1, 'Model is required').max(50, 'Model must be 50 characters or less'),
        year: z.number().int().min(1990, 'Year must be 1990 or later').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
        fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid'], {
            errorMap: () => ({ message: 'Fuel type must be one of: petrol, diesel, electric, hybrid' })
        }),
        engine_capacity: z.string().optional(),
        transmission: z.enum(['manual', 'automatic', 'cvt'], {
            errorMap: () => ({ message: 'Transmission must be one of: manual, automatic, cvt' })
        }),
        seating_capacity: z.number().int().min(1, 'Seating capacity must be at least 1').max(50, 'Seating capacity cannot exceed 50'),
        color: z.string().optional(),
        features: z.string().optional(),
        vehicle_category: z.enum(['four_wheeler', 'two_wheeler'])
    })
});

// Update Vehicle Specification Schema
export const updateVehicleSpecSchema = z.object({
    body: z.object({
        manufacturer: z.string().min(2, 'Manufacturer must be at least 2 characters').max(50, 'Manufacturer must be 50 characters or less').optional(),
        model: z.string().min(1, 'Model cannot be empty').max(50, 'Model must be 50 characters or less').optional(),
        year: z.number().int().min(1990, 'Year must be 1990 or later').max(new Date().getFullYear() + 1, 'Year cannot be in the future').optional(),
        fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
        engine_capacity: z.string().optional(),
        transmission: z.enum(['manual', 'automatic', 'cvt']).optional(),
        seating_capacity: z.number().int().min(1, 'Seating capacity must be at least 1').max(50, 'Seating capacity cannot exceed 50').optional(),
        color: z.string().optional(),
        features: z.string().optional(),
        vehicle_category: z.enum(['four_wheeler', 'two_wheeler']).optional()
    })
});

// Vehicle Specification Query Schema
export const vehicleSpecQuerySchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
        search: z.string().optional(),
        manufacturer: z.string().optional(),
        fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
        transmission: z.enum(['manual', 'automatic', 'cvt']).optional(),
        vehicle_category: z.enum(['four_wheeler', 'two_wheeler']).optional(),
        seating_capacity: z.string().optional(),
        year_from: z.string().optional(),
        year_to: z.string().optional(),
        min_year: z.string().optional(),
        max_year: z.string().optional(),
        min_seating: z.string().optional(),
        max_seating: z.string().optional(),
        sortBy: z.enum(['manufacturer', 'model', 'year', 'seating_capacity', 'created_at', 'updated_at']).optional().default('created_at'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
    })
});

// Bulk Create Vehicle Specifications Schema
export const bulkCreateVehicleSpecSchema = z.object({
    body: z.object({
        vehicleSpecs: z.array(z.object({
            manufacturer: z.string().min(2, 'Manufacturer must be at least 2 characters').max(50, 'Manufacturer must be 50 characters or less'),
            model: z.string().min(1, 'Model is required').max(50, 'Model must be 50 characters or less'),
            year: z.number().int().min(1990, 'Year must be 1990 or later'),
            fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
            engine_capacity: z.string().optional(),
            transmission: z.enum(['manual', 'automatic', 'cvt']),
            seating_capacity: z.number().int().min(1, 'Seating capacity must be at least 1'),
            color: z.string().optional(),
            features: z.string().optional(),
            vehicle_category: z.enum(['four_wheeler', 'two_wheeler'])
        })).min(1, 'At least one specification is required')
    })
});

// Export types
export type CreateVehicleSpecInput = z.infer<typeof createVehicleSpecSchema>['body'];
export type UpdateVehicleSpecInput = z.infer<typeof updateVehicleSpecSchema>['body'];
export type VehicleSpecQueryInput = z.infer<typeof vehicleSpecQuerySchema>['query'];
export type BulkCreateVehicleSpecInput = z.infer<typeof bulkCreateVehicleSpecSchema>['body'];