import bookingService from "./booking.service";
import { logger } from "../middleware/logger";
import { ErrorFactory } from "../middleware/appError";
import { ResponseUtil } from "../middleware/response";
import { Request, Response, NextFunction } from "express";
import { DecodedToken } from "../middleware/bearAuth";

// Use DecodedToken from auth middleware (userId is string/UUID)
type ReqWithUser = Request & { user?: DecodedToken };

export const getAllBookingsHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "created_at",
            sortOrder = "desc",
            search,
            user_id,
            vehicle_id,
            location_id,
            booking_status,
            date_from,
            date_to,
            min_amount,
            max_amount,
        } = req.query as Record<string, any>;

        // Validate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return next(ErrorFactory.badRequest("Invalid pagination parameters. Page must be >= 1, limit must be 1-100.", "pagination"));
        }

        const filters = {
            search: search,
            user_id: user_id,
            vehicle_id: vehicle_id,
            location_id: location_id,
            booking_status: booking_status,
            date_from: date_from ? new Date(date_from) : undefined,
            date_to: date_to ? new Date(date_to) : undefined,
            min_amount: min_amount ? parseFloat(min_amount) : undefined,
            max_amount: max_amount ? parseFloat(max_amount) : undefined,
        };

        // Validate date filters
        if (filters.date_from && isNaN(filters.date_from.getTime())) {
            return next(ErrorFactory.badRequest("Invalid date_from format", "validation"));
        }
        if (filters.date_to && isNaN(filters.date_to.getTime())) {
            return next(ErrorFactory.badRequest("Invalid date_to format", "validation"));
        }

        logger.info("Admin retrieving all bookings", {
            userId: req.user?.userId,
            email: req.user?.email,
            filters: {
                ...filters,
                search: filters.search ? "[REDACTED]" : undefined,
            },
            pagination: { page: pageNum, limit: limitNum },
        });

        const result = await bookingService.getAllBookings(pageNum, limitNum, sortBy, sortOrder, filters);

        logger.info("Bookings retrieved successfully", {
            userId: req.user?.userId,
            total: result.total,
            count: result.bookings.length,
        });

        ResponseUtil.success(res, result, "Bookings retrieved successfully");
    } catch (error) {
        logger.error("Error retrieving all bookings", {
            userId: req.user?.userId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const getUserBookingsHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc", booking_status } = req.query as Record<
            string,
            any
        >;
        const userId = req.user?.userId;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }
        // Validate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return next(ErrorFactory.badRequest("Invalid pagination parameters. Page must be >= 1, limit must be 1-100.", "pagination"));
        }
        const filters = {
            user_id: userId,
            booking_status: booking_status,
        };
        logger.info("User retrieving their bookings", {
            userId,
            filters,
            pagination: { page: pageNum, limit: limitNum },
        });
        const result = await bookingService.getAllBookings(pageNum, limitNum, sortBy, sortOrder, filters);
        ResponseUtil.success(res, result, "User bookings retrieved successfully");
    } catch (error) {
        logger.error("Error retrieving user bookings", {
            userId: req.user?.userId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const getBookingByIdHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }
        logger.info("Retrieving booking by ID", {
            userId,
            bookingId: id,
            userRole,
        });
        const booking = await bookingService.getBookingById(id);
        if (!booking) {
            return next(ErrorFactory.notFound("Booking not found"));
        }
        // Check ownership for non-admin users
        if (userRole !== "admin" && booking.user_id !== userId) {
            return next(ErrorFactory.forbidden("Access denied to this booking"));
        }
        ResponseUtil.success(res, booking, "Booking retrieved successfully");
    } catch (error) {
        logger.error("Error retrieving booking by ID", {
            userId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const createBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }
        const bookingData = {
            ...req.body,
            user_id: userId, // Ensure booking is associated with authenticated user
        };
        // Validate required fields
        if (!bookingData.vehicle_id || !bookingData.location_id || !bookingData.booking_date || !bookingData.return_date) {
            return next(
                ErrorFactory.badRequest("Missing required fields: vehicle_id, location_id, booking_date, return_date", "validation"),
            );
        }
        // Validate dates
        const bookingDate = new Date(bookingData.booking_date);
        const returnDate = new Date(bookingData.return_date);
        if (isNaN(bookingDate.getTime()) || isNaN(returnDate.getTime())) {
            return next(ErrorFactory.badRequest("Invalid date format", "validation"));
        }
        if (returnDate <= bookingDate) {
            return next(ErrorFactory.badRequest("Return date must be after booking date", "validation"));
        }
        if (bookingDate < new Date()) {
            return next(ErrorFactory.badRequest("Booking date cannot be in the past", "validation"));
        }
        logger.info("Creating new booking", {
            userId,
            vehicleId: bookingData.vehicle_id,
            locationId: bookingData.location_id,
            bookingDate: bookingDate.toISOString(),
            returnDate: returnDate.toISOString(),
        });
        const newBooking = await bookingService.createBooking(bookingData);
        logger.info("Booking created successfully", {
            userId,
            bookingId: newBooking.booking_id,
            totalAmount: newBooking.total_amount,
        });
        ResponseUtil.created(res, newBooking, "Booking created successfully");
    } catch (error) {
        logger.error("Error creating booking", {
            userId: req.user?.userId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const updateBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }
        // Check if booking exists and user has permission
        const existingBooking = await bookingService.getBookingById(id);
        if (!existingBooking) {
            return next(ErrorFactory.notFound("Booking not found"));
        }
        if (userRole !== "admin" && existingBooking.user_id !== userId) {
            return next(ErrorFactory.forbidden("Access denied to this booking"));
        }
        // Prevent updating completed or cancelled bookings (unless admin)
        if (userRole !== "admin" && ["completed", "cancelled"].includes(existingBooking.booking_status)) {
            return next(ErrorFactory.badRequest("Cannot update completed or cancelled bookings", "business_rule"));
        }
        // Validate date updates if provided
        if (req.body.booking_date || req.body.return_date) {
            const bookingDate = req.body.booking_date ? new Date(req.body.booking_date) : new Date(existingBooking.booking_date);
            const returnDate = req.body.return_date ? new Date(req.body.return_date) : new Date(existingBooking.return_date);
            if (isNaN(bookingDate.getTime()) || isNaN(returnDate.getTime())) {
                return next(ErrorFactory.badRequest("Invalid date format", "validation"));
            }
            if (returnDate <= bookingDate) {
                return next(ErrorFactory.badRequest("Return date must be after booking date", "validation"));
            }
        }
        logger.info("Updating booking", {
            userId,
            bookingId: id,
            userRole,
            updateFields: Object.keys(req.body),
        });
        const updatedBooking = await bookingService.updateBooking(id, req.body);
        logger.info("Booking updated successfully", {
            userId,
            bookingId: id,
        });
        ResponseUtil.success(res, updatedBooking, "Booking updated successfully");
    } catch (error) {
        logger.error("Error updating booking", {
            userId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const cancelBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }
        // Check if booking exists and user has permission
        const existingBooking = await bookingService.getBookingById(id);
        if (!existingBooking) {
            return next(ErrorFactory.notFound("Booking not found"));
        }
        if (userRole !== "admin" && existingBooking.user_id !== userId) {
            return next(ErrorFactory.forbidden("Access denied to this booking"));
        }
        if (existingBooking.booking_status === "cancelled") {
            return next(ErrorFactory.badRequest("Booking is already cancelled", "business_rule"));
        }
        if (existingBooking.booking_status === "completed") {
            return next(ErrorFactory.badRequest("Cannot cancel completed booking", "business_rule"));
        }
        logger.info("Cancelling booking", {
            userId,
            bookingId: id,
            userRole,
            currentStatus: existingBooking.booking_status,
        });
        const cancelledBooking = await bookingService.cancelBooking(id);
        logger.info("Booking cancelled successfully", {
            userId,
            bookingId: id,
        });
        ResponseUtil.success(res, cancelledBooking, "Booking cancelled successfully");
    } catch (error) {
        logger.error("Error cancelling booking", {
            userId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const getBookingStatisticsHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId || userRole !== "admin") {
            return next(ErrorFactory.forbidden("Admin access required"));
        }
        logger.info("Admin retrieving booking statistics", {
            userId,
        });
        const stats = await bookingService.getBookingStatistics();
        ResponseUtil.success(res, stats, "Booking statistics retrieved successfully");
    } catch (error) {
        logger.error("Error retrieving booking statistics", {
            userId: req.user?.userId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const getUpcomingBookingsHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }
        const { limit = 5 } = req.query as Record<string, any>;
        const limitNum = parseInt(limit);
        if (limitNum < 1 || limitNum > 50) {
            return next(ErrorFactory.badRequest("Limit must be between 1 and 50", "validation"));
        }
        logger.info("User retrieving upcoming bookings", {
            userId,
            limit: limitNum,
        });
        const upcomingBookings = await bookingService.getUpcomingBookings(userId, limitNum);
        ResponseUtil.success(res, upcomingBookings, "Upcoming bookings retrieved successfully");
    } catch (error) {
        logger.error("Error retrieving upcoming bookings", {
            userId: req.user?.userId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const confirmBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId || userRole !== "admin") {
            return next(ErrorFactory.forbidden("Admin access required"));
        }
        const existingBooking = await bookingService.getBookingById(id);
        if (!existingBooking) {
            return next(ErrorFactory.notFound("Booking not found"));
        }
        if (existingBooking.booking_status !== "pending") {
            return next(ErrorFactory.badRequest("Only pending bookings can be confirmed", "business_rule"));
        }
        logger.info("Admin confirming booking", {
            userId,
            bookingId: id,
        });
        const confirmedBooking = await bookingService.confirmBooking(id);
        logger.info("Booking confirmed successfully", {
            userId,
            bookingId: id,
        });
        ResponseUtil.success(res, confirmedBooking, "Booking confirmed successfully");
    } catch (error) {
        logger.error("Error confirming booking", {
            userId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

export const completeBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId || userRole !== "admin") {
            return next(ErrorFactory.forbidden("Admin access required"));
        }
        const existingBooking = await bookingService.getBookingById(id);
        if (!existingBooking) {
            return next(ErrorFactory.notFound("Booking not found"));
        }
        if (existingBooking.booking_status !== "confirmed") {
            return next(ErrorFactory.badRequest("Only confirmed bookings can be completed", "business_rule"));
        }
        logger.info("Admin completing booking", {
            userId,
            bookingId: id,
        });
        const completedBooking = await bookingService.completeBooking(id);
        logger.info("Booking completed successfully", {
            userId,
            bookingId: id,
        });
        ResponseUtil.success(res, completedBooking, "Booking completed successfully");
    } catch (error) {
        logger.error("Error completing booking", {
            userId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

/**
 * Check vehicle availability for booking
 */
export const checkAvailabilityHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicle_id, booking_date_from, booking_date_to, location_id } = req.query;

        // Validate required parameters
        if (!vehicle_id || !booking_date_from || !booking_date_to) {
            return next(ErrorFactory.badRequest("Vehicle ID, booking start date, and end date are required", "query"));
        }

        const dateFrom = new Date(booking_date_from as string);
        const dateTo = new Date(booking_date_to as string);

        // Validate dates
        if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
            return next(ErrorFactory.badRequest("Invalid date format", "dates"));
        }

        if (dateFrom >= dateTo) {
            return next(ErrorFactory.badRequest("End date must be after start date", "dates"));
        }

        if (dateFrom < new Date()) {
            return next(ErrorFactory.badRequest("Start date cannot be in the past", "dates"));
        }

        const availability = await bookingService.checkAvailability({
            vehicle_id: vehicle_id as string,
            booking_date_from: dateFrom,
            booking_date_to: dateTo,
            location_id: location_id as string
        });

        logger.info("Vehicle availability checked", {
            vehicle_id,
            dateFrom,
            dateTo,
            available: availability.available
        });

        ResponseUtil.success(res, availability, "Availability checked successfully");
    } catch (error) {
        logger.error("Error checking availability", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

/**
 * Admin update booking (includes status changes)
 */
export const adminUpdateBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const bookingId = id; // Keep as string for UUID

        const userId = req.user?.userId;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }

        // Admin can update any booking field including status
        const updatedBooking = await bookingService.adminUpdateBooking(bookingId, req.body, userId);

        logger.info("Booking updated by admin", {
            adminId: userId,
            bookingId,
            updateData: req.body
        });

        ResponseUtil.success(res, updatedBooking, "Booking updated successfully");
    } catch (error) {
        logger.error("Error updating booking (admin)", {
            adminId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

/**
 * Delete booking (admin only)
 */
export const deleteBookingHandler = async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const bookingId = id; // Keep as string for UUID

        const userId = req.user?.userId;
        if (!userId) {
            return next(ErrorFactory.unauthorized("User not authenticated"));
        }

        await bookingService.deleteBooking(bookingId, userId);

        logger.info("Booking deleted", {
            adminId: userId,
            bookingId
        });

        ResponseUtil.success(res, null, "Booking deleted successfully");
    } catch (error) {
        logger.error("Error deleting booking", {
            adminId: req.user?.userId,
            bookingId: req.params.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        next(error);
    }
};

const bookingController = {
    getAllBookingsHandler,
    getUserBookingsHandler,
    getBookingByIdHandler,
    createBookingHandler,
    updateBookingHandler,
    cancelBookingHandler,
    getBookingStatisticsHandler,
    getUpcomingBookingsHandler,
    confirmBookingHandler,
    completeBookingHandler,
    checkAvailabilityHandler,
    adminUpdateBookingHandler,
    deleteBookingHandler,
};

export default bookingController;