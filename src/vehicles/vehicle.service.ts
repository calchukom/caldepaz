import { eq, ilike, and, or, desc, asc, count, sql, gte, lte, not, inArray } from 'drizzle-orm';
import db from '../drizzle/db';
import {
    vehicles,
    vehicleSpecifications,
    bookings,
    locations,
    maintenanceRecords,
    vehicleImages,
    type Vehicle,
    type NewVehicle,
    type MaintenanceRecord as DbMaintenanceRecord,
    type NewMaintenanceRecord,
} from '../drizzle/schema';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';

// =======================
// TYPES & INTERFACES
// =======================
export interface VehicleFilters {
    search?: string;
    manufacturer?: string;
    model?: string;
    fuel_type?: string;
    transmission?: string;
    vehicle_category?: string;
    min_rate?: number;
    max_rate?: number;
    availability?: boolean;
    year_from?: number;
    year_to?: number;
    seating_capacity?: number;
    available_only?: boolean;
    sortBy?: 'rental_rate' | 'created_at' | 'updated_at' | 'license_plate' | 'manufacturer' | 'model' | 'year' | 'availability';
    sortOrder?: 'asc' | 'desc';
    location_id?: string;
}

export interface VehicleWithDetails {
    vehicle_id: string;
    vehicleSpec_id: string;
    location_id?: string | null;
    rental_rate: string;
    availability: boolean;
    status: "available" | "rented" | "maintenance" | "out_of_service" | "reserved";
    license_plate?: string | null;
    mileage?: number | null;
    fuel_level?: number | null;
    last_service_date?: Date | null;
    next_service_due?: Date | null;
    last_cleaned?: Date | null;
    insurance_expiry?: Date | null;
    registration_expiry?: Date | null;
    acquisition_date?: Date | null;
    acquisition_cost?: string | null;
    depreciation_rate?: string | null;
    condition_rating?: number | null;
    gps_tracking_id?: string | null;
    is_damaged?: boolean | null;
    damage_description?: string | null;
    images?: string[] | null;
    primary_image_url?: string | null; // ✅ ADDED: Primary image URL from vehicle_images table
    notes?: string | null;
    created_at: Date;
    updated_at: Date;
    manufacturer?: string;
    model?: string;
    year?: number;
    fuel_type?: string;
    transmission?: string;
    seating_capacity?: number;
    color?: string;
    vehicle_category?: string;
    features?: string;
    location_name?: string;
    total_bookings?: number;
    active_bookings?: number;
}

export interface MaintenanceRecord {
    maintenance_id: string;
    vehicle_id: string;
    maintenance_type: "routine" | "repair" | "inspection" | "cleaning" | "emergency" | "upgrade";
    maintenance_date: Date;
    description: string;
    cost: string;
    service_provider?: string | null;
    technician_name?: string | null;
    parts_replaced?: string | null;
    mileage_at_service?: number | null;
    next_service_mileage?: number | null;
    completion_status?: string | null;
    warranty_info?: string | null;
    attachments?: string[] | null;
    notes?: string | null;
    created_at: Date;
    updated_at: Date;
}

// =======================
// HELPERS
// =======================
const buildWhereConditions = (filters: VehicleFilters) => {
    const conditions: any[] = [];
    if (filters.search) {
        conditions.push(
            or(
                ilike(vehicles.license_plate, `%${filters.search}%`),
                ilike(vehicleSpecifications.manufacturer, `%${filters.search}%`),
                ilike(vehicleSpecifications.model, `%${filters.search}%`),
                ilike(vehicleSpecifications.color, `%${filters.search}%`)
            )
        );
    }
    if (filters.availability !== undefined) conditions.push(eq(vehicles.availability, filters.availability));
    if (filters.available_only) conditions.push(eq(vehicles.availability, true));
    if (filters.location_id) conditions.push(eq(vehicles.location_id, filters.location_id));
    if (filters.manufacturer) conditions.push(ilike(vehicleSpecifications.manufacturer, `%${filters.manufacturer}%`));
    if (filters.model) conditions.push(ilike(vehicleSpecifications.model, `%${filters.model}%`));
    if (filters.fuel_type && (['petrol', 'diesel', 'electric', 'hybrid'] as const).includes(filters.fuel_type as any))
        conditions.push(eq(vehicleSpecifications.fuel_type, filters.fuel_type as "petrol" | "diesel" | "electric" | "hybrid"));
    if (filters.transmission && (['manual', 'automatic', 'cvt'] as const).includes(filters.transmission as any))
        conditions.push(eq(vehicleSpecifications.transmission, filters.transmission as "manual" | "automatic" | "cvt"));
    if (filters.vehicle_category && (['four_wheeler', 'two_wheeler'] as const).includes(filters.vehicle_category as any))
        conditions.push(eq(vehicleSpecifications.vehicle_category, filters.vehicle_category as "four_wheeler" | "two_wheeler"));
    if (filters.seating_capacity !== undefined) conditions.push(eq(vehicleSpecifications.seating_capacity, filters.seating_capacity));
    if (filters.min_rate !== undefined) conditions.push(gte(vehicles.rental_rate, filters.min_rate.toString()));
    if (filters.max_rate !== undefined) conditions.push(lte(vehicles.rental_rate, filters.max_rate.toString()));
    if (filters.year_from !== undefined) conditions.push(gte(vehicleSpecifications.year, filters.year_from));
    if (filters.year_to !== undefined) conditions.push(lte(vehicleSpecifications.year, filters.year_to));
    return conditions;
};

const buildOrderByClause = (sortBy?: string, sortOrder?: string) => {
    const direction = sortOrder === 'asc' ? asc : desc;
    switch (sortBy) {
        case 'rental_rate': return direction(vehicles.rental_rate);
        case 'manufacturer': return direction(vehicleSpecifications.manufacturer);
        case 'model': return direction(vehicleSpecifications.model);
        case 'year': return direction(vehicleSpecifications.year);
        case 'availability': return direction(vehicles.availability);
        case 'license_plate': return direction(vehicles.license_plate);
        case 'updated_at': return direction(vehicles.updated_at);
        case 'created_at':
        default: return direction(vehicles.created_at);
    }
};

// Enhanced vehicle select fields to include primary image URL
const vehicleSelectFieldsWithPrimaryImage = {
    vehicle_id: vehicles.vehicle_id,
    vehicleSpec_id: vehicles.vehicleSpec_id,
    location_id: vehicles.location_id,
    rental_rate: vehicles.rental_rate,
    availability: vehicles.availability,
    status: vehicles.status,
    license_plate: vehicles.license_plate,
    mileage: vehicles.mileage,
    fuel_level: vehicles.fuel_level,
    last_service_date: vehicles.last_service_date,
    next_service_due: vehicles.next_service_due,
    last_cleaned: vehicles.last_cleaned,
    insurance_expiry: vehicles.insurance_expiry,
    registration_expiry: vehicles.registration_expiry,
    acquisition_date: vehicles.acquisition_date,
    acquisition_cost: vehicles.acquisition_cost,
    depreciation_rate: vehicles.depreciation_rate,
    condition_rating: vehicles.condition_rating,
    gps_tracking_id: vehicles.gps_tracking_id,
    is_damaged: vehicles.is_damaged,
    damage_description: vehicles.damage_description,
    notes: vehicles.notes,
    created_at: vehicles.created_at,
    updated_at: vehicles.updated_at,
    manufacturer: vehicleSpecifications.manufacturer,
    model: vehicleSpecifications.model,
    year: vehicleSpecifications.year,
    seating_capacity: vehicleSpecifications.seating_capacity,
    color: vehicleSpecifications.color,
    engine_capacity: vehicleSpecifications.engine_capacity,
    features: vehicleSpecifications.features,
    location_name: locations.name,
    // ✅ ADD PRIMARY IMAGE URL FROM vehicle_images table
    primary_image_url: vehicleImages.url,
};

// Original fields for compatibility with existing methods
const vehicleSelectFields = {
    vehicle_id: vehicles.vehicle_id,
    vehicleSpec_id: vehicles.vehicleSpec_id,
    location_id: vehicles.location_id,
    rental_rate: vehicles.rental_rate,
    availability: vehicles.availability,
    status: vehicles.status,
    license_plate: vehicles.license_plate,
    mileage: vehicles.mileage,
    fuel_level: vehicles.fuel_level,
    last_service_date: vehicles.last_service_date,
    next_service_due: vehicles.next_service_due,
    last_cleaned: vehicles.last_cleaned,
    insurance_expiry: vehicles.insurance_expiry,
    registration_expiry: vehicles.registration_expiry,
    acquisition_date: vehicles.acquisition_date,
    acquisition_cost: vehicles.acquisition_cost,
    depreciation_rate: vehicles.depreciation_rate,
    condition_rating: vehicles.condition_rating,
    gps_tracking_id: vehicles.gps_tracking_id,
    is_damaged: vehicles.is_damaged,
    damage_description: vehicles.damage_description,
    notes: vehicles.notes,
    created_at: vehicles.created_at,
    updated_at: vehicles.updated_at,
    manufacturer: vehicleSpecifications.manufacturer,
    model: vehicleSpecifications.model,
    year: vehicleSpecifications.year,
    seating_capacity: vehicleSpecifications.seating_capacity,
    color: vehicleSpecifications.color,
    engine_capacity: vehicleSpecifications.engine_capacity,
    features: vehicleSpecifications.features,
    location_name: locations.name,
};

// =======================
// VALIDATION
// =======================
const validateVehicleSpecification = async (vehicleSpecId: string) => {
    const vehicleSpec = await db
        .select()
        .from(vehicleSpecifications)
        .where(eq(vehicleSpecifications.vehicleSpec_id, vehicleSpecId))
        .limit(1);
    if (!vehicleSpec.length) throw ErrorFactory.badRequest('Vehicle specification not found');
};

const validateLicensePlate = async (licensePlate: string, excludeId?: string) => {
    const conditions = [eq(vehicles.license_plate, licensePlate)];
    if (excludeId) conditions.push(not(eq(vehicles.vehicle_id, excludeId)));
    const existingVehicle = await db.select().from(vehicles).where(and(...conditions)).limit(1);
    if (existingVehicle.length > 0) throw ErrorFactory.conflict('Vehicle with this license plate already exists');
};

const hasVehicleBookings = async (vehicleId: string) => {
    const vehicleBookings = await db
        .select()
        .from(bookings)
        .where(and(
            eq(bookings.vehicle_id, vehicleId),
            not(eq(bookings.booking_status, 'cancelled'))
        ))
        .limit(1);
    return vehicleBookings.length > 0;
};

// =======================
// SERVICE API
// =======================

export const getAllVehicles = async (
    page: number = 1,
    limit: number = 10,
    filters: VehicleFilters = {},
) => {
    const offset = (page - 1) * limit;
    const conditions = buildWhereConditions(filters);
    const orderBy = buildOrderByClause(filters.sortBy, filters.sortOrder);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total vehicles (without image join for performance)
    const totalResult = await db
        .select({ count: count() })
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .where(whereClause);
    const total = totalResult[0]?.count || 0;

    // ✅ ENHANCED: Get vehicles WITH primary image URL
    const vehicleResults = await db
        .select(vehicleSelectFieldsWithPrimaryImage)
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        // ✅ ADD: LEFT JOIN with vehicle_images table to get primary image
        .leftJoin(vehicleImages as any, and(
            eq(vehicles.vehicle_id, vehicleImages.vehicle_id),
            eq(vehicleImages.is_primary, true)  // Only get primary image
        ))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

    return {
        vehicles: vehicleResults as (VehicleWithDetails & { primary_image_url?: string | null })[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
};

export const searchVehicles = async (q: string, limit: number = 10) => {
    const filters: VehicleFilters = { search: q };
    const { vehicles } = await getAllVehicles(1, limit, filters);
    return vehicles; // Now includes primary_image_url ✅
};

export const getVehicleById = async (vehicleId: string): Promise<VehicleWithDetails | null> => {
    const vehicle = await db
        .select(vehicleSelectFields)
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .where(eq(vehicles.vehicle_id, vehicleId))
        .limit(1);
    return vehicle.length ? (vehicle[0] as VehicleWithDetails) : null;
};

export const checkVehicleAvailability = async (
    vehicleId: string,
    startDate: Date,
    endDate: Date
) => {
    const vehicle = await db
        .select({ availability: vehicles.availability })
        .from(vehicles)
        .where(eq(vehicles.vehicle_id, vehicleId))
        .limit(1);
    if (!vehicle.length) throw ErrorFactory.notFound('Vehicle not found');
    const conflictingBookings = await db
        .select({
            booking_id: bookings.booking_id,
            booking_date: bookings.booking_date,
            return_date: bookings.return_date,
            booking_status: bookings.booking_status
        })
        .from(bookings)
        .where(and(
            eq(bookings.vehicle_id, vehicleId),
            or(
                and(gte(bookings.booking_date, startDate), lte(bookings.booking_date, endDate)),
                and(gte(bookings.return_date, startDate), lte(bookings.return_date, endDate)),
                and(lte(bookings.booking_date, startDate), gte(bookings.return_date, endDate))
            ),
            not(eq(bookings.booking_status, 'cancelled'))
        ));
    return {
        vehicle_id: vehicleId,
        is_available: vehicle[0].availability && conflictingBookings.length === 0,
        conflicting_bookings: conflictingBookings.length > 0 ? conflictingBookings : undefined
    };
};

export const getAvailableVehicles = async (
    startDate: Date,
    endDate: Date,
    location_id?: string,
    filters: VehicleFilters = {},
    page = 1,
    limit = 10
) => {
    const offset = (page - 1) * limit;
    const filterConditions = buildWhereConditions({
        ...filters,
        availability: true,
        ...(location_id ? { location_id } : {})
    });
    // Find all booked vehicle IDs for the given date range
    const bookedVehicleIds = await db
        .select({ vehicle_id: bookings.vehicle_id })
        .from(bookings)
        .where(and(
            not(eq(bookings.booking_status, 'cancelled')),
            or(
                and(lte(bookings.booking_date, startDate), gte(bookings.return_date, startDate)),
                and(lte(bookings.booking_date, endDate), gte(bookings.return_date, endDate)),
                and(gte(bookings.booking_date, startDate), lte(bookings.return_date, endDate))
            )
        ));
    const notBookedCondition =
        bookedVehicleIds.length > 0
            ? not(inArray(vehicles.vehicle_id, bookedVehicleIds.map((v: any) => v.vehicle_id)))
            : undefined;
    const whereConditions = notBookedCondition
        ? [...filterConditions, notBookedCondition]
        : filterConditions;
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    // Get total count
    const totalResult = await db
        .select({ count: count() })
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .where(whereClause);
    const total = totalResult[0]?.count ?? 0;
    // Get paginated available vehicles with specifications AND primary image
    const result = await db
        .select(vehicleSelectFieldsWithPrimaryImage)
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        // ✅ ADD: LEFT JOIN with vehicle_images to get primary image
        .leftJoin(vehicleImages as any, and(
            eq(vehicles.vehicle_id, vehicleImages.vehicle_id),
            eq(vehicleImages.is_primary, true)
        ))
        .where(whereClause)
        .orderBy(desc(vehicles.created_at))
        .limit(limit)
        .offset(offset);
    return {
        vehicles: result,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

export const getVehicleStatistics = async () => {
    // Implement statistics as in previous version
    // ...
    return {};
};

export const getVehicleEarnings = async (startDate?: string, endDate?: string) => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        // Get earnings from completed bookings with payments
        const earningsResult = await db
            .select({
                total_earnings: sql<number>`COALESCE(SUM(CAST(${bookings.total_amount} AS DECIMAL)), 0)`,
                total_bookings: count(bookings.booking_id),
            })
            .from(bookings)
            .where(
                and(
                    eq(bookings.booking_status, 'completed'),
                    gte(bookings.created_at, start),
                    lte(bookings.created_at, end)
                )
            );

        // Get earnings by vehicle category
        const earningsByCategory = await db
            .select({
                category: vehicleSpecifications.vehicle_category,
                earnings: sql<number>`COALESCE(SUM(CAST(${bookings.total_amount} AS DECIMAL)), 0)`,
                bookings_count: count(bookings.booking_id),
            })
            .from(bookings)
            .innerJoin(vehicles as any, eq(bookings.vehicle_id, vehicles.vehicle_id))
            .innerJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(
                and(
                    eq(bookings.booking_status, 'completed'),
                    gte(bookings.created_at, start),
                    lte(bookings.created_at, end)
                )
            )
            .groupBy(vehicleSpecifications.vehicle_category);

        return {
            period: {
                start_date: start.toISOString(),
                end_date: end.toISOString(),
            },
            summary: {
                total_earnings: Number(earningsResult[0]?.total_earnings || 0),
                total_bookings: earningsResult[0]?.total_bookings || 0,
                average_booking_value: earningsResult[0]?.total_bookings > 0
                    ? Number(earningsResult[0]?.total_earnings || 0) / earningsResult[0].total_bookings
                    : 0,
            },
            by_category: earningsByCategory.map((item: any) => ({
                category: item.category,
                earnings: Number(item.earnings),
                bookings_count: item.bookings_count,
                average_value: item.bookings_count > 0 ? Number(item.earnings) / item.bookings_count : 0,
            })),
        };
    } catch (error) {
        logger.error('Error calculating vehicle earnings:', error);
        throw ErrorFactory.internal('Failed to calculate vehicle earnings');
    }
};

export const createVehicle = async (vehicleData: Omit<NewVehicle, 'vehicle_id' | 'created_at' | 'updated_at'>): Promise<Vehicle> => {
    await validateVehicleSpecification(vehicleData.vehicleSpec_id);
    if (vehicleData.license_plate) await validateLicensePlate(vehicleData.license_plate);
    const [newVehicle] = await db.insert(vehicles).values({
        ...vehicleData,
        rental_rate: typeof vehicleData.rental_rate === 'string'
            ? vehicleData.rental_rate
            : String(vehicleData.rental_rate)
    }).returning();
    return newVehicle;
};

export const batchImportVehicles = async (vehicleList: Omit<NewVehicle, 'vehicle_id' | 'created_at' | 'updated_at'>[]) => {
    const created: Vehicle[] = [];
    for (const vehicleData of vehicleList) {
        created.push(await createVehicle(vehicleData));
    }
    return created;
};

export const updateVehicle = async (vehicleId: string, updateData: any): Promise<Vehicle | null> => {
    const existingVehicle = await getVehicleById(vehicleId);
    if (!existingVehicle) return null;
    if (updateData.vehicleSpec_id) await validateVehicleSpecification(updateData.vehicleSpec_id);
    if (updateData.license_plate) await validateLicensePlate(updateData.license_plate, vehicleId);
    const updateValues: any = { updated_at: new Date() };
    Object.keys(updateData).forEach(key => {
        const value = updateData[key as keyof typeof updateData];
        if (value !== undefined) {
            if (key === 'rental_rate' && typeof value === 'number') {
                updateValues[key] = value.toString();
            } else {
                updateValues[key] = value;
            }
        }
    });
    const [updatedVehicle] = await db
        .update(vehicles)
        .set(updateValues)
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle;
};

export const updateVehicleAvailability = async (vehicleId: string, availability: boolean) => {
    const [updatedVehicle] = await db
        .update(vehicles)
        .set({ availability, updated_at: new Date() })
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle;
};

export const updateVehicleStatus = async (vehicleId: string, status: "available" | "rented" | "maintenance" | "out_of_service" | "reserved") => {
    const [updatedVehicle] = await db
        .update(vehicles)
        .set({ status, updated_at: new Date() })
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle;
};

export const addMaintenanceRecord = async (
    vehicleId: string,
    maintenanceData: {
        maintenance_date: Date;
        description: string;
        cost: number;
        service_provider?: string;
        technician_name?: string;
        parts_replaced?: string;
        mileage_at_service?: number;
        next_service_mileage?: number;
        completion_status?: string;
        warranty_info?: string;
        attachments?: string[];
        notes?: string;
    }
): Promise<MaintenanceRecord> => {
    const [newRecord] = await db.insert(maintenanceRecords).values({
        vehicle_id: vehicleId,
        maintenance_type: 'routine', // default type
        title: maintenanceData.description || 'Maintenance Record', // Add required title
        scheduled_date: maintenanceData.maintenance_date || new Date(), // Add required scheduled_date
        ...maintenanceData,
        cost: typeof maintenanceData.cost === 'string'
            ? maintenanceData.cost
            : String(maintenanceData.cost)
    }).returning();

    return newRecord;
};

export const getMaintenanceHistory = async (vehicleId: string): Promise<MaintenanceRecord[]> => {
    const records = await db
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.vehicle_id, vehicleId))
        .orderBy(desc(maintenanceRecords.maintenance_date));

    return records;
};

export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
    if (await hasVehicleBookings(vehicleId)) throw ErrorFactory.conflict('Cannot delete vehicle with existing bookings');
    const deletedRows = await db.delete(vehicles).where(eq(vehicles.vehicle_id, vehicleId));
    return deletedRows.rowCount !== null && deletedRows.rowCount > 0;
};

export const uploadVehicleImages = async (vehicleId: string, imageFiles: any[]): Promise<string[]> => {
    // for now, mock upload
    const imageUrls = imageFiles.map((_: any, index: number) =>
        `https://example.com/vehicles/${vehicleId}/image_${Date.now()}_${index}.jpg`
    );
    await db
        .update(vehicles)
        .set({
            updated_at: new Date()
        })
        .where(eq(vehicles.vehicle_id, vehicleId));
    return imageUrls;
};

export const deleteVehicleImage = async (vehicleId: string, imageId: string): Promise<boolean> => {
    // This method should be handled by the VehicleImageService
    // Remove from here and use the dedicated image service
    return false;
};

// New beneficial service methods for enhanced vehicle management

export const updateVehicleFuelLevel = async (vehicleId: string, fuelLevel: number): Promise<Vehicle | null> => {
    if (fuelLevel < 0 || fuelLevel > 100) {
        throw ErrorFactory.badRequest('Fuel level must be between 0 and 100');
    }
    const [updatedVehicle] = await db
        .update(vehicles)
        .set({ fuel_level: fuelLevel, updated_at: new Date() })
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle || null;
};

export const updateVehicleCondition = async (
    vehicleId: string,
    conditionRating: number,
    isDamaged: boolean = false,
    damageDescription?: string
): Promise<Vehicle | null> => {
    if (conditionRating < 1 || conditionRating > 10) {
        throw ErrorFactory.badRequest('Condition rating must be between 1 and 10');
    }
    const updateData: any = {
        condition_rating: conditionRating,
        is_damaged: isDamaged,
        updated_at: new Date()
    };
    if (damageDescription !== undefined) {
        updateData.damage_description = damageDescription;
    }
    const [updatedVehicle] = await db
        .update(vehicles)
        .set(updateData)
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle || null;
};

export const updateVehicleMileage = async (vehicleId: string, mileage: number): Promise<Vehicle | null> => {
    if (mileage < 0) {
        throw ErrorFactory.badRequest('Mileage cannot be negative');
    }
    const [updatedVehicle] = await db
        .update(vehicles)
        .set({ mileage, updated_at: new Date() })
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle || null;
};

export const markVehicleCleaned = async (vehicleId: string): Promise<Vehicle | null> => {
    const [updatedVehicle] = await db
        .update(vehicles)
        .set({
            last_cleaned: new Date(),
            updated_at: new Date()
        })
        .where(eq(vehicles.vehicle_id, vehicleId))
        .returning();
    return updatedVehicle || null;
};

export const getVehiclesByCondition = async (
    minCondition: number = 1,
    maxCondition: number = 10,
    includeDamaged: boolean = true
): Promise<VehicleWithDetails[]> => {
    const conditions: any[] = [
        gte(vehicles.condition_rating, minCondition),
        lte(vehicles.condition_rating, maxCondition)
    ];

    if (!includeDamaged) {
        conditions.push(eq(vehicles.is_damaged, false));
    }

    const vehicleResults = await db
        .select(vehicleSelectFields)
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .where(and(...conditions))
        .orderBy(desc(vehicles.condition_rating));

    return vehicleResults as VehicleWithDetails[];
};

export const getVehiclesDueForService = async (): Promise<VehicleWithDetails[]> => {
    const today = new Date();
    const vehicleResults = await db
        .select(vehicleSelectFields)
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .where(
            or(
                lte(vehicles.next_service_due, today),
                lte(vehicles.insurance_expiry, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)), // 30 days
                lte(vehicles.registration_expiry, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) // 30 days
            )
        )
        .orderBy(asc(vehicles.next_service_due));

    return vehicleResults as VehicleWithDetails[];
};

export const getVehicleFinancials = async (vehicleId: string) => {
    const vehicle = await db
        .select({
            acquisition_cost: vehicles.acquisition_cost,
            depreciation_rate: vehicles.depreciation_rate,
            acquisition_date: vehicles.acquisition_date,
            rental_rate: vehicles.rental_rate
        })
        .from(vehicles)
        .where(eq(vehicles.vehicle_id, vehicleId))
        .limit(1);

    if (!vehicle.length) throw ErrorFactory.notFound('Vehicle');

    const vehicleData = vehicle[0];
    const acquisitionCost = parseFloat(vehicleData.acquisition_cost || '0');
    const depreciationRate = parseFloat(vehicleData.depreciation_rate || '0');
    const monthlyRate = parseFloat(vehicleData.rental_rate);

    // Calculate current value based on depreciation
    let currentValue = acquisitionCost;
    if (vehicleData.acquisition_date && depreciationRate > 0) {
        const monthsSinceAcquisition = Math.floor(
            (Date.now() - vehicleData.acquisition_date.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        currentValue = acquisitionCost * Math.pow(1 - depreciationRate / 100, monthsSinceAcquisition);
    }

    // Get total bookings and revenue
    const bookingStats = await db
        .select({
            total_bookings: count(),
            total_revenue: sql<number>`SUM(CAST(${bookings.total_amount} AS DECIMAL))`
        })
        .from(bookings)
        .where(and(
            eq(bookings.vehicle_id, vehicleId),
            not(eq(bookings.booking_status, 'cancelled'))
        ));

    const maintenanceCosts = await db
        .select({
            total_maintenance_cost: sql<number>`SUM(CAST(${maintenanceRecords.cost} AS DECIMAL))`
        })
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.vehicle_id, vehicleId));

    return {
        vehicle_id: vehicleId,
        acquisition_cost: acquisitionCost,
        current_estimated_value: Math.max(0, currentValue),
        depreciation_rate: depreciationRate,
        monthly_rental_rate: monthlyRate,
        total_bookings: bookingStats[0]?.total_bookings || 0,
        total_revenue: bookingStats[0]?.total_revenue || 0,
        total_maintenance_cost: maintenanceCosts[0]?.total_maintenance_cost || 0,
        net_profit: (bookingStats[0]?.total_revenue || 0) - (maintenanceCosts[0]?.total_maintenance_cost || 0),
        roi_percentage: acquisitionCost > 0
            ? (((bookingStats[0]?.total_revenue || 0) - (maintenanceCosts[0]?.total_maintenance_cost || 0)) / acquisitionCost) * 100
            : 0
    };
};

// ============================================================================
// ENHANCED VEHICLE METHODS WITH IMAGES
// ============================================================================

// Updated getVehicleById to include images
export const getVehicleByIdWithImages = async (vehicleId: string): Promise<any> => {
    const vehicle = await db
        .select({
            // Vehicle info
            vehicle_id: vehicles.vehicle_id,
            vehicleSpec_id: vehicles.vehicleSpec_id,
            location_id: vehicles.location_id,
            rental_rate: vehicles.rental_rate,
            availability: vehicles.availability,
            status: vehicles.status,
            license_plate: vehicles.license_plate,
            mileage: vehicles.mileage,
            fuel_level: vehicles.fuel_level,
            last_service_date: vehicles.last_service_date,
            next_service_due: vehicles.next_service_due,
            last_cleaned: vehicles.last_cleaned,
            insurance_expiry: vehicles.insurance_expiry,
            registration_expiry: vehicles.registration_expiry,
            acquisition_date: vehicles.acquisition_date,
            acquisition_cost: vehicles.acquisition_cost,
            depreciation_rate: vehicles.depreciation_rate,
            condition_rating: vehicles.condition_rating,
            gps_tracking_id: vehicles.gps_tracking_id,
            is_damaged: vehicles.is_damaged,
            damage_description: vehicles.damage_description,
            notes: vehicles.notes,
            vehicle_created_at: vehicles.created_at,
            vehicle_updated_at: vehicles.updated_at,
            // Vehicle spec info
            spec_manufacturer: vehicleSpecifications.manufacturer,
            spec_model: vehicleSpecifications.model,
            spec_year: vehicleSpecifications.year,
            spec_engine_capacity: vehicleSpecifications.engine_capacity,
            spec_seating_capacity: vehicleSpecifications.seating_capacity,
            spec_color: vehicleSpecifications.color,
            spec_features: vehicleSpecifications.features,
            // Location info
            location_name: locations.name,
            location_address: locations.address,
            location_contact_phone: locations.contact_phone,
            // Image info
            image_id: vehicleImages.image_id,
            image_url: vehicleImages.url,
            image_alt: vehicleImages.alt,
            image_caption: vehicleImages.caption,
            image_is_primary: vehicleImages.is_primary,
            image_is_360: vehicleImages.is_360,
            image_display_order: vehicleImages.display_order,
        })
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .leftJoin(vehicleImages as any, eq(vehicles.vehicle_id, vehicleImages.vehicle_id))
        .where(eq(vehicles.vehicle_id, vehicleId));

    if (!vehicle.length) {
        throw ErrorFactory.notFound('Vehicle not found');
    }

    // Group images by vehicle
    const vehicleData = vehicle[0];
    const images = vehicle
        .filter((row: any) => row.image_id)
        .map((row: any) => ({
            image_id: row.image_id,
            url: row.image_url,
            alt: row.image_alt,
            caption: row.image_caption,
            is_primary: row.image_is_primary,
            is_360: row.image_is_360,
            display_order: row.image_display_order,
        }))
        .sort((a: any, b: any) => {
            // Primary images first, then by display_order
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.display_order || 0) - (b.display_order || 0);
        });

    return {
        vehicle_id: vehicleData.vehicle_id,
        vehicleSpec_id: vehicleData.vehicleSpec_id,
        location_id: vehicleData.location_id,
        rental_rate: vehicleData.rental_rate,
        availability: vehicleData.availability,
        status: vehicleData.status,
        license_plate: vehicleData.license_plate,
        mileage: vehicleData.mileage,
        fuel_level: vehicleData.fuel_level,
        last_service_date: vehicleData.last_service_date,
        next_service_due: vehicleData.next_service_due,
        last_cleaned: vehicleData.last_cleaned,
        insurance_expiry: vehicleData.insurance_expiry,
        registration_expiry: vehicleData.registration_expiry,
        acquisition_date: vehicleData.acquisition_date,
        acquisition_cost: vehicleData.acquisition_cost,
        depreciation_rate: vehicleData.depreciation_rate,
        condition_rating: vehicleData.condition_rating,
        gps_tracking_id: vehicleData.gps_tracking_id,
        is_damaged: vehicleData.is_damaged,
        damage_description: vehicleData.damage_description,
        notes: vehicleData.notes,
        created_at: vehicleData.vehicle_created_at,
        updated_at: vehicleData.vehicle_updated_at,
        vehicleSpec: {
            manufacturer: vehicleData.spec_manufacturer,
            model: vehicleData.spec_model,
            year: vehicleData.spec_year,
            engine_capacity: vehicleData.spec_engine_capacity,
            seating_capacity: vehicleData.spec_seating_capacity,
            color: vehicleData.spec_color,
            features: vehicleData.spec_features,
        },
        location: {
            name: vehicleData.location_name,
            address: vehicleData.location_address,
            contact_phone: vehicleData.location_contact_phone,
        },
        images
    };
};

// Get all vehicles with images
export const getVehiclesWithImages = async (filters: VehicleFilters = {}): Promise<any[]> => {
    const filterConditions = buildWhereConditions(filters);
    const orderBy = buildOrderByClause(filters.sortBy, filters.sortOrder);
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const query = db
        .select({
            // Vehicle info
            vehicle_id: vehicles.vehicle_id,
            vehicleSpec_id: vehicles.vehicleSpec_id,
            location_id: vehicles.location_id,
            rental_rate: vehicles.rental_rate,
            availability: vehicles.availability,
            status: vehicles.status,
            license_plate: vehicles.license_plate,
            mileage: vehicles.mileage,
            fuel_level: vehicles.fuel_level,
            last_service_date: vehicles.last_service_date,
            next_service_due: vehicles.next_service_due,
            last_cleaned: vehicles.last_cleaned,
            insurance_expiry: vehicles.insurance_expiry,
            registration_expiry: vehicles.registration_expiry,
            acquisition_date: vehicles.acquisition_date,
            acquisition_cost: vehicles.acquisition_cost,
            depreciation_rate: vehicles.depreciation_rate,
            condition_rating: vehicles.condition_rating,
            gps_tracking_id: vehicles.gps_tracking_id,
            is_damaged: vehicles.is_damaged,
            damage_description: vehicles.damage_description,
            notes: vehicles.notes,
            vehicle_created_at: vehicles.created_at,
            vehicle_updated_at: vehicles.updated_at,
            // Vehicle spec info
            spec_manufacturer: vehicleSpecifications.manufacturer,
            spec_model: vehicleSpecifications.model,
            spec_year: vehicleSpecifications.year,
            spec_engine_capacity: vehicleSpecifications.engine_capacity,
            spec_seating_capacity: vehicleSpecifications.seating_capacity,
            spec_color: vehicleSpecifications.color,
            spec_features: vehicleSpecifications.features,
            // Location info
            location_name: locations.name,
            location_address: locations.address,
            location_contact_phone: locations.contact_phone,
            // Image info
            image_id: vehicleImages.image_id,
            image_url: vehicleImages.url,
            image_alt: vehicleImages.alt,
            image_caption: vehicleImages.caption,
            image_is_primary: vehicleImages.is_primary,
            image_is_360: vehicleImages.is_360,
            image_display_order: vehicleImages.display_order,
        })
        .from(vehicles)
        .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
        .leftJoin(locations as any, eq(vehicles.location_id, locations.location_id))
        .leftJoin(vehicleImages as any, eq(vehicles.vehicle_id, vehicleImages.vehicle_id))
        .where(whereClause)
        .orderBy(orderBy);

    const results = await query;

    // Group by vehicle and include images
    const vehicleMap = new Map();

    results.forEach((row: any) => {
        const vehicleId = row.vehicle_id;

        if (!vehicleMap.has(vehicleId)) {
            vehicleMap.set(vehicleId, {
                vehicle_id: row.vehicle_id,
                vehicleSpec_id: row.vehicleSpec_id,
                location_id: row.location_id,
                rental_rate: row.rental_rate,
                availability: row.availability,
                status: row.status,
                license_plate: row.license_plate,
                mileage: row.mileage,
                fuel_level: row.fuel_level,
                last_service_date: row.last_service_date,
                next_service_due: row.next_service_due,
                last_cleaned: row.last_cleaned,
                insurance_expiry: row.insurance_expiry,
                registration_expiry: row.registration_expiry,
                acquisition_date: row.acquisition_date,
                acquisition_cost: row.acquisition_cost,
                depreciation_rate: row.depreciation_rate,
                condition_rating: row.condition_rating,
                gps_tracking_id: row.gps_tracking_id,
                is_damaged: row.is_damaged,
                damage_description: row.damage_description,
                notes: row.notes,
                created_at: row.vehicle_created_at,
                updated_at: row.vehicle_updated_at,
                vehicleSpec: {
                    manufacturer: row.spec_manufacturer,
                    model: row.spec_model,
                    year: row.spec_year,
                    engine_capacity: row.spec_engine_capacity,
                    seating_capacity: row.spec_seating_capacity,
                    color: row.spec_color,
                    features: row.spec_features,
                },
                location: {
                    name: row.location_name,
                    address: row.location_address,
                    contact_phone: row.location_contact_phone,
                },
                images: []
            });
        }

        if (row.image_id) {
            vehicleMap.get(vehicleId).images.push({
                image_id: row.image_id,
                url: row.image_url,
                alt: row.image_alt,
                caption: row.image_caption,
                is_primary: row.image_is_primary,
                is_360: row.image_is_360,
                display_order: row.image_display_order,
            });
        }
    });

    return Array.from(vehicleMap.values());
};