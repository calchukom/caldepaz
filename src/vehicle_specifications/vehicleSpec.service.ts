import { eq, and, desc, asc, sql, or, ilike, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { vehicleSpecifications, vehicles, bookings } from '../drizzle/schema';
import { logger } from '../middleware/logger';
import { AppError, ErrorFactory } from '../middleware/appError';
import {
    CreateVehicleSpecInput,
    UpdateVehicleSpecInput,
    VehicleSpecQueryInput
} from '../validation/vehicleSpec.validator';

export class VehicleSpecService {

    /**
     * Create a new vehicle specification
     */
    async createVehicleSpec(data: CreateVehicleSpecInput) {
        try {
            const {
                manufacturer,
                model,
                year,
                fuel_type,
                engine_capacity,
                transmission,
                seating_capacity,
                color,
                features
            } = data;

            // Check if specification already exists (without color check to avoid null issues)
            const existingSpec = await db
                .select()
                .from(vehicleSpecifications)
                .where(
                    and(
                        eq(vehicleSpecifications.manufacturer, manufacturer),
                        eq(vehicleSpecifications.model, model),
                        eq(vehicleSpecifications.year, year),
                        eq(vehicleSpecifications.transmission, transmission)
                    )
                )
                .limit(1);

            if (existingSpec.length > 0) {
                throw ErrorFactory.conflict('Vehicle specification with these details already exists');
            }

            // Create vehicle specification
            const [newSpec] = await db
                .insert(vehicleSpecifications)
                .values({
                    manufacturer,
                    model,
                    year,
                    fuel_type,
                    engine_capacity: engine_capacity || null,
                    transmission,
                    seating_capacity,
                    color: color || null,
                    features: features || null,
                    vehicle_category: data.vehicle_category,
                    created_at: new Date(),
                    updated_at: new Date(),
                })
                .returning();

            logger.info('Vehicle specification created successfully', {
                module: 'vehicle_specifications',
                vehicleSpec_id: newSpec.vehicleSpec_id,
                manufacturer,
                model,
                year,
            });

            return newSpec;
        } catch (error) {
            logger.error('Error creating vehicle specification', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to create vehicle specification');
        }
    }

    /**
     * Get all vehicle specifications with filters and pagination
     */
    async getAllVehicleSpecs(query: VehicleSpecQueryInput) {
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

            // Convert string parameters to numbers
            const page = parseInt(pageStr || '1');
            const limit = parseInt(limitStr || '10');

            const offset = (page - 1) * limit;

            let whereConditions: any[] = [];

            // Filter by manufacturer
            if (manufacturer) {
                whereConditions.push(ilike(vehicleSpecifications.manufacturer, `%${manufacturer}%`));
            }

            // Filter by fuel type
            if (fuel_type) {
                whereConditions.push(eq(vehicleSpecifications.fuel_type, fuel_type));
            }

            // Filter by transmission
            if (transmission) {
                whereConditions.push(eq(vehicleSpecifications.transmission, transmission));
            }

            // Filter by year range
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

            // Filter by seating capacity range
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

            // Search functionality
            if (search) {
                const searchConditions = [
                    ilike(vehicleSpecifications.manufacturer, `%${search}%`),
                    ilike(vehicleSpecifications.model, `%${search}%`)
                ];

                // Only add color search if color is not null
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

            // Execute query with vehicle count
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
                    // Count of vehicles using this specification
                    vehicle_count: sql<number>`(
                        SELECT COUNT(*) 
                        FROM ${vehicles} 
                        WHERE ${vehicles.vehicleSpec_id} = ${vehicleSpecifications.vehicleSpec_id}
                    )`,
                })
                .from(vehicleSpecifications)
                .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset);

            // Get total count
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
            logger.error('Error retrieving vehicle specifications', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
                query,
            });
            throw ErrorFactory.internal('Failed to retrieve vehicle specifications');
        }
    }

    /**
     * Get vehicle specification by ID
     */
    async getVehicleSpecById(vehicleSpecId: string) {
        try {
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
                    // Count of vehicles using this specification
                    vehicle_count: sql<number>`(
                        SELECT COUNT(*) 
                        FROM ${vehicles} 
                        WHERE ${vehicles.vehicleSpec_id} = ${vehicleSpecifications.vehicleSpec_id}
                    )`,
                    // Recent bookings for vehicles with this spec
                    recent_bookings_count: sql<number>`(
                        SELECT COUNT(*) 
                        FROM ${bookings} b
                        INNER JOIN ${vehicles} v ON b.vehicle_id = v.vehicle_id
                        WHERE v.vehicleSpec_id = ${vehicleSpecifications.vehicleSpec_id}
                        AND b.created_at >= NOW() - INTERVAL '30 days'
                    )`,
                })
                .from(vehicleSpecifications)
                .where(eq(vehicleSpecifications.vehicleSpec_id, vehicleSpecId))
                .limit(1);

            if (!result.length) {
                throw ErrorFactory.notFound('Vehicle specification not found');
            }

            // Get vehicles using this specification
            const vehiclesWithSpec = await db
                .select({
                    vehicle_id: vehicles.vehicle_id,
                    license_plate: vehicles.license_plate,
                    rental_rate: vehicles.rental_rate,
                    availability: vehicles.availability,
                    status: vehicles.status,
                    location_id: vehicles.location_id,
                })
                .from(vehicles)
                .where(eq(vehicles.vehicleSpec_id, vehicleSpecId))
                .limit(10); // Limit to 10 vehicles for performance

            return {
                ...result[0],
                vehicles: vehiclesWithSpec,
            };
        } catch (error) {
            logger.error('Error retrieving vehicle specification', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
                vehicleSpecId,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to retrieve vehicle specification');
        }
    }

    /**
     * Update vehicle specification
     */
    async updateVehicleSpec(vehicleSpecId: string, data: UpdateVehicleSpecInput) {
        try {
            // Check if specification exists
            const existingSpec = await db
                .select()
                .from(vehicleSpecifications)
                .where(eq(vehicleSpecifications.vehicleSpec_id, vehicleSpecId))
                .limit(1);

            if (!existingSpec.length) {
                throw ErrorFactory.notFound('Vehicle specification not found');
            }

            // Check for conflicts if key fields are being updated
            if (data.manufacturer || data.model || data.year || data.color) {
                const manufacturer = data.manufacturer || existingSpec[0].manufacturer;
                const model = data.model || existingSpec[0].model;
                const year = data.year || existingSpec[0].year;
                const color = data.color || existingSpec[0].color;

                const conflictingSpec = await db
                    .select()
                    .from(vehicleSpecifications)
                    .where(
                        and(
                            eq(vehicleSpecifications.manufacturer, manufacturer),
                            eq(vehicleSpecifications.model, model),
                            eq(vehicleSpecifications.year, year),
                            color ? eq(vehicleSpecifications.color, color) : sql`1=1`,
                            sql`${vehicleSpecifications.vehicleSpec_id} != ${vehicleSpecId}`
                        )
                    )
                    .limit(1);

                if (conflictingSpec.length > 0) {
                    throw ErrorFactory.conflict('Another vehicle specification with these details already exists');
                }
            }

            const updateData: any = { updated_at: new Date() };

            // Update fields if provided
            if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
            if (data.model !== undefined) updateData.model = data.model;
            if (data.year !== undefined) updateData.year = data.year;
            if (data.fuel_type !== undefined) updateData.fuel_type = data.fuel_type;
            if (data.engine_capacity !== undefined) updateData.engine_capacity = data.engine_capacity;
            if (data.transmission !== undefined) updateData.transmission = data.transmission;
            if (data.seating_capacity !== undefined) updateData.seating_capacity = data.seating_capacity;
            if (data.color !== undefined) updateData.color = data.color;
            if (data.features !== undefined) updateData.features = data.features;

            // Update specification
            await db
                .update(vehicleSpecifications)
                .set(updateData)
                .where(eq(vehicleSpecifications.vehicleSpec_id, vehicleSpecId));

            logger.info('Vehicle specification updated successfully', {
                module: 'vehicle_specifications',
                vehicleSpec_id: vehicleSpecId,
                updateData,
            });

            return await this.getVehicleSpecById(vehicleSpecId);
        } catch (error) {
            logger.error('Error updating vehicle specification', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
                vehicleSpecId,
                data,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to update vehicle specification');
        }
    }

    /**
     * Delete vehicle specification
     */
    async deleteVehicleSpec(vehicleSpecId: string) {
        try {
            // Check if specification exists
            const existingSpec = await db
                .select()
                .from(vehicleSpecifications)
                .where(eq(vehicleSpecifications.vehicleSpec_id, vehicleSpecId))
                .limit(1);

            if (!existingSpec.length) {
                throw ErrorFactory.notFound('Vehicle specification not found');
            }

            // Check if any vehicles are using this specification
            const vehiclesUsingSpec = await db
                .select({ count: sql<number>`count(*)` })
                .from(vehicles)
                .where(eq(vehicles.vehicleSpec_id, vehicleSpecId));

            if (vehiclesUsingSpec[0]?.count > 0) {
                throw ErrorFactory.badRequest('Cannot delete specification that is being used by vehicles');
            }

            // Delete specification
            await db
                .delete(vehicleSpecifications)
                .where(eq(vehicleSpecifications.vehicleSpec_id, vehicleSpecId));

            logger.info('Vehicle specification deleted successfully', {
                module: 'vehicle_specifications',
                vehicleSpec_id: vehicleSpecId,
            });

            return { message: 'Vehicle specification deleted successfully' };
        } catch (error) {
            logger.error('Error deleting vehicle specification', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
                vehicleSpecId,
            });
            throw error instanceof AppError ? error : ErrorFactory.internal('Failed to delete vehicle specification');
        }
    }

    /**
     * Get vehicle specification statistics
     */
    async getVehicleSpecStatistics() {
        try {
            // Total specifications
            const totalSpecs = await db
                .select({ count: sql<number>`count(*)` })
                .from(vehicleSpecifications);

            // Specifications by manufacturer
            const specsByManufacturer = await db
                .select({
                    manufacturer: vehicleSpecifications.manufacturer,
                    count: sql<number>`count(*)`
                })
                .from(vehicleSpecifications)
                .groupBy(vehicleSpecifications.manufacturer)
                .orderBy(desc(sql`count(*)`));

            // Specifications by fuel type
            const specsByFuelType = await db
                .select({
                    fuel_type: vehicleSpecifications.fuel_type,
                    count: sql<number>`count(*)`
                })
                .from(vehicleSpecifications)
                .groupBy(vehicleSpecifications.fuel_type)
                .orderBy(desc(sql`count(*)`));

            // Specifications by transmission
            const specsByTransmission = await db
                .select({
                    transmission: vehicleSpecifications.transmission,
                    count: sql<number>`count(*)`
                })
                .from(vehicleSpecifications)
                .groupBy(vehicleSpecifications.transmission)
                .orderBy(desc(sql`count(*)`));

            // Most popular specifications (simplified - without vehicle count for now)
            const popularSpecs = await db
                .select({
                    vehicleSpec_id: vehicleSpecifications.vehicleSpec_id,
                    manufacturer: vehicleSpecifications.manufacturer,
                    model: vehicleSpecifications.model,
                    year: vehicleSpecifications.year,
                    color: vehicleSpecifications.color,
                    fuel_type: vehicleSpecifications.fuel_type,
                    transmission: vehicleSpecifications.transmission,
                    seating_capacity: vehicleSpecifications.seating_capacity
                })
                .from(vehicleSpecifications)
                .orderBy(desc(vehicleSpecifications.created_at))
                .limit(10);

            // Average year
            const avgYear = await db
                .select({
                    avg_year: sql<number>`avg(${vehicleSpecifications.year})`
                })
                .from(vehicleSpecifications);

            return {
                total_specifications: totalSpecs[0]?.count || 0,
                specifications_by_manufacturer: specsByManufacturer,
                specifications_by_fuel_type: specsByFuelType,
                specifications_by_transmission: specsByTransmission,
                popular_specifications: popularSpecs,
                average_year: Math.round(avgYear[0]?.avg_year || 0),
            };
        } catch (error) {
            logger.error('Error retrieving vehicle specification statistics', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('Failed to retrieve vehicle specification statistics');
        }
    }

    /**
     * Get unique manufacturers
     */
    async getManufacturers() {
        try {
            const manufacturers = await db
                .selectDistinct({ manufacturer: vehicleSpecifications.manufacturer })
                .from(vehicleSpecifications)
                .orderBy(asc(vehicleSpecifications.manufacturer));

            return manufacturers.map((m: { manufacturer: string }) => m.manufacturer);
        } catch (error) {
            logger.error('Error retrieving manufacturers', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('Failed to retrieve manufacturers');
        }
    }

    /**
     * Get models by manufacturer
     */
    async getModelsByManufacturer(manufacturer: string) {
        try {
            const models = await db
                .selectDistinct({ model: vehicleSpecifications.model })
                .from(vehicleSpecifications)
                .where(eq(vehicleSpecifications.manufacturer, manufacturer))
                .orderBy(asc(vehicleSpecifications.model));

            return models.map((m: { model: string }) => m.model);
        } catch (error) {
            logger.error('Error retrieving models by manufacturer', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
                manufacturer,
            });
            throw ErrorFactory.internal('Failed to retrieve models');
        }
    }

    /**
     * Bulk create vehicle specifications
     */
    async bulkCreateVehicleSpecs(specifications: CreateVehicleSpecInput[]) {
        try {
            const results = [];
            const errors = [];

            for (let i = 0; i < specifications.length; i++) {
                try {
                    const spec = await this.createVehicleSpec(specifications[i]);
                    results.push({ index: i, success: true, specification: spec });
                } catch (error) {
                    errors.push({
                        index: i,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        data: specifications[i]
                    });
                }
            }

            logger.info('Bulk vehicle specification creation completed', {
                module: 'vehicle_specifications',
                total: specifications.length,
                successful: results.length,
                failed: errors.length,
            });

            return {
                total: specifications.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors,
            };
        } catch (error) {
            logger.error('Error in bulk vehicle specification creation', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('Failed to bulk create vehicle specifications');
        }
    }

    /**
     * Get popular vehicle specifications based on vehicle count
     */
    async getPopularVehicleSpecs(limit: number = 10) {
        try {
            logger.info('Retrieving popular vehicle specifications', {
                module: 'vehicle_specifications',
                limit
            });

            const popularSpecs = await db
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
                    vehicle_category: vehicleSpecifications.vehicle_category,
                    created_at: vehicleSpecifications.created_at,
                })
                .from(vehicleSpecifications)
                .orderBy(desc(vehicleSpecifications.created_at))
                .limit(limit);

            logger.info('Popular vehicle specifications retrieved successfully', {
                module: 'vehicle_specifications',
                count: popularSpecs.length
            });

            return popularSpecs;
        } catch (error) {
            logger.error('Error retrieving popular vehicle specifications', {
                module: 'vehicle_specifications',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw ErrorFactory.internal('Failed to retrieve popular vehicle specifications');
        }
    }
}

export const vehicleSpecService = new VehicleSpecService();