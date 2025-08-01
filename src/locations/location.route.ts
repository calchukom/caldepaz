import { Router } from 'express';
import { locationController } from './location.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import {
  apiRateLimiter,
  adminActionsRateLimiter,
  searchRateLimiter
} from '../middleware/rateLimiter';
import {
  createLocationSchema,
  updateLocationSchema,
  locationQuerySchema,
  popularLocationsQuerySchema,
  createFromPopularSchema,
  locationSearchSchema,
  locationGeoFilterSchema
} from '../validation/location.validator';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (based on client.http)
// ============================================================================

/**
 * @route   GET /api/locations
 * @desc    Get All Locations (Public)
 * @access  Public
 * @query   page, limit, search, sortBy, sortOrder
 */
router.get('/', searchRateLimiter, validate(locationQuerySchema), locationController.getAllLocations);

/**
 * @route   GET /api/locations/popular
 * @desc    Get Popular Locations (Public)
 * @access  Public
 * @query   limit, source (kenyan, database, external, api)
 */
router.get('/popular', apiRateLimiter, validate(popularLocationsQuerySchema), locationController.getPopularLocations);

/**
 * @route   GET /api/locations/popular-with-ids
 * @desc    Get Popular Locations with IDs for Admin Selection (Admin only)
 * @access  Private (Admin)
 * @query   limit, source (external, kenyan)
 */
router.get('/popular-with-ids', authenticateToken, requireAdmin, validate(popularLocationsQuerySchema), locationController.getPopularLocationsWithIds);

/**
 * @route   GET /api/locations/search
 * @desc    Search Locations (Public)
 * @access  Public
 * @query   query
 */
router.get('/search', searchRateLimiter, validate(locationSearchSchema), locationController.searchLocations);

/**
 * @route   GET /api/locations/statistics
 * @desc    Get Location Statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/statistics', authenticateToken, requireAdmin, locationController.getLocationStatistics);

/**
 * @route   GET /api/locations/:id/vehicles
 * @desc    Get Vehicles by Location ID
 * @access  Public
 */
router.get('/:id/vehicles', locationController.getVehiclesByLocation);

/**
 * @route   GET /api/locations/:id/availability
 * @desc    Get Location Availability
 * @access  Public
 */
router.get('/:id/availability', locationController.getLocationAvailability);

/**
 * @route   GET /api/locations/:id
 * @desc    Get Location by ID (Public)
 * @access  Public
 */
router.get('/:id', locationController.getLocationById);

// ============================================================================
// ADMIN ROUTES (based on client.http)
// ============================================================================

/**
 * @route   POST /api/locations
 * @desc    Create Location (Admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticateToken, requireAdmin, validate(createLocationSchema), (req, res, next) => {
  locationController.createLocation(req, res, next);
});

/**
 * @route   PUT /api/locations/:id
 * @desc    Update Location (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, requireAdmin, validate(updateLocationSchema), locationController.updateLocation);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Delete Location (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, locationController.deleteLocation);

/**
 * @route   POST /api/locations/create-from-popular
 * @desc    Create Location from Popular API Selection (Admin only)
 * @access  Private (Admin)
 */
router.post('/create-from-popular', authenticateToken, requireAdmin, validate(createFromPopularSchema), locationController.createLocationFromPopular);

export default router;