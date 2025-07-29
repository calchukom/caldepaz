import { Router, Request } from "express";
import bookingController from "./booking.controller";
import { verifyToken } from "../middleware/bearAuth";
import { adminOnly } from "../middleware/adminOnly";
import validate from "../middleware/validate";
import {
    bookingRateLimiter,
    searchRateLimiter,
    apiRateLimiter,
    adminActionsRateLimiter
} from "../middleware/rateLimiter";
import {
    createBookingSchema,
    getBookingSchema,
    updateBookingSchema,
    cancelBookingSchema,
    getBookingsSchema,
} from "../validation/booking.validator";

const router = Router();

// Public routes
/**
 * @route GET /api/bookings/check-availability
 * @desc Check booking availability (Public)
 * @access Public
 */
router.get('/check-availability', searchRateLimiter, bookingController.checkAvailabilityHandler);

// Protected routes (User must be authenticated)
router.use(verifyToken);

// User routes
router.get("/my-bookings", apiRateLimiter, bookingController.getUserBookingsHandler);
router.post("/", bookingRateLimiter, validate(createBookingSchema), bookingController.createBookingHandler);
router.get("/:id", apiRateLimiter, validate(getBookingSchema), bookingController.getBookingByIdHandler);
router.put("/:id", bookingRateLimiter, validate(updateBookingSchema), bookingController.updateBookingHandler);
router.patch("/:id/cancel", bookingRateLimiter, validate(cancelBookingSchema), bookingController.cancelBookingHandler);

// Admin routes
/**
 * @route GET /api/bookings
 * @desc Get all bookings (Admin only)
 * @access Admin
 */
router.get("/", adminActionsRateLimiter, adminOnly, validate(getBookingsSchema), bookingController.getAllBookingsHandler);

/**
 * @route PUT /api/bookings/admin/:id
 * @desc Admin update booking
 * @access Admin
 */
router.put("/admin/:id", adminActionsRateLimiter, adminOnly, validate(updateBookingSchema), bookingController.adminUpdateBookingHandler);

/**
 * @route DELETE /api/bookings/:id
 * @desc Delete booking (Admin only)
 * @access Admin
 */
router.delete("/:id", adminOnly, validate(getBookingSchema), bookingController.deleteBookingHandler);

router.get("/admin/statistics", adminOnly, bookingController.getBookingStatisticsHandler);
router.get("/admin/upcoming", adminOnly, bookingController.getUpcomingBookingsHandler);
router.patch("/:id/confirm", adminOnly, validate(getBookingSchema), bookingController.confirmBookingHandler);
router.patch("/:id/complete", adminOnly, validate(getBookingSchema), bookingController.completeBookingHandler);

export default router;