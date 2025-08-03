import { Request, Response, NextFunction } from 'express';
import { VehicleImageService, VehicleImageData } from './vehicleImage.service';
import { ResponseUtil } from '../middleware/response';
import { ErrorFactory } from '../middleware/appError';
import { CloudinaryService } from './cloudinary.service';
import { z } from 'zod';

// Validation schemas
const signatureRequestSchema = z.object({
    vehicleId: z.string().uuid(),
    is360: z.boolean().optional().default(false)
});

const uploadConfirmationSchema = z.object({
    vehicleId: z.string().uuid(),
    cloudinary_public_id: z.string(),
    secure_url: z.string().url(),
    width: z.number(),
    height: z.number(),
    format: z.string(),
    bytes: z.number(),
    is_primary: z.boolean().optional().default(false),
    is_360: z.boolean().optional().default(false),
    alt: z.string().optional(),
    caption: z.string().optional(),
    display_order: z.number().optional().default(0)
});

const vehicleImageService = new VehicleImageService();

export const getVehicleImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicleId } = req.params;

        const images = await vehicleImageService.getVehicleImages(vehicleId);

        return ResponseUtil.success(res, images, 'Vehicle images retrieved successfully');
    } catch (error) {
        next(error);
    }
};

export const addVehicleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicleId } = req.params;
        const { url, alt, caption, is_primary, is_360, display_order, cloudinary_public_id } = req.body;

        if (!url) {
            return next(ErrorFactory.badRequest('Image URL is required'));
        }

        const imageData: VehicleImageData = {
            vehicle_id: vehicleId,
            url,
            alt: alt || null,
            caption: caption || null,
            is_primary: is_primary || false,
            is_360: is_360 || false,
            display_order: display_order || 0,
            cloudinary_public_id: cloudinary_public_id || null
        };

        const newImage = await vehicleImageService.addVehicleImage(imageData);

        return ResponseUtil.success(res, newImage[0], 'Vehicle image added successfully');
    } catch (error) {
        next(error);
    }
};

export const updateVehicleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { imageId } = req.params;
        const updates = req.body;

        const updatedImage = await vehicleImageService.updateVehicleImage(imageId, updates);

        if (!updatedImage.length) {
            return next(ErrorFactory.notFound('Vehicle image not found'));
        }

        return ResponseUtil.success(res, updatedImage[0], 'Vehicle image updated successfully');
    } catch (error) {
        next(error);
    }
};

export const deleteVehicleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { imageId } = req.params;

        const deletedImage = await vehicleImageService.deleteVehicleImage(imageId);

        if (!deletedImage.length) {
            return next(ErrorFactory.notFound('Vehicle image not found'));
        }

        return ResponseUtil.success(res, null, 'Vehicle image deleted successfully');
    } catch (error) {
        next(error);
    }
};

export const setPrimaryImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicleId, imageId } = req.params;

        const updatedImage = await vehicleImageService.setPrimaryImage(vehicleId, imageId);

        return ResponseUtil.success(res, updatedImage[0], 'Primary image set successfully');
    } catch (error) {
        next(error);
    }
};

export const reorderImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicleId } = req.params;
        const { imageOrders } = req.body; // Array of {imageId, order}

        if (!Array.isArray(imageOrders)) {
            return next(ErrorFactory.badRequest('imageOrders must be an array'));
        }

        await vehicleImageService.reorderImages(vehicleId, imageOrders);

        return ResponseUtil.success(res, null, 'Images reordered successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Generate signed upload parameters for frontend
 * POST /api/vehicle-images/upload-signature
 */
export const getUploadSignature = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicleId, is360 } = signatureRequestSchema.parse(req.body);

        // Generate signed upload parameters
        const signedParams = CloudinaryService.generateSignedUploadParams(vehicleId, is360);

        return ResponseUtil.success(res, {
            ...signedParams,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // ✅ ADD MISSING CLOUD_NAME
            upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`
        }, 'Upload signature generated successfully');
    } catch (error) {
        if (error instanceof z.ZodError) {
            return next(ErrorFactory.badRequest('Invalid request parameters'));
        }
        next(error);
    }
};

/**
 * Confirm successful upload and save to database
 * POST /api/vehicle-images/upload-confirm
 */
export const confirmUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const uploadData = uploadConfirmationSchema.parse(req.body);

        // Save image data to database
        const savedImage = await vehicleImageService.addVehicleImage({
            vehicle_id: uploadData.vehicleId,
            url: uploadData.secure_url,
            cloudinary_public_id: uploadData.cloudinary_public_id,
            alt: uploadData.alt,
            caption: uploadData.caption,
            is_primary: uploadData.is_primary,
            is_360: uploadData.is_360,
            display_order: uploadData.display_order,
            file_size: uploadData.bytes,
            mime_type: `image/${uploadData.format}`
        });

        return ResponseUtil.success(res, savedImage[0], 'Image uploaded and saved successfully');
    } catch (error) {
        if (error instanceof z.ZodError) {
            return next(ErrorFactory.badRequest('Invalid upload data'));
        }
        next(error);
    }
};

/**
 * Get 360° images for a vehicle
 * GET /api/vehicle-images/:vehicleId/360
 */
export const get360Images = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { vehicleId } = req.params;
        const images = await vehicleImageService.get360Images(vehicleId);

        return ResponseUtil.success(res, images, '360° images retrieved successfully');
    } catch (error) {
        next(error);
    }
};
