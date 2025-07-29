import db from "../drizzle/db";
import { bookings, users, vehicles, vehicleSpecifications, locations, payments } from "../drizzle/schema";
import { eq, and, or, gte, lte, like, asc, desc, count, sql } from "drizzle-orm";
import { logger } from "../middleware/logger";
import { ErrorFactory } from "../middleware/appError";

// Types
interface BookingFilters {
    search?: string;
    user_id?: string;
    vehicle_id?: string;
    location_id?: string;
    booking_status?: string;
    date_from?: Date;
    date_to?: Date;
    min_amount?: number;
    max_amount?: number;
}

interface CreateBookingData {
    user_id: string;
    vehicle_id: string;
    location_id: string;
    booking_date: string | Date;
    return_date: string | Date;
    booking_status?: string;
}

interface UpdateBookingData {
    vehicle_id?: string;
    location_id?: string;
    booking_date?: string | Date;
    return_date?: string | Date;
    booking_status?: string;
}

interface BookingStatistics {
    total_bookings: number;
    monthly_bookings: number;
    monthly_revenue: number;
    bookings_by_status: Record<string, number>;
}

/**
 * Get all bookings with filtering and pagination
 */
export const getAllBookings = async (
    page: number = 1,
    limit: number = 10,
    sortBy: string = "created_at",
    sortOrder: string = "desc",
    filters: BookingFilters = {}
) => {
    try {
        logger.info("Retrieving all bookings", {
            module: "bookings",
            page,
            limit,
            sortBy,
            sortOrder,
            filters,
        });

        // Build filter conditions
        const conditions = [];

        if (filters.user_id) {
            conditions.push(eq(bookings.user_id, filters.user_id));
        }
        if (filters.vehicle_id) {
            conditions.push(eq(bookings.vehicle_id, filters.vehicle_id));
        }
        if (filters.location_id) {
            conditions.push(eq(bookings.location_id, filters.location_id));
        }
        if (filters.booking_status) {
            conditions.push(eq(bookings.booking_status, filters.booking_status as any));
        }

        if (filters.date_from && filters.date_to) {
            conditions.push(
                and(gte(bookings.booking_date, filters.date_from), lte(bookings.return_date, filters.date_to))
            );
        } else {
            if (filters.date_from) {
                conditions.push(gte(bookings.booking_date, filters.date_from));
            }
            if (filters.date_to) {
                conditions.push(lte(bookings.return_date, filters.date_to));
            }
        }

        if (filters.min_amount) {
            conditions.push(gte(bookings.total_amount, filters.min_amount.toString()));
        }
        if (filters.max_amount) {
            conditions.push(lte(bookings.total_amount, filters.max_amount.toString()));
        }

        if (filters.search) {
            conditions.push(
                or(
                    like(users.firstname, `%${filters.search}%`),
                    like(users.lastname, `%${filters.search}%`),
                    like(users.email, `%${filters.search}%`),
                    like(vehicleSpecifications.manufacturer, `%${filters.search}%`),
                    like(vehicleSpecifications.model, `%${filters.search}%`),
                    like(locations.name, `%${filters.search}%`)
                )
            );
        }

        // Determine sort column
        const sortColumn =
            sortBy === "user_name"
                ? sql`CONCAT(${users.firstname}, ' ', ${users.lastname})`
                : sortBy === "vehicle_name"
                    ? sql`CONCAT(${vehicleSpecifications.manufacturer}, ' ', ${vehicleSpecifications.model})`
                    : sortBy === "location_name"
                        ? locations.name
                        : (bookings as any)[sortBy] || bookings.created_at;

        // Build the main query
        let query = db
            .select({
                booking_id: bookings.booking_id,
                user_id: bookings.user_id,
                vehicle_id: bookings.vehicle_id,
                location_id: bookings.location_id,
                booking_date: bookings.booking_date,
                return_date: bookings.return_date,
                total_amount: bookings.total_amount,
                booking_status: bookings.booking_status,
                created_at: bookings.created_at,
                updated_at: bookings.updated_at,
                user_name: sql`CONCAT(${users.firstname}, ' ', ${users.lastname})`.as("user_name"),
                user_email: users.email,
                user_phone: users.contact_phone,
                vehicle_name: sql`CONCAT(${vehicleSpecifications.manufacturer}, ' ', ${vehicleSpecifications.model})`.as(
                    "vehicle_name"
                ),
                vehicle_license_plate: vehicles.license_plate,
                vehicle_availability: vehicles.availability,
                rental_rate: vehicles.rental_rate,
                location_name: locations.name,
                location_address: locations.address,
                location_phone: locations.contact_phone,
                payment_status: payments.payment_status,
                payment_amount: payments.amount,
                payment_method: payments.payment_method,
            })
            .from(bookings)
            .leftJoin(users as any, eq(bookings.user_id, users.user_id))
            .leftJoin(vehicles as any, eq(bookings.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .leftJoin(locations as any, eq(bookings.location_id, locations.location_id))
            .leftJoin(payments as any, eq(bookings.booking_id, payments.booking_id));

        // Apply WHERE conditions
        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
        }

        // Apply sorting
        if (sortOrder === "asc") {
            query = query.orderBy(asc(sortColumn)) as any;
        } else {
            query = query.orderBy(desc(sortColumn)) as any;
        }

        // Get total count
        let totalQuery = db
            .select({ count: count() })
            .from(bookings)
            .leftJoin(users as any, eq(bookings.user_id, users.user_id))
            .leftJoin(vehicles as any, eq(bookings.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .leftJoin(locations as any, eq(bookings.location_id, locations.location_id));

        if (conditions.length > 0) {
            totalQuery = totalQuery.where(and(...conditions)) as any;
        }

        const [totalResult] = await totalQuery;
        const total = totalResult.count;

        // Apply pagination
        const offset = (page - 1) * limit;
        const result = await query.limit(limit).offset(offset);

        const totalPages = Math.ceil(total / limit);

        logger.info("Bookings retrieved successfully", {
            module: "bookings",
            total,
            count: result.length,
            page,
            totalPages,
        });

        return {
            bookings: result,
            total,
            page,
            limit,
            totalPages,
        };
    } catch (error: any) {
        logger.error("Error retrieving bookings", {
            module: "bookings",
            error: error.message,
            page,
            limit,
            filters,
        });
        throw ErrorFactory.internal("Failed to retrieve bookings");
    }
};

/**
 * Get booking by ID with related data
 */
export const getBookingById = async (bookingId: string) => {
    try {
        logger.info("Retrieving booking by ID", { module: "bookings", bookingId });

        const result = await db
            .select({
                booking_id: bookings.booking_id,
                user_id: bookings.user_id,
                vehicle_id: bookings.vehicle_id,
                location_id: bookings.location_id,
                booking_date: bookings.booking_date,
                return_date: bookings.return_date,
                total_amount: bookings.total_amount,
                booking_status: bookings.booking_status,
                created_at: bookings.created_at,
                updated_at: bookings.updated_at,
                user_name: sql`CONCAT(${users.firstname}, ' ', ${users.lastname})`.as("user_name"),
                user_email: users.email,
                user_phone: users.contact_phone,
                vehicle_name: sql`CONCAT(${vehicleSpecifications.manufacturer}, ' ', ${vehicleSpecifications.model})`.as(
                    "vehicle_name"
                ),
                vehicle_license_plate: vehicles.license_plate,
                vehicle_availability: vehicles.availability,
                rental_rate: vehicles.rental_rate,
                location_name: locations.name,
                location_address: locations.address,
                location_phone: locations.contact_phone,
                payment_status: payments.payment_status,
                payment_amount: payments.amount,
                payment_method: payments.payment_method,
            })
            .from(bookings)
            .leftJoin(users as any, eq(bookings.user_id, users.user_id))
            .leftJoin(vehicles as any, eq(bookings.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .leftJoin(locations as any, eq(bookings.location_id, locations.location_id))
            .leftJoin(payments as any, eq(bookings.booking_id, payments.booking_id))
            .where(eq(bookings.booking_id, bookingId))
            .limit(1);

        if (result.length === 0) {
            logger.warn("Booking not found", { module: "bookings", bookingId });
            return null;
        }

        logger.info("Booking retrieved successfully", { module: "bookings", bookingId });
        return result[0];
    } catch (error: any) {
        logger.error("Error fetching booking by ID", {
            module: "bookings",
            error: error.message,
            bookingId,
        });
        throw ErrorFactory.internal("Failed to retrieve booking");
    }
};

/**
 * Create new booking
 */
export const createBooking = async (bookingData: CreateBookingData) => {
    try {
        logger.info("Creating new booking", {
            module: "bookings",
            userId: bookingData.user_id,
            vehicleId: bookingData.vehicle_id,
        });

        // Validate booking dates
        const bookingDate = new Date(bookingData.booking_date);
        const returnDate = new Date(bookingData.return_date);
        const now = new Date();

        if (bookingDate < now) {
            throw ErrorFactory.badRequest("Booking date cannot be in the past");
        }

        if (returnDate <= bookingDate) {
            throw ErrorFactory.badRequest("Return date must be after booking date");
        }

        // Check vehicle availability
        const vehicle = await db
            .select()
            .from(vehicles)
            .where(eq(vehicles.vehicle_id, bookingData.vehicle_id))
            .limit(1);

        if (vehicle.length === 0) {
            throw ErrorFactory.notFound("Vehicle not found");
        }

        if (!vehicle[0].availability) {
            throw ErrorFactory.badRequest("Vehicle is not available for booking");
        }

        // Check for conflicting bookings
        const conflictingBookings = await db
            .select()
            .from(bookings)
            .where(
                and(
                    eq(bookings.vehicle_id, bookingData.vehicle_id),
                    or(eq(bookings.booking_status, "pending"), eq(bookings.booking_status, "confirmed")),
                    or(
                        and(lte(bookings.booking_date, bookingDate), gte(bookings.return_date, bookingDate)),
                        and(lte(bookings.booking_date, returnDate), gte(bookings.return_date, returnDate)),
                        and(gte(bookings.booking_date, bookingDate), lte(bookings.return_date, returnDate))
                    )
                )
            );

        if (conflictingBookings.length > 0) {
            throw ErrorFactory.badRequest("Vehicle is already booked for the selected dates");
        }

        // Calculate total amount
        const days = Math.ceil((returnDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = parseFloat(vehicle[0].rental_rate);
        const totalAmount = (days * dailyRate).toFixed(2);

        const [newBooking] = await db
            .insert(bookings)
            .values({
                user_id: bookingData.user_id,
                vehicle_id: bookingData.vehicle_id,
                location_id: bookingData.location_id,
                booking_date: bookingDate,
                return_date: returnDate,
                total_amount: totalAmount,
                booking_status: (bookingData.booking_status || "pending") as any,
            })
            .returning();

        logger.info("Booking created successfully", {
            module: "bookings",
            bookingId: newBooking.booking_id,
            userId: bookingData.user_id,
        });

        return newBooking;
    } catch (error: any) {
        logger.error("Error creating booking", {
            module: "bookings",
            error: error.message,
            userId: bookingData.user_id,
            vehicleId: bookingData.vehicle_id,
        });
        throw error;
    }
};

/**
 * Update booking
 */
export const updateBooking = async (bookingId: string, updateData: UpdateBookingData) => {
    try {
        logger.info("Updating booking", { module: "bookings", bookingId, updateData });

        // Check if booking exists
        const existingBooking = await getBookingById(bookingId);
        if (!existingBooking) {
            throw ErrorFactory.notFound("Booking not found");
        }

        // Prevent updating completed or cancelled bookings
        if (existingBooking.booking_status === "completed" || existingBooking.booking_status === "cancelled") {
            throw ErrorFactory.badRequest("Cannot update completed or cancelled bookings");
        }

        const updateValues: any = {};

        if (updateData.vehicle_id) {
            updateValues.vehicle_id = updateData.vehicle_id;
        }
        if (updateData.location_id) {
            updateValues.location_id = updateData.location_id;
        }
        if (updateData.booking_date) {
            const bookingDate = new Date(updateData.booking_date);
            if (bookingDate < new Date()) {
                throw ErrorFactory.badRequest("Booking date cannot be in the past");
            }
            updateValues.booking_date = bookingDate;
        }
        if (updateData.return_date) {
            const returnDate = new Date(updateData.return_date);
            const bookingDate = updateValues.booking_date || existingBooking.booking_date;
            if (returnDate <= bookingDate) {
                throw ErrorFactory.badRequest("Return date must be after booking date");
            }
            updateValues.return_date = returnDate;
        }
        if (updateData.booking_status) {
            updateValues.booking_status = updateData.booking_status;
        }

        // Recalculate total amount if dates or vehicle changed
        if (updateValues.booking_date || updateValues.return_date || updateValues.vehicle_id) {
            const vehicleId = updateValues.vehicle_id || existingBooking.vehicle_id;
            const bookingDate = updateValues.booking_date || existingBooking.booking_date;
            const returnDate = updateValues.return_date || existingBooking.return_date;

            const vehicle = await db.select().from(vehicles).where(eq(vehicles.vehicle_id, vehicleId)).limit(1);

            if (vehicle.length > 0) {
                const days = Math.ceil(
                    (new Date(returnDate).getTime() - new Date(bookingDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                const dailyRate = parseFloat(vehicle[0].rental_rate);
                updateValues.total_amount = (days * dailyRate).toFixed(2);
            }
        }

        updateValues.updated_at = new Date();

        const [updatedBooking] = await db
            .update(bookings)
            .set(updateValues)
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        logger.info("Booking updated successfully", { module: "bookings", bookingId });
        return updatedBooking;
    } catch (error: any) {
        logger.error("Error updating booking", {
            module: "bookings",
            error: error.message,
            bookingId,
        });
        throw error;
    }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId: string) => {
    try {
        logger.info("Cancelling booking", { module: "bookings", bookingId });

        const existingBooking = await getBookingById(bookingId);
        if (!existingBooking) {
            throw ErrorFactory.notFound("Booking not found");
        }

        if (existingBooking.booking_status === "cancelled") {
            throw ErrorFactory.badRequest("Booking is already cancelled");
        }

        if (existingBooking.booking_status === "completed") {
            throw ErrorFactory.badRequest("Cannot cancel completed booking");
        }

        const [cancelledBooking] = await db
            .update(bookings)
            .set({
                booking_status: "cancelled" as any,
                updated_at: new Date(),
            })
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        logger.info("Booking cancelled successfully", { module: "bookings", bookingId });
        return cancelledBooking;
    } catch (error: any) {
        logger.error("Error cancelling booking", {
            module: "bookings",
            error: error.message,
            bookingId,
        });
        throw error;
    }
};

/**
 * Confirm booking
 */
export const confirmBooking = async (bookingId: string) => {
    try {
        logger.info("Confirming booking", { module: "bookings", bookingId });

        const existingBooking = await getBookingById(bookingId);
        if (!existingBooking) {
            throw ErrorFactory.notFound("Booking not found");
        }

        if (existingBooking.booking_status !== "pending") {
            throw ErrorFactory.badRequest("Only pending bookings can be confirmed");
        }

        const [confirmedBooking] = await db
            .update(bookings)
            .set({
                booking_status: "confirmed" as any,
                updated_at: new Date(),
            })
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        logger.info("Booking confirmed successfully", { module: "bookings", bookingId });
        return confirmedBooking;
    } catch (error: any) {
        logger.error("Error confirming booking", {
            module: "bookings",
            error: error.message,
            bookingId,
        });
        throw error;
    }
};

/**
 * Complete booking
 */
export const completeBooking = async (bookingId: string) => {
    try {
        logger.info("Completing booking", { module: "bookings", bookingId });

        const existingBooking = await getBookingById(bookingId);
        if (!existingBooking) {
            throw ErrorFactory.notFound("Booking not found");
        }

        if (existingBooking.booking_status !== "confirmed") {
            throw ErrorFactory.badRequest("Only confirmed bookings can be completed");
        }

        const [completedBooking] = await db
            .update(bookings)
            .set({
                booking_status: "completed" as any,
                updated_at: new Date(),
            })
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        logger.info("Booking completed successfully", { module: "bookings", bookingId });
        return completedBooking;
    } catch (error: any) {
        logger.error("Error completing booking", {
            module: "bookings",
            error: error.message,
            bookingId,
        });
        throw error;
    }
};

/**
 * Get upcoming bookings for a user
 */
export const getUpcomingBookings = async (userId: string, limit: number = 10) => {
    try {
        logger.info("Retrieving upcoming bookings", { module: "bookings", userId, limit });

        const today = new Date();

        const result = await db
            .select({
                booking_id: bookings.booking_id,
                user_id: bookings.user_id,
                vehicle_id: bookings.vehicle_id,
                location_id: bookings.location_id,
                booking_date: bookings.booking_date,
                return_date: bookings.return_date,
                total_amount: bookings.total_amount,
                booking_status: bookings.booking_status,
                created_at: bookings.created_at,
                updated_at: bookings.updated_at,
                user_name: sql`CONCAT(${users.firstname}, ' ', ${users.lastname})`.as("user_name"),
                user_email: users.email,
                user_phone: users.contact_phone,
                vehicle_name: sql`CONCAT(${vehicleSpecifications.manufacturer}, ' ', ${vehicleSpecifications.model})`.as(
                    "vehicle_name"
                ),
                vehicle_license_plate: vehicles.license_plate,
                vehicle_availability: vehicles.availability,
                rental_rate: vehicles.rental_rate,
                location_name: locations.name,
                location_address: locations.address,
                location_phone: locations.contact_phone,
                payment_status: payments.payment_status,
                payment_amount: payments.amount,
                payment_method: payments.payment_method,
            })
            .from(bookings)
            .leftJoin(users as any, eq(bookings.user_id, users.user_id))
            .leftJoin(vehicles as any, eq(bookings.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .leftJoin(locations as any, eq(bookings.location_id, locations.location_id))
            .leftJoin(payments as any, eq(bookings.booking_id, payments.booking_id))
            .where(
                and(
                    eq(bookings.user_id, userId),
                    gte(bookings.booking_date, today),
                    or(eq(bookings.booking_status, "pending"), eq(bookings.booking_status, "confirmed"))
                )
            )
            .orderBy(asc(bookings.booking_date))
            .limit(limit);

        logger.info("Upcoming bookings retrieved successfully", {
            module: "bookings",
            userId,
            count: result.length,
        });

        return result;
    } catch (error: any) {
        logger.error("Error retrieving upcoming bookings", {
            module: "bookings",
            error: error.message,
            userId,
        });
        throw ErrorFactory.internal("Failed to retrieve upcoming bookings");
    }
};

/**
 * Get booking statistics
 */
export const getBookingStatistics = async (): Promise<BookingStatistics> => {
    try {
        logger.info("Retrieving booking statistics", { module: "bookings" });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Total bookings
        const [totalBookingsResult] = await db.select({ count: count() }).from(bookings);

        // Bookings this month
        const [monthlyBookingsResult] = await db
            .select({ count: count() })
            .from(bookings)
            .where(gte(bookings.created_at, startOfMonth));

        // Bookings by status
        const statusStats = await db
            .select({
                status: bookings.booking_status,
                count: count(),
            })
            .from(bookings)
            .where(gte(bookings.created_at, startOfMonth))
            .groupBy(bookings.booking_status);

        // Monthly revenue
        const [monthlyRevenueResult] = await db
            .select({
                total_revenue: sql`SUM(${bookings.total_amount})`.as("total_revenue"),
            })
            .from(bookings)
            .where(and(gte(bookings.created_at, startOfMonth), eq(bookings.booking_status, "completed")));

        const statistics: BookingStatistics = {
            total_bookings: Number(totalBookingsResult.count) || 0,
            monthly_bookings: Number(monthlyBookingsResult.count) || 0,
            monthly_revenue: parseFloat((monthlyRevenueResult.total_revenue as string) || "0"),
            bookings_by_status: statusStats.reduce((acc: any, stat: any) => {
                acc[stat.status] = Number(stat.count);
                return acc;
            }, {} as Record<string, number>),
        };

        logger.info("Booking statistics retrieved successfully", {
            module: "bookings",
            statistics,
        });

        return statistics;
    } catch (error: any) {
        logger.error("Error retrieving booking statistics", {
            module: "bookings",
            error: error.message,
        });
        throw ErrorFactory.internal("Failed to retrieve booking statistics");
    }
};

/**
 * Check vehicle availability for booking
 */
export const checkAvailability = async (data: {
    vehicle_id: string;
    booking_date_from: Date;
    booking_date_to: Date;
    location_id?: string;
}) => {
    try {
        const { vehicle_id, booking_date_from, booking_date_to, location_id } = data;

        logger.info("Checking vehicle availability", {
            module: "bookings",
            vehicle_id,
            booking_date_from,
            booking_date_to,
            location_id
        });

        // Check if vehicle exists and is available
        const vehicleResult = await db
            .select({
                vehicle_id: vehicles.vehicle_id,
                availability: vehicles.availability,
                current_location_id: vehicles.location_id
            })
            .from(vehicles)
            .where(eq(vehicles.vehicle_id, vehicle_id))
            .limit(1);

        if (vehicleResult.length === 0) {
            return {
                available: false,
                reason: "Vehicle not found"
            };
        }

        const vehicle = vehicleResult[0];

        // Check if vehicle is available
        if (!vehicle.availability) {
            return {
                available: false,
                reason: `Vehicle is currently unavailable`
            };
        }

        // Check if vehicle is at the requested location (if specified)
        if (location_id && vehicle.current_location_id !== location_id) {
            return {
                available: false,
                reason: "Vehicle not available at requested location"
            };
        }

        // Check for conflicting bookings
        const conflictingBookings = await db
            .select({ booking_id: bookings.booking_id })
            .from(bookings)
            .where(
                and(
                    eq(bookings.vehicle_id, vehicle_id),
                    or(
                        eq(bookings.booking_status, 'confirmed'),
                        eq(bookings.booking_status, 'confirmed')
                    ),
                    or(
                        // New booking starts during existing booking
                        and(
                            lte(bookings.booking_date, booking_date_from),
                            gte(bookings.return_date, booking_date_from)
                        ),
                        // New booking ends during existing booking
                        and(
                            lte(bookings.booking_date, booking_date_to),
                            gte(bookings.return_date, booking_date_to)
                        ),
                        // New booking encompasses existing booking
                        and(
                            gte(bookings.booking_date, booking_date_from),
                            lte(bookings.return_date, booking_date_to)
                        )
                    )
                )
            );

        if (conflictingBookings.length > 0) {
            return {
                available: false,
                reason: "Vehicle is already booked for the requested period"
            };
        }

        logger.info("Vehicle availability check completed", {
            module: "bookings",
            vehicle_id,
            available: true
        });

        return {
            available: true,
            vehicle_id,
            booking_date_from,
            booking_date_to,
            location_id: vehicle.current_location_id
        };

    } catch (error: any) {
        logger.error("Error checking vehicle availability", {
            module: "bookings",
            error: error.message,
            vehicle_id: data.vehicle_id
        });
        throw ErrorFactory.internal("Failed to check vehicle availability");
    }
};

/**
 * Admin update booking (allows changing status and other fields)
 */
export const adminUpdateBooking = async (
    bookingId: string,
    updateData: Partial<UpdateBookingData> & { booking_status?: string },
    adminId: string
) => {
    try {
        logger.info("Admin updating booking", {
            module: "bookings",
            bookingId,
            adminId,
            updateData
        });

        // Check if booking exists
        const existingBooking = await db
            .select()
            .from(bookings)
            .where(eq(bookings.booking_id, bookingId))
            .limit(1);

        if (existingBooking.length === 0) {
            throw ErrorFactory.notFound("Booking");
        }

        const updateObject: any = {
            updated_at: new Date()
        };

        if (updateData.vehicle_id !== undefined) updateObject.vehicle_id = updateData.vehicle_id;
        if (updateData.location_id !== undefined) updateObject.location_id = updateData.location_id;
        if (updateData.booking_date !== undefined) updateObject.booking_date = new Date(updateData.booking_date);
        if (updateData.return_date !== undefined) updateObject.return_date = new Date(updateData.return_date);
        if (updateData.booking_status !== undefined) updateObject.booking_status = updateData.booking_status;

        // Update booking
        const updatedBooking = await db
            .update(bookings)
            .set(updateObject)
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        if (updatedBooking.length === 0) {
            throw ErrorFactory.internal("Failed to update booking");
        }

        logger.info("Booking updated successfully by admin", {
            module: "bookings",
            bookingId,
            adminId
        });

        return updatedBooking[0];

    } catch (error: any) {
        logger.error("Error updating booking (admin)", {
            module: "bookings",
            error: error.message,
            bookingId,
            adminId
        });
        if (error instanceof Error && error.message.includes("not found")) {
            throw error;
        }
        throw ErrorFactory.internal("Failed to update booking");
    }
};

/**
 * Delete booking (admin only)
 */
export const deleteBooking = async (bookingId: string, adminId: string) => {
    try {
        logger.info("Admin deleting booking", {
            module: "bookings",
            bookingId,
            adminId
        });

        // Check if booking exists
        const existingBooking = await db
            .select({
                booking_id: bookings.booking_id,
                booking_status: bookings.booking_status
            })
            .from(bookings)
            .where(eq(bookings.booking_id, bookingId))
            .limit(1);

        if (existingBooking.length === 0) {
            throw ErrorFactory.notFound("Booking");
        }

        // Check if booking can be deleted (only allow deletion of certain statuses)
        const booking = existingBooking[0];
        if (['confirmed', 'completed'].includes(booking.booking_status)) {
            throw ErrorFactory.badRequest("Cannot delete confirmed or completed bookings", "booking_status");
        }

        // Delete booking
        const deletedBooking = await db
            .delete(bookings)
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        if (deletedBooking.length === 0) {
            throw ErrorFactory.internal("Failed to delete booking");
        }

        logger.info("Booking deleted successfully", {
            module: "bookings",
            bookingId,
            adminId
        });

        return deletedBooking[0];

    } catch (error: any) {
        logger.error("Error deleting booking", {
            module: "bookings",
            error: error.message,
            bookingId,
            adminId
        });
        if (error instanceof Error && (error.message.includes("not found") || error.message.includes("Cannot delete"))) {
            throw error;
        }
        throw ErrorFactory.internal("Failed to delete booking");
    }
};

/**
 * Update booking status with new 'active' option
 */
export const updateBookingStatus = async (bookingId: string, status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled') => {
    try {
        logger.info("Updating booking status", {
            module: "bookings",
            booking_id: bookingId,
            new_status: status,
        });

        const updatedBooking = await db
            .update(bookings)
            .set({
                booking_status: status,
                updated_at: new Date()
            })
            .where(eq(bookings.booking_id, bookingId))
            .returning();

        if (!updatedBooking.length) {
            throw ErrorFactory.notFound('Booking not found');
        }

        logger.info("Booking status updated successfully", {
            module: "bookings",
            booking_id: bookingId,
            new_status: status,
        });

        return updatedBooking[0];
    } catch (error) {
        logger.error("Error updating booking status", {
            module: "bookings",
            error: error instanceof Error ? error.message : "Unknown error",
            booking_id: bookingId,
            status,
        });
        throw error;
    }
};

/**
 * Get active bookings (new status)
 */
export const getActiveBookings = async (userId?: string) => {
    try {
        logger.info("Retrieving active bookings", {
            module: "bookings",
            user_id: userId,
        });

        let query = db
            .select({
                booking_id: bookings.booking_id,
                user_id: bookings.user_id,
                vehicle_id: bookings.vehicle_id,
                location_id: bookings.location_id,
                booking_date: bookings.booking_date,
                return_date: bookings.return_date,
                total_amount: bookings.total_amount,
                booking_status: bookings.booking_status,
                created_at: bookings.created_at,
                updated_at: bookings.updated_at,
                // User details
                user_firstname: users.firstname,
                user_lastname: users.lastname,
                user_email: users.email,
                user_phone: users.contact_phone,
                // Vehicle details
                vehicle_rental_rate: vehicles.rental_rate,
                vehicle_license_plate: vehicles.license_plate,
                vehicle_manufacturer: vehicleSpecifications.manufacturer,
                vehicle_model: vehicleSpecifications.model,
                vehicle_year: vehicleSpecifications.year,
                vehicle_color: vehicleSpecifications.color,
                // Location details
                location_name: locations.name,
                location_address: locations.address,
                location_phone: locations.contact_phone,
            })
            .from(bookings)
            .leftJoin(users as any, eq(bookings.user_id, users.user_id))
            .leftJoin(vehicles as any, eq(bookings.vehicle_id, vehicles.vehicle_id))
            .leftJoin(vehicleSpecifications as any, eq(vehicles.vehicleSpec_id, vehicleSpecifications.vehicleSpec_id))
            .leftJoin(locations as any, eq(bookings.location_id, locations.location_id));

        // Build the where condition
        let whereCondition = eq(bookings.booking_status, 'active');

        if (userId) {
            whereCondition = and(
                eq(bookings.booking_status, 'active'),
                eq(bookings.user_id, userId)
            )!;
        }

        query = query.where(whereCondition) as any;

        const activeBookings = await query.orderBy(desc(bookings.created_at));

        logger.info("Active bookings retrieved successfully", {
            module: "bookings",
            count: activeBookings.length,
            user_id: userId,
        });

        return activeBookings;
    } catch (error) {
        logger.error("Error retrieving active bookings", {
            module: "bookings",
            error: error instanceof Error ? error.message : "Unknown error",
            user_id: userId,
        });
        throw ErrorFactory.internal("Failed to retrieve active bookings");
    }
};

const bookingService = {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    cancelBooking,
    confirmBooking,
    completeBooking,
    getUpcomingBookings,
    getBookingStatistics,
    checkAvailability,
    adminUpdateBooking,
    deleteBooking,
    updateBookingStatus,
    getActiveBookings,
};

export default bookingService;