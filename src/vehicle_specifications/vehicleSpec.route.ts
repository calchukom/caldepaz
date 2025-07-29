import { Router } from 'express';
import { vehicleSpecController } from './vehicleSpec.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import {
    apiRateLimiter,
    adminActionsRateLimiter,
    searchRateLimiter
} from '../middleware/rateLimiter';
import {
    createVehicleSpecSchema,
    updateVehicleSpecSchema,
    vehicleSpecQuerySchema,
    bulkCreateVehicleSpecSchema,
} from '../validation/vehicleSpec.validator';

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * @route   GET /api/vehicle-specifications
 * @desc    Get all vehicle specifications with filtering and pagination
 * @access  Public
 */
router.get('/', searchRateLimiter, validate(vehicleSpecQuerySchema), vehicleSpecController.getAllVehicleSpecs);

/**
 * @route   GET /api/vehicle-specifications/popular
 * @desc    Get popular vehicle specifications
 * @access  Public
 */
router.get('/popular', apiRateLimiter, vehicleSpecController.getPopularVehicleSpecs);

/**
 * @route   GET /api/vehicle-specifications/statistics
 * @desc    Get vehicle specification statistics
 * @access  Public
 */
router.get('/statistics', vehicleSpecController.getVehicleSpecStatistics);

/**
 * @route   GET /api/vehicle-specifications/manufacturers
 * @desc    Get unique manufacturers
 * @access  Public
 */
router.get('/manufacturers', vehicleSpecController.getManufacturers);

/**
 * @route   GET /api/vehicle-specifications/fuel-types
 * @desc    Get available fuel types
 * @access  Public
 */
router.get('/fuel-types', vehicleSpecController.getFuelTypes);

/**
 * @route   GET /api/vehicle-specifications/transmission-types
 * @desc    Get available transmission types
 * @access  Public
 */
router.get('/transmission-types', vehicleSpecController.getTransmissionTypes);

/**
 * @route   GET /api/vehicle-specifications/manufacturers/:manufacturer/models
 * @desc    Get models by manufacturer
 * @access  Public
 */
router.get('/manufacturers/:manufacturer/models', vehicleSpecController.getModelsByManufacturer);

/**
 * @route   GET /api/vehicle-specifications/:id
 * @desc    Get vehicle specification by ID
 * @access  Public
 */
router.get('/:id', vehicleSpecController.getVehicleSpecById);

// ============================================================================
// ADMIN ONLY ROUTES
// ============================================================================

/**
 * @route   POST /api/vehicle-specifications
 * @desc    Create a new vehicle specification
 * @access  Private (Admin)
 */
router.post('/', authenticateToken, requireAdmin, validate(createVehicleSpecSchema), vehicleSpecController.createVehicleSpec);

/**
 * @route   POST /api/vehicle-specifications/bulk
 * @desc    Bulk create vehicle specifications
 * @access  Private (Admin)
 */
router.post('/bulk', authenticateToken, requireAdmin, validate(bulkCreateVehicleSpecSchema), vehicleSpecController.bulkCreateVehicleSpecs);

/**
 * @route   PUT /api/vehicle-specifications/:id
 * @desc    Update vehicle specification
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, requireAdmin, validate(updateVehicleSpecSchema), vehicleSpecController.updateVehicleSpec);

/**
 * @route   DELETE /api/vehicle-specifications/:id
 * @desc    Delete vehicle specification
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, vehicleSpecController.deleteVehicleSpec);

export default router;