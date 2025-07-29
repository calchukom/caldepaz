import { eq, and, gte, lte, desc, count, sql, asc, or, ilike } from 'drizzle-orm';
import db from '../drizzle/db';
import {
    maintenanceRecords,
    vehicles,
    vehicleSpecifications,
    type MaintenanceRecord,
    type NewMaintenanceRecord,
    type MaintenanceType,
    type MaintenanceStatus,
} from '../drizzle/schema';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';

// =======================
// TYPES & INTERFACES
// =======================
export interface MaintenanceFilters {
    page?: number;
    limit?: number;
    vehicle_id?: string;
    maintenance_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    date_from?: string;
    date_to?: string;
    cost_min?: number;
    cost_max?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface MaintenanceStatistics {
    period: {
        start_date: string;
        end_date: string;
    };
    summary: {
        total_records: number;
        total_cost: number;
        average_cost: number;
        by_type: Array<{
            maintenance_type: string;
            count: number;
            total_cost: number;
            average_cost: number;
        }>;
        by_month: Array<{
            month: string;
            count: number;
            total_cost: number;
        }>;
    };
    cost_trends: {
        highest_cost_record: any;
        most_expensive_vehicle: any;
    };
}

// =======================
// SERVICE FUNCTIONS
// =======================

export const getMaintenanceStatistics = async (startDate?: string, endDate?: string, vehicleId?: string): Promise<MaintenanceStatistics> => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
        const end = endDate ? new Date(endDate) : new Date();

        // Get overall statistics
        const overallStats = await db
            .select({
                total_records: count(maintenanceRecords.maintenance_id),
                total_cost: sql<number>`COALESCE(SUM(CAST(${maintenanceRecords.cost} AS DECIMAL)), 0)`,
            })
            .from(maintenanceRecords)
            .where(
                and(
                    gte(maintenanceRecords.maintenance_date, start),
                    lte(maintenanceRecords.maintenance_date, end)
                )
            );

        // Get statistics by maintenance type
        const statsByType = await db
            .select({
                maintenance_type: maintenanceRecords.maintenance_type,
                count: count(maintenanceRecords.maintenance_id),
                total_cost: sql<number>`COALESCE(SUM(CAST(${maintenanceRecords.cost} AS DECIMAL)), 0)`,
            })
            .from(maintenanceRecords)
            .where(
                and(
                    gte(maintenanceRecords.maintenance_date, start),
                    lte(maintenanceRecords.maintenance_date, end)
                )
            )
            .groupBy(maintenanceRecords.maintenance_type);

        // Get monthly trends
        const monthlyStats = await db
            .select({
                month: sql<string>`TO_CHAR(${maintenanceRecords.maintenance_date}, 'YYYY-MM')`,
                count: count(maintenanceRecords.maintenance_id),
                total_cost: sql<number>`COALESCE(SUM(CAST(${maintenanceRecords.cost} AS DECIMAL)), 0)`,
            })
            .from(maintenanceRecords)
            .where(
                and(
                    gte(maintenanceRecords.maintenance_date, start),
                    lte(maintenanceRecords.maintenance_date, end)
                )
            )
            .groupBy(sql`TO_CHAR(${maintenanceRecords.maintenance_date}, 'YYYY-MM')`)
            .orderBy(sql`TO_CHAR(${maintenanceRecords.maintenance_date}, 'YYYY-MM')`);

        // Get highest cost record
        const highestCostRecord = await db
            .select({
                maintenance_id: maintenanceRecords.maintenance_id,
                vehicle_id: maintenanceRecords.vehicle_id,
                maintenance_type: maintenanceRecords.maintenance_type,
                cost: maintenanceRecords.cost,
                maintenance_date: maintenanceRecords.maintenance_date,
                description: maintenanceRecords.description,
            })
            .from(maintenanceRecords)
            .where(
                and(
                    gte(maintenanceRecords.maintenance_date, start),
                    lte(maintenanceRecords.maintenance_date, end)
                )
            )
            .orderBy(desc(sql`CAST(${maintenanceRecords.cost} AS DECIMAL)`))
            .limit(1);

        // Get most expensive vehicle (by total maintenance cost)
        const mostExpensiveVehicle = await db
            .select({
                vehicle_id: maintenanceRecords.vehicle_id,
                total_cost: sql<number>`SUM(CAST(${maintenanceRecords.cost} AS DECIMAL))`,
                maintenance_count: count(maintenanceRecords.maintenance_id),
            })
            .from(maintenanceRecords)
            .where(
                and(
                    gte(maintenanceRecords.maintenance_date, start),
                    lte(maintenanceRecords.maintenance_date, end)
                )
            )
            .groupBy(maintenanceRecords.vehicle_id)
            .orderBy(desc(sql`SUM(CAST(${maintenanceRecords.cost} AS DECIMAL))`))
            .limit(1);

        const totalRecords = overallStats[0]?.total_records || 0;
        const totalCost = Number(overallStats[0]?.total_cost || 0);

        return {
            period: {
                start_date: start.toISOString(),
                end_date: end.toISOString(),
            },
            summary: {
                total_records: totalRecords,
                total_cost: totalCost,
                average_cost: totalRecords > 0 ? totalCost / totalRecords : 0,
                by_type: statsByType.map((item: any) => ({
                    maintenance_type: item.maintenance_type,
                    count: item.count,
                    total_cost: Number(item.total_cost),
                    average_cost: item.count > 0 ? Number(item.total_cost) / item.count : 0,
                })),
                by_month: monthlyStats.map((item: any) => ({
                    month: item.month,
                    count: item.count,
                    total_cost: Number(item.total_cost),
                })),
            },
            cost_trends: {
                highest_cost_record: highestCostRecord[0] || null,
                most_expensive_vehicle: mostExpensiveVehicle[0] || null,
            },
        };
    } catch (error) {
        logger.error('Error getting maintenance statistics:', error);
        throw ErrorFactory.internal('Failed to get maintenance statistics');
    }
};

// Get maintenance status counts for dashboard
export const getMaintenanceStatusCounts = async (startDate?: string, endDate?: string, vehicleId?: string) => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
        const end = endDate ? new Date(endDate) : new Date();

        const whereConditions = [
            gte(maintenanceRecords.maintenance_date, start),
            lte(maintenanceRecords.maintenance_date, end)
        ];

        if (vehicleId) {
            whereConditions.push(eq(maintenanceRecords.vehicle_id, vehicleId));
        }

        // Get status counts
        const statusCounts = await db
            .select({
                status: maintenanceRecords.status,
                count: count(maintenanceRecords.maintenance_id),
            })
            .from(maintenanceRecords)
            .where(and(...whereConditions))
            .groupBy(maintenanceRecords.status);

        // Convert to flat object
        const result = {
            completed_count: 0,
            pending_count: 0,
            in_progress_count: 0,
            overdue_count: 0,
            scheduled_count: 0,
            cancelled_count: 0,
        };

        statusCounts.forEach((item: any) => {
            switch (item.status) {
                case 'completed':
                    result.completed_count = item.count;
                    break;
                case 'scheduled':
                    result.pending_count = item.count; // Map scheduled to pending for frontend
                    result.scheduled_count = item.count;
                    break;
                case 'in_progress':
                    result.in_progress_count = item.count;
                    break;
                case 'cancelled':
                    result.cancelled_count = item.count;
                    break;
                // Note: overdue_count will be calculated separately based on scheduled_date vs current date
            }
        });

        // Calculate overdue count for scheduled maintenance that's past due
        const overdueResult = await db
            .select({
                count: count(maintenanceRecords.maintenance_id),
            })
            .from(maintenanceRecords)
            .where(
                and(
                    ...whereConditions,
                    eq(maintenanceRecords.status, 'scheduled'),
                    lte(maintenanceRecords.scheduled_date, new Date())
                )
            );

        result.overdue_count = overdueResult[0]?.count || 0;

        return result;
    } catch (error) {
        logger.error('Error getting maintenance status counts:', error);
        throw ErrorFactory.internal('Failed to get maintenance status counts');
    }
};

export const getAllMaintenanceRecords = async (filters: MaintenanceFilters) => {
    try {
        const {
            page = 1,
            limit = 10,
            vehicle_id,
            maintenance_type,
            status,
            start_date,
            end_date,
            date_from,
            date_to,
            cost_min,
            cost_max,
            sortBy = 'maintenance_date',
            sortOrder = 'desc'
        } = filters;

        const offset = (page - 1) * limit;
        const orderDirection = sortOrder === 'asc' ? asc : desc;

        // Build where conditions
        const conditions = [];
        if (vehicle_id) {
            conditions.push(eq(maintenanceRecords.vehicle_id, vehicle_id));
        }
        if (maintenance_type) {
            conditions.push(eq(maintenanceRecords.maintenance_type, maintenance_type as any));
        }
        if (status) {
            conditions.push(eq(maintenanceRecords.status, status as any));
        }
        if (start_date || date_from) {
            const dateFrom = start_date || date_from;
            if (dateFrom) {
                conditions.push(gte(maintenanceRecords.maintenance_date, new Date(dateFrom)));
            }
        }
        if (end_date || date_to) {
            const dateTo = end_date || date_to;
            if (dateTo) {
                conditions.push(lte(maintenanceRecords.maintenance_date, new Date(dateTo)));
            }
        }
        if (cost_min !== undefined) {
            conditions.push(gte(maintenanceRecords.cost, cost_min.toString()));
        }
        if (cost_max !== undefined) {
            conditions.push(lte(maintenanceRecords.cost, cost_max.toString()));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const totalResult = await db
            .select({ count: count(maintenanceRecords.maintenance_id) })
            .from(maintenanceRecords)
            .where(whereClause);

        const total = totalResult[0]?.count || 0;

        // Get records with vehicle details
        const records = await db
            .select({
                maintenance_id: maintenanceRecords.maintenance_id,
                vehicle_id: maintenanceRecords.vehicle_id,
                maintenance_type: maintenanceRecords.maintenance_type,
                title: maintenanceRecords.title,
                description: maintenanceRecords.description,
                cost: maintenanceRecords.cost,
                maintenance_date: maintenanceRecords.maintenance_date,
                next_maintenance_date: maintenanceRecords.next_maintenance_date,
                scheduled_date: maintenanceRecords.scheduled_date,
                completed_date: maintenanceRecords.completed_date,
                status: maintenanceRecords.status,
                service_provider: maintenanceRecords.service_provider,
                technician_name: maintenanceRecords.technician_name,
                location: maintenanceRecords.location,
                odometer: maintenanceRecords.odometer,
                mileage_at_service: maintenanceRecords.mileage_at_service,
                next_service_mileage: maintenanceRecords.next_service_mileage,
                parts_replaced: maintenanceRecords.parts_replaced,
                labor_hours: maintenanceRecords.labor_hours,
                warranty_end_date: maintenanceRecords.warranty_end_date,
                warranty_info: maintenanceRecords.warranty_info,
                completion_status: maintenanceRecords.completion_status,
                notes: maintenanceRecords.notes,
                attachments: maintenanceRecords.attachments,
                performed_by: maintenanceRecords.performed_by,
                created_at: maintenanceRecords.created_at,
                updated_at: maintenanceRecords.updated_at,
                // Vehicle details
                license_plate: vehicles.license_plate,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
            })
            .from(maintenanceRecords)
            .leftJoin(vehicles as any, eq(maintenanceRecords.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(whereClause)
            .orderBy(orderDirection(maintenanceRecords.maintenance_date))
            .limit(limit)
            .offset(offset);

        return {
            records,
            total,
            pagination: {
                current_page: page,
                per_page: limit,
                total_records: total,
                total_pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Error getting maintenance records:', error);
        throw ErrorFactory.internal('Failed to get maintenance records');
    }
};

export const getUpcomingMaintenance = async (daysAhead: number = 30) => {
    try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const upcomingMaintenance = await db
            .select({
                vehicle_id: vehicles.vehicle_id,
                license_plate: vehicles.license_plate,
                next_service_due: vehicles.next_service_due,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
                current_mileage: vehicles.mileage,
                last_service_date: vehicles.last_service_date,
            })
            .from(vehicles)
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(
                and(
                    lte(vehicles.next_service_due, futureDate),
                    gte(vehicles.next_service_due, new Date())
                )
            )
            .orderBy(asc(vehicles.next_service_due));

        return {
            upcoming_maintenance: upcomingMaintenance,
            days_ahead: daysAhead,
            count: upcomingMaintenance.length,
        };
    } catch (error) {
        logger.error('Error getting upcoming maintenance:', error);
        throw ErrorFactory.internal('Failed to get upcoming maintenance');
    }
};

export const getOverdueMaintenance = async () => {
    try {
        const now = new Date();

        const overdueMaintenance = await db
            .select({
                vehicle_id: vehicles.vehicle_id,
                license_plate: vehicles.license_plate,
                next_service_due: vehicles.next_service_due,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
                current_mileage: vehicles.mileage,
                last_service_date: vehicles.last_service_date,
                days_overdue: sql<number>`EXTRACT(DAYS FROM AGE(NOW(), ${vehicles.next_service_due}))`,
            })
            .from(vehicles)
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(
                and(
                    lte(vehicles.next_service_due, now),
                    sql`${vehicles.next_service_due} IS NOT NULL`
                )
            )
            .orderBy(asc(vehicles.next_service_due));

        return {
            overdue_maintenance: overdueMaintenance,
            count: overdueMaintenance.length,
        };
    } catch (error) {
        logger.error('Error getting overdue maintenance:', error);
        throw ErrorFactory.internal('Failed to get overdue maintenance');
    }
};

// =======================
// VEHICLE-SPECIFIC MAINTENANCE FUNCTIONS
// =======================

export const getVehicleMaintenanceRecords = async (vehicleId: string, filters: any) => {
    try {
        const { page = 1, limit = 20, maintenance_type, status, date_from, date_to, cost_min, cost_max, sortBy = 'created_at', sortOrder = 'desc' } = filters;

        const offset = (page - 1) * limit;
        const orderDirection = sortOrder === 'asc' ? asc : desc;

        // Build where conditions
        const whereConditions = [eq(maintenanceRecords.vehicle_id, vehicleId)];

        if (maintenance_type) {
            whereConditions.push(eq(maintenanceRecords.maintenance_type, maintenance_type));
        }
        if (status) {
            whereConditions.push(eq(maintenanceRecords.status, status));
        }
        if (date_from) {
            whereConditions.push(gte(maintenanceRecords.maintenance_date, new Date(date_from)));
        }
        if (date_to) {
            whereConditions.push(lte(maintenanceRecords.maintenance_date, new Date(date_to)));
        }
        if (cost_min !== undefined) {
            whereConditions.push(gte(maintenanceRecords.cost, cost_min.toString()));
        }
        if (cost_max !== undefined) {
            whereConditions.push(lte(maintenanceRecords.cost, cost_max.toString()));
        }

        // Get total count
        const totalResult = await db
            .select({ count: count() })
            .from(maintenanceRecords)
            .where(and(...whereConditions));

        const total = totalResult[0]?.count || 0;

        // Get records with pagination
        const records = await db
            .select({
                maintenance_id: maintenanceRecords.maintenance_id,
                vehicle_id: maintenanceRecords.vehicle_id,
                maintenance_type: maintenanceRecords.maintenance_type,
                title: maintenanceRecords.title,
                description: maintenanceRecords.description,
                cost: maintenanceRecords.cost,
                maintenance_date: maintenanceRecords.maintenance_date,
                next_maintenance_date: maintenanceRecords.next_maintenance_date,
                scheduled_date: maintenanceRecords.scheduled_date,
                completed_date: maintenanceRecords.completed_date,
                status: maintenanceRecords.status,
                service_provider: maintenanceRecords.service_provider,
                technician_name: maintenanceRecords.technician_name,
                location: maintenanceRecords.location,
                odometer: maintenanceRecords.odometer,
                mileage_at_service: maintenanceRecords.mileage_at_service,
                next_service_mileage: maintenanceRecords.next_service_mileage,
                parts_replaced: maintenanceRecords.parts_replaced,
                labor_hours: maintenanceRecords.labor_hours,
                warranty_end_date: maintenanceRecords.warranty_end_date,
                warranty_info: maintenanceRecords.warranty_info,
                completion_status: maintenanceRecords.completion_status,
                notes: maintenanceRecords.notes,
                attachments: maintenanceRecords.attachments,
                performed_by: maintenanceRecords.performed_by,
                created_at: maintenanceRecords.created_at,
                updated_at: maintenanceRecords.updated_at,
                // Vehicle details
                license_plate: vehicles.license_plate,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
            })
            .from(maintenanceRecords)
            .leftJoin(vehicles as any, eq(maintenanceRecords.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(and(...whereConditions))
            .orderBy(orderDirection(maintenanceRecords.created_at))
            .limit(limit)
            .offset(offset);

        return {
            records,
            total
        };
    } catch (error) {
        logger.error('Error getting vehicle maintenance records:', error);
        throw ErrorFactory.internal('Failed to get vehicle maintenance records');
    }
};

export const createMaintenanceRecord = async (data: NewMaintenanceRecord): Promise<MaintenanceRecord> => {
    try {
        const [record] = await db
            .insert(maintenanceRecords)
            .values({
                ...data,
                title: data.title || 'Maintenance Service',
                scheduled_date: data.scheduled_date || new Date(),
            })
            .returning();

        return record;
    } catch (error) {
        logger.error('Error creating maintenance record:', error);
        throw ErrorFactory.internal('Failed to create maintenance record');
    }
};

export const updateMaintenanceRecord = async (maintenanceId: string, data: Partial<NewMaintenanceRecord>): Promise<MaintenanceRecord> => {
    try {
        const [record] = await db
            .update(maintenanceRecords)
            .set({
                ...data,
                updated_at: new Date(),
            })
            .where(eq(maintenanceRecords.maintenance_id, maintenanceId))
            .returning();

        if (!record) {
            throw ErrorFactory.notFound('Maintenance record not found');
        }

        return record;
    } catch (error) {
        logger.error('Error updating maintenance record:', error);
        throw ErrorFactory.internal('Failed to update maintenance record');
    }
};

export const deleteMaintenanceRecord = async (maintenanceId: string): Promise<void> => {
    try {
        const result = await db
            .delete(maintenanceRecords)
            .where(eq(maintenanceRecords.maintenance_id, maintenanceId))
            .returning();

        if (result.length === 0) {
            throw ErrorFactory.notFound('Maintenance record not found');
        }
    } catch (error) {
        logger.error('Error deleting maintenance record:', error);
        throw ErrorFactory.internal('Failed to delete maintenance record');
    }
};

export const getMaintenanceRecordById = async (maintenanceId: string): Promise<MaintenanceRecord | null> => {
    try {
        const [record] = await db
            .select({
                maintenance_id: maintenanceRecords.maintenance_id,
                vehicle_id: maintenanceRecords.vehicle_id,
                maintenance_type: maintenanceRecords.maintenance_type,
                title: maintenanceRecords.title,
                description: maintenanceRecords.description,
                cost: maintenanceRecords.cost,
                maintenance_date: maintenanceRecords.maintenance_date,
                next_maintenance_date: maintenanceRecords.next_maintenance_date,
                scheduled_date: maintenanceRecords.scheduled_date,
                completed_date: maintenanceRecords.completed_date,
                status: maintenanceRecords.status,
                service_provider: maintenanceRecords.service_provider,
                technician_name: maintenanceRecords.technician_name,
                location: maintenanceRecords.location,
                odometer: maintenanceRecords.odometer,
                mileage_at_service: maintenanceRecords.mileage_at_service,
                next_service_mileage: maintenanceRecords.next_service_mileage,
                parts_replaced: maintenanceRecords.parts_replaced,
                labor_hours: maintenanceRecords.labor_hours,
                warranty_end_date: maintenanceRecords.warranty_end_date,
                warranty_info: maintenanceRecords.warranty_info,
                completion_status: maintenanceRecords.completion_status,
                notes: maintenanceRecords.notes,
                attachments: maintenanceRecords.attachments,
                performed_by: maintenanceRecords.performed_by,
                created_at: maintenanceRecords.created_at,
                updated_at: maintenanceRecords.updated_at,
                // Vehicle details
                license_plate: vehicles.license_plate,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
            })
            .from(maintenanceRecords)
            .leftJoin(vehicles as any, eq(maintenanceRecords.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(eq(maintenanceRecords.maintenance_id, maintenanceId));

        return record || null;
    } catch (error) {
        logger.error('Error getting maintenance record by ID:', error);
        throw ErrorFactory.internal('Failed to get maintenance record');
    }
};
