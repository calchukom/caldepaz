import { z } from 'zod';

// Base vehicle fields validation
export const vehicleBaseSchema = z.object({
    vehicleSpec_id: z.string().uuid('Invalid vehicle specification ID'),
    location_id: z.string().uuid('Invalid location ID').optional(),
    rental_rate: z.union([
        z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid rental rate format'),
        z.number().positive('Rental rate must be positive')
    ]),
    availability: z.boolean().optional().default(true),
    status: z.enum(['available', 'rented', 'maintenance', 'out_of_service', 'reserved']).optional().default('available'),
    license_plate: z.string().trim().min(1, 'License plate is required').max(20, 'License plate too long').optional(),
    mileage: z.number().int().min(0, 'Mileage cannot be negative').optional(),
    fuel_level: z.number().min(0, 'Fuel level cannot be negative').max(100, 'Fuel level cannot exceed 100').optional(),
    last_service_date: z.coerce.date().optional(),
    next_service_due: z.coerce.date().optional(),
    last_cleaned: z.coerce.date().optional(),
    insurance_expiry: z.coerce.date().optional(),
    registration_expiry: z.coerce.date().optional(),
    acquisition_date: z.coerce.date().optional(),
    acquisition_cost: z.union([
        z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid acquisition cost format'),
        z.number().positive('Acquisition cost must be positive')
    ]).optional(),
    depreciation_rate: z.union([
        z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid depreciation rate format'),
        z.number().min(0, 'Depreciation rate cannot be negative').max(100, 'Depreciation rate cannot exceed 100')
    ]).optional(),
    condition_rating: z.number().int().min(1, 'Condition rating must be at least 1').max(10, 'Condition rating cannot exceed 10').optional(),
    gps_tracking_id: z.string().trim().optional(),
    is_damaged: z.boolean().optional().default(false),
    damage_description: z.string().trim().optional(),
    images: z.array(z.string().url('Invalid image URL')).optional(),
    notes: z.string().trim().optional()
});

// Create vehicle schema
export const createVehicleSchema = z.object({
    body: vehicleBaseSchema.refine(data => {
        if (data.is_damaged && !data.damage_description) {
            return false;
        }
        return true;
    }, {
        message: 'Damage description is required when vehicle is marked as damaged',
        path: ['damage_description']
    })
});

// Update vehicle schema - all fields optional except id validation
export const updateVehicleSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: vehicleBaseSchema.partial().refine(data => {
        if (data.is_damaged && !data.damage_description) {
            return false;
        }
        return true;
    }, {
        message: 'Damage description is required when vehicle is marked as damaged',
        path: ['damage_description']
    })
});

// Vehicle query/filter schema
export const vehicleQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).optional().default(1),
        limit: z.coerce.number().int().min(1).max(100).optional().default(10),
        search: z.string().trim().optional(),
        manufacturer: z.string().trim().optional(),
        model: z.string().trim().optional(),
        fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
        transmission: z.enum(['manual', 'automatic', 'cvt']).optional(),
        vehicle_category: z.enum(['four_wheeler', 'two_wheeler']).optional(),
        min_rate: z.coerce.number().positive().optional(),
        max_rate: z.coerce.number().positive().optional(),
        availability: z.coerce.boolean().optional(),
        year_from: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
        year_to: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
        seating_capacity: z.coerce.number().int().min(1).optional(),
        available_only: z.coerce.boolean().optional(),
        location_id: z.string().uuid().optional(),
        sortBy: z.enum(['rental_rate', 'created_at', 'updated_at', 'license_plate', 'manufacturer', 'model', 'year', 'availability']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
    }).refine(data => {
        if (data.min_rate && data.max_rate && data.min_rate > data.max_rate) {
            return false;
        }
        if (data.year_from && data.year_to && data.year_from > data.year_to) {
            return false;
        }
        return true;
    }, {
        message: 'Invalid range: min value cannot be greater than max value'
    })
});

// Vehicle availability check schema
export const vehicleAvailabilitySchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    query: z.object({
        start_date: z.coerce.date(),
        end_date: z.coerce.date()
    }).refine(data => data.start_date < data.end_date, {
        message: 'End date must be after start date',
        path: ['end_date']
    })
});

// Batch vehicle import schema
export const batchVehicleSchema = z.object({
    body: z.object({
        vehicles: z.array(vehicleBaseSchema).min(1, 'At least one vehicle is required').max(100, 'Cannot import more than 100 vehicles at once')
    })
});

// Vehicle status update schema
export const vehicleStatusUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: z.object({
        status: z.enum(['available', 'rented', 'maintenance', 'out_of_service', 'reserved'], {
            required_error: 'Status is required',
            invalid_type_error: 'Invalid status value'
        })
    })
});

// Vehicle availability update schema
export const vehicleAvailabilityUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: z.object({
        availability: z.boolean({
            required_error: 'Availability is required',
            invalid_type_error: 'Availability must be a boolean value'
        })
    })
});

// Maintenance record schema
export const maintenanceRecordSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: z.object({
        maintenance_type: z.enum(['routine', 'repair', 'inspection', 'cleaning', 'emergency']).optional().default('routine'),
        maintenance_date: z.coerce.date(),
        description: z.string().trim().min(1, 'Description is required').max(1000, 'Description too long'),
        cost: z.union([
            z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format'),
            z.number().positive('Cost must be positive')
        ]),
        service_provider: z.string().trim().max(200, 'Service provider name too long').optional(),
        technician_name: z.string().trim().max(200, 'Technician name too long').optional(),
        parts_replaced: z.string().trim().max(1000, 'Parts description too long').optional(),
        mileage_at_service: z.number().int().min(0, 'Mileage cannot be negative').optional(),
        next_service_mileage: z.number().int().min(0, 'Next service mileage cannot be negative').optional(),
        completion_status: z.string().trim().max(100, 'Completion status too long').optional(),
        warranty_info: z.string().trim().max(500, 'Warranty info too long').optional(),
        attachments: z.array(z.string().url('Invalid attachment URL')).optional(),
        notes: z.string().trim().max(1000, 'Notes too long').optional()
    }).refine(data => {
        if (data.mileage_at_service && data.next_service_mileage && data.mileage_at_service >= data.next_service_mileage) {
            return false;
        }
        return true;
    }, {
        message: 'Next service mileage must be greater than current mileage',
        path: ['next_service_mileage']
    })
});

// Vehicle condition update schema
export const vehicleConditionUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: z.object({
        condition_rating: z.number().int().min(1, 'Condition rating must be at least 1').max(10, 'Condition rating cannot exceed 10'),
        is_damaged: z.boolean().optional().default(false),
        damage_description: z.string().trim().optional()
    }).refine(data => {
        if (data.is_damaged && !data.damage_description) {
            return false;
        }
        return true;
    }, {
        message: 'Damage description is required when vehicle is marked as damaged',
        path: ['damage_description']
    })
});

// Vehicle fuel level update schema
export const vehicleFuelUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: z.object({
        fuel_level: z.number().min(0, 'Fuel level cannot be negative').max(100, 'Fuel level cannot exceed 100')
    })
});

// Vehicle mileage update schema
export const vehicleMileageUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid vehicle ID')
    }),
    body: z.object({
        mileage: z.number().int().min(0, 'Mileage cannot be negative')
    })
});

// Available vehicles query schema
export const availableVehiclesQuerySchema = z.object({
    query: z.object({
        start_date: z.coerce.date(),
        end_date: z.coerce.date(),
        location_id: z.string().uuid('Invalid location ID').optional(),
        page: z.coerce.number().int().min(1).optional().default(1),
        limit: z.coerce.number().int().min(1).max(100).optional().default(10),
        // Include all filter options from vehicleQuerySchema
        search: z.string().trim().optional(),
        manufacturer: z.string().trim().optional(),
        model: z.string().trim().optional(),
        fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
        transmission: z.enum(['manual', 'automatic', 'cvt']).optional(),
        vehicle_category: z.enum(['four_wheeler', 'two_wheeler']).optional(),
        min_rate: z.coerce.number().positive().optional(),
        max_rate: z.coerce.number().positive().optional(),
        year_from: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
        year_to: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
        seating_capacity: z.coerce.number().int().min(1).optional(),
        sortBy: z.enum(['rental_rate', 'created_at', 'updated_at', 'license_plate', 'manufacturer', 'model', 'year']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
    }).refine(data => {
        if (data.start_date >= data.end_date) {
            return false;
        }
        if (data.min_rate && data.max_rate && data.min_rate > data.max_rate) {
            return false;
        }
        if (data.year_from && data.year_to && data.year_from > data.year_to) {
            return false;
        }
        return true;
    }, {
        message: 'Invalid date range or filter values'
    })
});

// Vehicle earnings query schema
export const vehicleEarningsQuerySchema = z.object({
    query: z.object({
        start_date: z.string().datetime('Invalid start date format').optional(),
        end_date: z.string().datetime('Invalid end date format').optional(),
    }).refine(data => {
        if (data.start_date && data.end_date) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            return start <= end;
        }
        return true;
    }, {
        message: 'Start date must be before or equal to end date'
    })
});
