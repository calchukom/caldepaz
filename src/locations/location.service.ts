import { eq, ilike, and, or, desc, asc, count, sql, gte, lte, isNotNull } from 'drizzle-orm';
import db from '../drizzle/db';
import { locations, bookings, vehicles, vehicleSpecifications, type Location, type NewLocation } from '../drizzle/schema';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface LocationFilters {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateLocationData {
    name: string;
    address: string;
    contact_phone?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    operating_hours?: string;
}

export interface UpdateLocationData {
    name?: string;
    address?: string;
    contact_phone?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    operating_hours?: string;
}

export interface LocationStatistics {
    total_locations: number;
    most_popular_locations: {
        location_id: string;
        name: string;
        booking_count: number;
    }[];
    location_usage: {
        location_id: string;
        name: string;
        total_bookings: number;
        active_bookings: number;
    }[];
}

export interface PopularLocation {
    id?: number;
    name: string;
    address?: string;
    description?: string;
    type?: string;
    region?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build WHERE conditions for location filtering
 */
const buildWhereConditions = (filters: LocationFilters & { country?: string; city?: string }) => {
    const conditions = [];

    // Search across name and address
    if (filters.search) {
        conditions.push(
            or(
                ilike(locations.name, `%${filters.search}%`),
                ilike(locations.address, `%${filters.search}%`)
            )
        );
    }

    // Filter by country if provided
    if (filters.country) {
        conditions.push(ilike(locations.country, `%${filters.country}%`));
    }

    // Filter by city if provided
    if (filters.city) {
        conditions.push(ilike(locations.city, `%${filters.city}%`));
    }

    return conditions;
};

/**
 * Build ORDER BY clause for location sorting
 */
const buildOrderByClause = (sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    const direction = sortOrder === 'asc' ? asc : desc;

    switch (sortBy) {
        case 'name':
            return direction(locations.name);
        case 'address':
            return direction(locations.address);
        case 'updated_at':
            return direction(locations.updated_at);
        case 'created_at':
        default:
            return direction(locations.created_at);
    }
};

// ============================================================================
// CORE LOCATION FUNCTIONS
// ============================================================================

/**
 * Get all locations with pagination, search, and filtering
 */
export const getAllLocations = async (
    page = 1,
    limit = 10,
    filters: LocationFilters & { country?: string; city?: string; latitude?: number; longitude?: number; radius?: number } = {}
): Promise<{
    locations: Location[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}> => {
    try {
        const offset = (page - 1) * limit;
        const conditions = buildWhereConditions(filters);
        const orderBy = buildOrderByClause(filters.sortBy, filters.sortOrder);

        // Handle geographic filtering if latitude, longitude and radius are provided
        if (filters.latitude !== undefined && filters.longitude !== undefined && filters.radius !== undefined) {
            // Ensure latitude and longitude columns exist
            conditions.push(isNotNull(locations.latitude));
            conditions.push(isNotNull(locations.longitude));

            // Calculate distance using Haversine formula (approx. distance in km)
            // Note: This is a simplified version, for more accurate results consider PostGIS
            const lat = filters.latitude;
            const lng = filters.longitude;
            const radius = filters.radius;

            conditions.push(
                sql`(
                    6371 * acos(
                        cos(radians(${lat})) * 
                        cos(radians(${locations.latitude})) * 
                        cos(radians(${locations.longitude}) - radians(${lng})) + 
                        sin(radians(${lat})) * 
                        sin(radians(${locations.latitude}))
                    )
                ) <= ${radius}`
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const totalResult = await db
            .select({ count: count() })
            .from(locations)
            .where(whereClause);

        const total = totalResult[0]?.count ?? 0;

        // Get paginated locations
        const result = await db
            .select()
            .from(locations)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        return {
            locations: result,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Error getting all locations', { module: 'locations', error });
        throw error;
    }
};

/**
 * Get location by ID
 */
export const getLocationById = async (locationId: string): Promise<Location | null> => {
    try {
        const location = await db
            .select()
            .from(locations)
            .where(eq(locations.location_id, locationId))
            .limit(1);

        return location.length > 0 ? location[0] : null;
    } catch (error) {
        logger.error('Error getting location by ID', { module: 'locations', error, locationId });
        throw error;
    }
};

/**
 * Create a new location
 */
export const createLocation = async (data: CreateLocationData): Promise<Location> => {
    try {
        // Check if location with same name and address already exists
        const existingLocation = await db
            .select()
            .from(locations)
            .where(
                and(
                    eq(locations.name, data.name),
                    eq(locations.address, data.address)
                )
            )
            .limit(1);

        if (existingLocation.length > 0) {
            throw ErrorFactory.conflict('Location with same name and address already exists');
        }

        // Prepare location data
        const locationData: NewLocation = {
            name: data.name,
            address: data.address,
            contact_phone: data.contact_phone,
            city: data.city,
            state: data.state,
            country: data.country,
            postal_code: data.postal_code,
            email: data.email,
            latitude: data.latitude !== undefined ? data.latitude as any : undefined, // Type coercion due to decimal schema
            longitude: data.longitude !== undefined ? data.longitude as any : undefined, // Type coercion due to decimal schema
            operating_hours: data.operating_hours
        };

        // Insert location
        const result = await db
            .insert(locations)
            .values(locationData)
            .returning();

        return result[0];
    } catch (error) {
        logger.error('Error creating location', { module: 'locations', error });
        throw error;
    }
};

/**
 * Update an existing location
 */
export const updateLocation = async (locationId: string, data: UpdateLocationData): Promise<Location> => {
    try {
        // Check if location exists
        const existingLocation = await getLocationById(locationId);
        if (!existingLocation) {
            throw ErrorFactory.notFound('Location not found');
        }

        // Check for duplicate name/address if provided
        if (data.name || data.address) {
            const checkName = data.name || existingLocation.name;
            const checkAddress = data.address || existingLocation.address;

            const duplicateLocation = await db
                .select()
                .from(locations)
                .where(
                    and(
                        eq(locations.name, checkName),
                        eq(locations.address, checkAddress),
                        sql`${locations.location_id} != ${locationId}` // Exclude current location
                    )
                )
                .limit(1);

            if (duplicateLocation.length > 0) {
                throw ErrorFactory.conflict('Location with same name and address already exists');
            }
        }

        // Prepare update data
        const updateData: Partial<Location> = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.contact_phone !== undefined) updateData.contact_phone = data.contact_phone;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.state !== undefined) updateData.state = data.state;
        if (data.country !== undefined) updateData.country = data.country;
        if (data.postal_code !== undefined) updateData.postal_code = data.postal_code;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.latitude !== undefined) updateData.latitude = data.latitude as any; // Type coercion due to decimal schema
        if (data.longitude !== undefined) updateData.longitude = data.longitude as any; // Type coercion due to decimal schema
        if (data.operating_hours !== undefined) updateData.operating_hours = data.operating_hours;

        updateData.updated_at = new Date();

        // Update location
        const result = await db
            .update(locations)
            .set(updateData)
            .where(eq(locations.location_id, locationId))
            .returning();

        return result[0];
    } catch (error) {
        logger.error('Error updating location', { module: 'locations', error, locationId });
        throw error;
    }
};

/**
 * Delete a location
 */
export const deleteLocation = async (locationId: string): Promise<boolean> => {
    try {
        // Check if location exists
        const existingLocation = await getLocationById(locationId);
        if (!existingLocation) {
            throw ErrorFactory.notFound('Location not found');
        }

        // Check if location has associated bookings
        const locationBookings = await db
            .select()
            .from(bookings)
            .where(eq(bookings.location_id, locationId))
            .limit(1);

        if (locationBookings.length > 0) {
            throw ErrorFactory.conflict('Cannot delete location with associated bookings');
        }

        // Delete location
        await db
            .delete(locations)
            .where(eq(locations.location_id, locationId));

        return true;
    } catch (error) {
        logger.error('Error deleting location', { module: 'locations', error, locationId });
        throw error;
    }
};

/**
 * Get popular locations from various sources
 */
export const getPopularLocations = async (
    limit = 10,
    source = 'database'
): Promise<PopularLocation[]> => {
    try {
        switch (source) {
            case 'database':
                return await getPopularLocationsFromDatabase(limit);
            case 'kenyan':
                return await getPopularKenyanLocations(limit);
            case 'external':
            case 'api':
                return await getPopularExternalLocations(limit);
            default:
                return await getPopularLocationsFromDatabase(limit);
        }
    } catch (error) {
        logger.error('Error getting popular locations', { module: 'locations', error, source });
        throw error;
    }
};

/**
 * Get popular locations from database based on booking stats
 */
const getPopularLocationsFromDatabase = async (limit: number): Promise<PopularLocation[]> => {
    try {
        const popularLocations = await db
            .select({
                id: locations.location_id,
                name: locations.name,
                address: locations.address,
                booking_count: count(bookings.booking_id),
            })
            .from(locations)
            .leftJoin(bookings as any, eq(locations.location_id, bookings.location_id))
            .groupBy(locations.location_id, locations.name, locations.address)
            .orderBy(desc(sql`count(${bookings.booking_id})`))
            .limit(limit);

        return popularLocations.map((loc: any) => ({
            id: parseInt(loc.id),
            name: loc.name,
            address: loc.address || '',
            description: `Popular location with ${loc.booking_count} bookings`,
            type: 'database'
        }));
    } catch (error) {
        logger.error('Error getting popular locations from database', { module: 'locations', error });
        return [];
    }
};

/**
 * Get popular Kenyan locations (mock data for now)
 */
const getPopularKenyanLocations = async (limit: number): Promise<PopularLocation[]> => {
    const kenyanLocations: PopularLocation[] = [
        {
            id: 1,
            name: "Nairobi CBD",
            address: "Central Business District, Nairobi",
            description: "The heart of Kenya's capital city",
            type: "city_center",
            region: "Nairobi"
        },
        {
            id: 2,
            name: "Westlands",
            address: "Westlands, Nairobi",
            description: "Modern business and entertainment hub",
            type: "business_district",
            region: "Nairobi"
        },
        {
            id: 3,
            name: "Karen",
            address: "Karen, Nairobi",
            description: "Upmarket residential area",
            type: "residential",
            region: "Nairobi"
        },
        {
            id: 4,
            name: "Mombasa Old Town",
            address: "Old Town, Mombasa",
            description: "Historic coastal area",
            type: "historic",
            region: "Mombasa"
        },
        {
            id: 5,
            name: "Kisumu Port",
            address: "Port Area, Kisumu",
            description: "Lake Victoria port city",
            type: "port",
            region: "Kisumu"
        },
        {
            id: 6,
            name: "Nakuru Town",
            address: "Town Center, Nakuru",
            description: "Rift Valley commercial center",
            type: "town_center",
            region: "Nakuru"
        },
        {
            id: 7,
            name: "Eldoret Airport",
            address: "Airport Road, Eldoret",
            description: "Regional aviation hub",
            type: "airport",
            region: "Eldoret"
        },
        {
            id: 8,
            name: "Nyeri Town",
            address: "Town Center, Nyeri",
            description: "Central Kenya commercial town",
            type: "town_center",
            region: "Nyeri"
        }
    ];

    return kenyanLocations.slice(0, limit);
};

/**
 * Get popular locations from external API (mock for now)
 */
const getPopularExternalLocations = async (limit: number): Promise<PopularLocation[]> => {
    const externalLocations: PopularLocation[] = [
        {
            id: 10,
            name: "JKIA Terminal 1",
            address: "Jomo Kenyatta International Airport, Nairobi",
            description: "Main international airport terminal",
            type: "airport",
            coordinates: { latitude: -1.3192, longitude: 36.9278 }
        },
        {
            id: 11,
            name: "Two Rivers Mall",
            address: "Limuru Road, Runda, Nairobi",
            description: "Premier shopping destination",
            type: "shopping_mall",
            coordinates: { latitude: -1.2084, longitude: 36.7885 }
        },
        {
            id: 12,
            name: "Uhuru Park",
            address: "Uhuru Highway, Nairobi",
            description: "Central recreational park",
            type: "park",
            coordinates: { latitude: -1.2921, longitude: 36.8219 }
        },
        {
            id: 13,
            name: "Village Market",
            address: "Limuru Road, Gigiri, Nairobi",
            description: "Shopping and entertainment complex",
            type: "shopping_center",
            coordinates: { latitude: -1.2373, longitude: 36.7644 }
        },
        {
            id: 14,
            name: "Sarit Centre",
            address: "Westlands, Nairobi",
            description: "Popular shopping center",
            type: "shopping_center",
            coordinates: { latitude: -1.2634, longitude: 36.8046 }
        }
    ];

    return externalLocations.slice(0, limit);
};

/**
 * Get popular locations with IDs for admin selection
 */
export const getPopularLocationsWithIds = async (
    limit = 10,
    source = 'external'
): Promise<PopularLocation[]> => {
    return await getPopularLocations(limit, source);
};

/**
 * Create location from popular API selection
 */
export const createLocationFromPopular = async (
    locationId: number,
    source: string
): Promise<Location> => {
    try {
        // Get the popular location data
        const popularLocations = await getPopularLocations(50, source);
        const selectedLocation = popularLocations.find(loc => loc.id === locationId);

        if (!selectedLocation) {
            throw ErrorFactory.notFound('Popular location not found');
        }

        // Create location from popular data
        const locationData: CreateLocationData = {
            name: selectedLocation.name,
            address: selectedLocation.address || selectedLocation.description || '',
            contact_phone: undefined // Popular locations don't have phone numbers
        };

        return await createLocation(locationData);
    } catch (error) {
        logger.error('Error creating location from popular', {
            module: 'locations',
            error,
            locationId,
            source
        });
        throw error;
    }
};

/**
 * Get location statistics
 */
/**
 * Search locations by query string
 */
export const searchLocations = async (query: string, limit = 10): Promise<Location[]> => {
    try {
        const result = await db
            .select()
            .from(locations)
            .where(
                or(
                    ilike(locations.name, `%${query}%`),
                    ilike(locations.address, `%${query}%`),
                    ilike(locations.city, `%${query}%`),
                    ilike(locations.country, `%${query}%`)
                )
            )
            .limit(limit);

        return result;
    } catch (error) {
        logger.error('Error searching locations', { module: 'locations', error, query });
        throw error;
    }
};

/**
 * Get vehicles by location ID
 */
export const getVehiclesByLocation = async (
    locationId: string,
    page = 1,
    limit = 10
): Promise<{
    vehicles: any[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}> => {
    try {
        // Check if location exists
        const location = await getLocationById(locationId);
        if (!location) {
            throw ErrorFactory.notFound('Location not found');
        }

        const offset = (page - 1) * limit;

        // Get total count of vehicles at this location
        const totalResult = await db
            .select({ count: count() })
            .from(vehicles)
            .where(eq(vehicles.location_id, locationId));

        const total = totalResult[0]?.count ?? 0;

        // Get paginated vehicles with their specifications
        const result = await db
            .select({
                vehicle_id: vehicles.vehicle_id,
                license_plate: vehicles.license_plate,
                rental_rate: vehicles.rental_rate,
                status: vehicles.status,
                manufacturer: vehicleSpecifications.manufacturer,
                model: vehicleSpecifications.model,
                year: vehicleSpecifications.year,
                fuel_type: vehicleSpecifications.fuel_type,
                transmission: vehicleSpecifications.transmission,
                seating_capacity: vehicleSpecifications.seating_capacity,
                color: vehicleSpecifications.color,
                features: vehicleSpecifications.features,
                vehicle_category: vehicleSpecifications.vehicle_category,
                mileage: vehicles.mileage,
                fuel_level: vehicles.fuel_level,
                availability: vehicles.availability,
                condition_rating: vehicles.condition_rating,
                created_at: vehicles.created_at,
                updated_at: vehicles.updated_at
            })
            .from(vehicles)
            .innerJoin(vehicleSpecifications, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .where(eq(vehicles.location_id, locationId))
            .limit(limit)
            .offset(offset);

        return {
            vehicles: result,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error('Error getting vehicles by location', { module: 'locations', error, locationId });
        throw error;
    }
};

/**
 * Get location availability (vehicles available at the location)
 */
export const getLocationAvailability = async (
    locationId: string,
    startDate: Date,
    endDate: Date
): Promise<{
    location: Location;
    available_vehicles: number;
    total_vehicles: number;
    availability_percentage: number;
    date_range: {
        start_date: Date;
        end_date: Date;
    };
}> => {
    try {
        // Check if location exists
        const location = await getLocationById(locationId);
        if (!location) {
            throw ErrorFactory.notFound('Location not found');
        }

        // Count total vehicles at the location
        const totalVehiclesResult = await db
            .select({ count: count() })
            .from(vehicles)
            .where(eq(vehicles.location_id, locationId));

        const totalVehicles = totalVehiclesResult[0]?.count ?? 0;

        // Count available vehicles (not in active bookings during the date range)
        const availableVehiclesResult = await db
            .select({ count: count() })
            .from(vehicles)
            .where(
                and(
                    eq(vehicles.location_id, locationId),
                    eq(vehicles.availability, true),
                    or(
                        eq(vehicles.status, 'available'),
                        eq(vehicles.status, 'reserved')
                    ),
                    sql`${vehicles.vehicle_id} NOT IN (
                        SELECT ${bookings.vehicle_id}
                        FROM ${bookings}
                        WHERE ${bookings.booking_status} IN ('confirmed', 'active')
                        AND (
                            (${bookings.booking_date} <= ${endDate} AND ${bookings.return_date} >= ${startDate})
                        )
                    )`
                )
            );

        const availableVehicles = availableVehiclesResult[0]?.count ?? 0;
        const availabilityPercentage = totalVehicles > 0 ? (availableVehicles / totalVehicles) * 100 : 0;

        return {
            location,
            available_vehicles: availableVehicles,
            total_vehicles: totalVehicles,
            availability_percentage: parseFloat(availabilityPercentage.toFixed(2)),
            date_range: {
                start_date: startDate,
                end_date: endDate
            }
        };
    } catch (error) {
        logger.error('Error getting location availability', { module: 'locations', error, locationId });
        throw error;
    }
};

export const getLocationStatistics = async (): Promise<LocationStatistics> => {
    try {
        // Get total locations
        const totalResult = await db
            .select({ count: count() })
            .from(locations);

        const total_locations = totalResult[0]?.count ?? 0;

        // Get most popular locations based on pickup bookings
        const popularLocationsResult = await db
            .select({
                location_id: locations.location_id,
                name: locations.name,
                booking_count: count(bookings.booking_id),
            })
            .from(locations)
            .leftJoin(bookings as any, eq(locations.location_id, bookings.location_id))
            .groupBy(locations.location_id, locations.name)
            .orderBy(desc(sql`count(${bookings.booking_id})`))
            .limit(5);

        const most_popular_locations = popularLocationsResult.map((item: any) => ({
            location_id: item.location_id,
            name: item.name,
            booking_count: Number(item.booking_count) || 0,
        }));

        // Get location usage statistics
        const locationUsageResult = await db
            .select({
                location_id: locations.location_id,
                name: locations.name,
                total_bookings: count(bookings.booking_id),
                active_bookings: sql<number>`count(case when ${bookings.booking_status} = 'confirmed' then 1 end)`,
            })
            .from(locations)
            .leftJoin(bookings as any, eq(locations.location_id, bookings.location_id))
            .groupBy(locations.location_id, locations.name)
            .orderBy(desc(sql`count(${bookings.booking_id})`));

        const location_usage = locationUsageResult.map((item: any) => ({
            location_id: item.location_id,
            name: item.name,
            total_bookings: Number(item.total_bookings) || 0,
            active_bookings: Number(item.active_bookings) || 0,
        }));

        return {
            total_locations,
            most_popular_locations,
            location_usage,
        };
    } catch (error) {
        logger.error('Error getting location statistics', { module: 'locations', error });
        throw error;
    }
};
