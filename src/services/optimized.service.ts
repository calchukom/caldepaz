import { eq, and, desc, asc, sql, or, ilike, gte, lte, count } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { vehicleSpecifications, vehicles, bookings } from '../drizzle/schema';
import { logger } from '../middleware/logger';
import { AppError, ErrorFactory } from '../middleware/appError';

/**
 * OPTIMIZED: Get vehicle earnings with single query approach
 * Previous: 820ms → Expected: <100ms
 * Optimization: Single query with proper joins and indexes
 */
export const getVehicleEarningsOptimized = async (startDate?: string, endDate?: string) => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        // OPTIMIZED: Single query with CTE for better performance
        const result = await db.execute(sql`
            WITH earnings_summary AS (
                SELECT 
                    COALESCE(SUM(CAST(b.total_amount AS DECIMAL)), 0) as total_earnings,
                    COUNT(b.booking_id) as total_bookings
                FROM bookings b
                WHERE b.booking_status = 'completed'
                AND b.created_at >= ${start}
                AND b.created_at <= ${end}
            ),
            earnings_by_category AS (
                SELECT 
                    vs.vehicle_category,
                    COALESCE(SUM(CAST(b.total_amount AS DECIMAL)), 0) as earnings,
                    COUNT(b.booking_id) as bookings_count
                FROM bookings b
                INNER JOIN vehicles v ON b.vehicle_id = v.vehicle_id
                INNER JOIN vehicle_specifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
                WHERE b.booking_status = 'completed'
                AND b.created_at >= ${start}
                AND b.created_at <= ${end}
                GROUP BY vs.vehicle_category
            )
            SELECT 
                es.total_earnings,
                es.total_bookings,
                CASE 
                    WHEN es.total_bookings > 0 THEN es.total_earnings / es.total_bookings
                    ELSE 0 
                END as average_booking_value,
                json_agg(
                    json_build_object(
                        'category', ebc.vehicle_category,
                        'earnings', ebc.earnings,
                        'bookings_count', ebc.bookings_count,
                        'average_value', CASE 
                            WHEN ebc.bookings_count > 0 THEN ebc.earnings / ebc.bookings_count
                            ELSE 0 
                        END
                    )
                ) as categories
            FROM earnings_summary es
            CROSS JOIN earnings_by_category ebc
            GROUP BY es.total_earnings, es.total_bookings, es.total_bookings
        `);

        const data = result.rows?.[0] as any;

        return {
            period: {
                start_date: start.toISOString(),
                end_date: end.toISOString(),
            },
            summary: {
                total_earnings: Number(data.total_earnings || 0),
                total_bookings: Number(data.total_bookings || 0),
                average_booking_value: Number(data.average_booking_value || 0),
            },
            by_category: data.categories || [],
        };
    } catch (error) {
        logger.error('Error calculating vehicle earnings (optimized):', error);
        throw ErrorFactory.internal('Failed to calculate vehicle earnings');
    }
};

/**
 * OPTIMIZED: Get vehicle specifications with LEFT JOIN instead of subquery
 * Previous: 977ms → Expected: <100ms
 * Optimization: Remove subquery, use LEFT JOIN with GROUP BY
 */
export const getAllVehicleSpecsOptimized = async (query: any) => {
    try {
        const {
            page: pageStr,
            limit: limitStr,
            manufacturer,
            fuel_type,
            transmission,
            year_from,
            year_to,
            min_year,
            max_year,
            min_seating,
            max_seating,
            search,
            sortBy,
            sortOrder
        } = query;

        const page = parseInt(pageStr || '1');
        const limit = parseInt(limitStr || '10');
        const offset = (page - 1) * limit;

        let whereConditions: any[] = [];

        // Build where conditions (same as before but more efficient)
        if (manufacturer) {
            whereConditions.push(ilike(vehicleSpecifications.manufacturer, `%${manufacturer}%`));
        }
        if (fuel_type) {
            whereConditions.push(eq(vehicleSpecifications.fuel_type, fuel_type));
        }
        if (transmission) {
            whereConditions.push(eq(vehicleSpecifications.transmission, transmission));
        }
        if (year_from || min_year) {
            const yearFrom = parseInt(year_from || min_year || '0');
            if (yearFrom > 0) {
                whereConditions.push(gte(vehicleSpecifications.year, yearFrom));
            }
        }
        if (year_to || max_year) {
            const yearTo = parseInt(year_to || max_year || '0');
            if (yearTo > 0) {
                whereConditions.push(lte(vehicleSpecifications.year, yearTo));
            }
        }
        if (min_seating) {
            const minSeating = parseInt(min_seating);
            if (minSeating > 0) {
                whereConditions.push(gte(vehicleSpecifications.seating_capacity, minSeating));
            }
        }
        if (max_seating) {
            const maxSeating = parseInt(max_seating);
            if (maxSeating > 0) {
                whereConditions.push(lte(vehicleSpecifications.seating_capacity, maxSeating));
            }
        }

        // Search functionality with text indexes
        if (search) {
            const searchConditions = [
                ilike(vehicleSpecifications.manufacturer, `%${search}%`),
                ilike(vehicleSpecifications.model, `%${search}%`)
            ];
            if (search) {
                searchConditions.push(
                    sql`${vehicleSpecifications.color} ILIKE ${`%${search}%`}`
                );
            }
            whereConditions.push(or(...searchConditions));
        }

        // Build order by clause
        let orderBy;
        const isAsc = sortOrder === 'asc';

        switch (sortBy) {
            case 'manufacturer':
                orderBy = isAsc ? asc(vehicleSpecifications.manufacturer) : desc(vehicleSpecifications.manufacturer);
                break;
            case 'model':
                orderBy = isAsc ? asc(vehicleSpecifications.model) : desc(vehicleSpecifications.model);
                break;
            case 'year':
                orderBy = isAsc ? asc(vehicleSpecifications.year) : desc(vehicleSpecifications.year);
                break;
            case 'seating_capacity':
                orderBy = isAsc ? asc(vehicleSpecifications.seating_capacity) : desc(vehicleSpecifications.seating_capacity);
                break;
            default:
                orderBy = isAsc ? asc(vehicleSpecifications.created_at) : desc(vehicleSpecifications.created_at);
        }

        // OPTIMIZED: Use LEFT JOIN instead of subquery for vehicle count
        const result = await db
            .select({
                vehicleSpec_id: vehicleSpecifications.vehicleSpec_id,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
                fuel_type: vehicleSpecifications.fuel_type,
                engine_capacity: vehicleSpecifications.engine_capacity,
                transmission: vehicleSpecifications.transmission,
                seating_capacity: vehicleSpecifications.seating_capacity,
                color: vehicleSpecifications.color,
                features: vehicleSpecifications.features,
                created_at: vehicleSpecifications.created_at,
                updated_at: vehicleSpecifications.updated_at,
                vehicle_count: count(vehicles.vehicle_id),
            })
            .from(vehicleSpecifications)
            .leftJoin(vehicles as any, eq(vehicleSpecifications.vehicleSpec_id, vehicles.vehicleSpec_id))
            .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
            .groupBy(
                vehicleSpecifications.vehicleSpec_id,
                vehicleSpecifications.manufacturer,
                vehicleSpecifications.model,
                vehicleSpecifications.year,
                vehicleSpecifications.fuel_type,
                vehicleSpecifications.engine_capacity,
                vehicleSpecifications.transmission,
                vehicleSpecifications.seating_capacity,
                vehicleSpecifications.color,
                vehicleSpecifications.features,
                vehicleSpecifications.created_at,
                vehicleSpecifications.updated_at
            )
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        // OPTIMIZED: Get total count with same conditions but without joins
        const totalResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(vehicleSpecifications)
            .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

        const total = totalResult[0]?.count || 0;

        return {
            specifications: result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrevious: page > 1,
            },
        };
    } catch (error) {
        logger.error('Error retrieving vehicle specifications (optimized):', error);
        throw ErrorFactory.internal('Failed to retrieve vehicle specifications');
    }
};

/**
 * OPTIMIZED: Get user dashboard data with efficient joins
 * Previous: 502ms → Expected: <80ms
 * Optimization: Minimize joins, use indexed columns
 */
export const getUserDashboardDataOptimized = async (userId: string) => {
    try {
        // OPTIMIZED: Single query with CTE for user dashboard data
        const result = await db.execute(sql`
            WITH user_stats AS (
                SELECT 
                    COUNT(CASE WHEN booking_status = 'active' THEN 1 END) as active_bookings,
                    COUNT(CASE WHEN booking_status = 'completed' THEN 1 END) as completed_bookings,
                    COUNT(CASE WHEN booking_status = 'pending' THEN 1 END) as pending_bookings,
                    COALESCE(SUM(CASE WHEN booking_status = 'completed' THEN CAST(total_amount AS DECIMAL) END), 0) as total_spent
                FROM bookings 
                WHERE user_id = ${userId}
            ),
            recent_bookings AS (
                SELECT 
                    b.booking_id,
                    b.booking_status,
                    b.start_date,
                    b.end_date,
                    b.total_amount,
                    v.vehicle_id,
                    vs.manufacturer,
                    vs.model,
                    vs.year
                FROM bookings b
                INNER JOIN vehicles v ON b.vehicle_id = v.vehicle_id
                INNER JOIN vehicle_specifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
                WHERE b.user_id = ${userId}
                ORDER BY b.created_at DESC
                LIMIT 5
            )
            SELECT 
                us.active_bookings,
                us.completed_bookings,
                us.pending_bookings,
                us.total_spent,
                json_agg(
                    json_build_object(
                        'booking_id', rb.booking_id,
                        'status', rb.booking_status,
                        'start_date', rb.start_date,
                        'end_date', rb.end_date,
                        'total_amount', rb.total_amount,
                        'vehicle', json_build_object(
                            'id', rb.vehicle_id,
                            'manufacturer', rb.manufacturer,
                            'model', rb.model,
                            'year', rb.year
                        )
                    )
                ) as recent_bookings
            FROM user_stats us
            CROSS JOIN recent_bookings rb
            GROUP BY us.active_bookings, us.completed_bookings, us.pending_bookings, us.total_spent
        `);

        return result.rows?.[0];
    } catch (error) {
        logger.error('Error getting user dashboard data (optimized):', error);
        throw ErrorFactory.internal('Failed to get user dashboard data');
    }
};
