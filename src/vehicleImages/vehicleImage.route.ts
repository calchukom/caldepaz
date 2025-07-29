import { Router } from 'express';
import {
    getVehicleImages,
    addVehicleImage,
    updateVehicleImage,
    deleteVehicleImage,
    setPrimaryImage,
    reorderImages,
    getUploadSignature,
    confirmUpload,
    get360Images
} from './vehicleImage.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import {
    apiRateLimiter,
    uploadRateLimiter,
    adminActionsRateLimiter
} from '../middleware/rateLimiter';
import {
    validateCreateVehicleImage,
    validateUpdateVehicleImage,
    validateDeleteVehicleImage,
    validateGetVehicleImages,
    validateSetPrimaryImage,
    validateReorderImages
} from '../validation/vehicleImage.validator';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @route   GET /api/vehicles/:vehicleId/images
 * @desc    Get all images for a vehicle
 * @access  Public
 * @params  vehicleId - UUID of the vehicle
 */
router.get(
    '/vehicles/:vehicleId/images',
    apiRateLimiter,
    validateGetVehicleImages,
    getVehicleImages
);

// ============================================================================
// AUTHENTICATED ROUTES (Admin authentication required)
// ============================================================================

/**
 * @route   POST /api/vehicles/:vehicleId/images
 * @desc    Add new image to vehicle
 * @access  Private (Admin)
 * @params  vehicleId - UUID of the vehicle
 * @body    { url, alt?, caption?, is_primary?, is_360?, display_order? }
 */
router.post(
    '/vehicles/:vehicleId/images',
    uploadRateLimiter,
    authenticateToken,
    requireAdmin,
    validateCreateVehicleImage,
    addVehicleImage
);

/**
 * @route   PUT /api/images/:imageId
 * @desc    Update vehicle image
 * @access  Private (Admin)
 * @params  imageId - UUID of the image
 * @body    { url?, alt?, caption?, is_primary?, is_360?, display_order? }
 */
router.put(
    '/images/:imageId',
    adminActionsRateLimiter,
    authenticateToken,
    requireAdmin,
    validateUpdateVehicleImage,
    updateVehicleImage
);

/**
 * @route   DELETE /api/images/:imageId
 * @desc    Delete vehicle image
 * @access  Private (Admin)
 * @params  imageId - UUID of the image
 */
router.delete(
    '/images/:imageId',
    authenticateToken,
    requireAdmin,
    validateDeleteVehicleImage,
    deleteVehicleImage
);

/**
 * @route   PUT /api/vehicles/:vehicleId/images/:imageId/primary
 * @desc    Set primary image for vehicle
 * @access  Private (Admin)
 * @params  vehicleId - UUID of the vehicle
 * @params  imageId - UUID of the image
 */
router.put(
    '/vehicles/:vehicleId/images/:imageId/primary',
    authenticateToken,
    requireAdmin,
    validateSetPrimaryImage,
    setPrimaryImage
);

/**
 * @route   PUT /api/vehicles/:vehicleId/images/reorder
 * @desc    Reorder vehicle images
 * @access  Private (Admin)
 * @params  vehicleId - UUID of the vehicle
 * @body    { imageOrders: [{ imageId: string, order: number }] }
 */
router.put(
    '/vehicles/:vehicleId/images/reorder',
    authenticateToken,
    requireAdmin,
    validateReorderImages,
    reorderImages
);

// ============================================================================
// CLOUDINARY UPLOAD ROUTES
// ============================================================================

/**
 * @route   POST /api/vehicle-images/upload-signature
 * @desc    Generate signed upload parameters for Cloudinary
 * @access  Private (Admin)
 * @body    { vehicleId: string, is360?: boolean }
 */
router.post(
    '/vehicle-images/upload-signature',
    authenticateToken,
    requireAdmin,
    getUploadSignature
);

/**
 * @route   POST /api/vehicle-images/upload-confirm
 * @desc    Confirm successful upload and save to database
 * @access  Private (Admin)
 * @body    { vehicleId, cloudinary_public_id, secure_url, width, height, format, bytes, ... }
 */
router.post(
    '/vehicle-images/upload-confirm',
    authenticateToken,
    requireAdmin,
    confirmUpload
);

/**
 * @route   GET /api/vehicles/:vehicleId/images/360
 * @desc    Get 360° images for a vehicle
 * @access  Public
 * @params  vehicleId - UUID of the vehicle
 */
router.get(
    '/vehicles/:vehicleId/images/360',
    validateGetVehicleImages,
    get360Images
);

export default router;
