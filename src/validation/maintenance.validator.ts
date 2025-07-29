import { z } from 'zod';

// Maintenance statistics query schema
export const maintenanceStatisticsQuerySchema = z.object({
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

// Maintenance records query schema
export const maintenanceRecordsQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
        limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
        vehicle_id: z.string().uuid('Invalid vehicle ID').optional(),
        maintenance_type: z.enum(['routine', 'repair', 'inspection', 'cleaning', 'emergency']).optional(),
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

// Upcoming maintenance query schema
export const upcomingMaintenanceQuerySchema = z.object({
    query: z.object({
        days: z.string().regex(/^\d+$/, 'Days must be a positive integer').optional(),
    })
});
