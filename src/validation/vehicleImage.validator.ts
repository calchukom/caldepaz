import { z } from 'zod';

// Vehicle image validation schemas
export const vehicleImageBaseSchema = z.object({
    url: z.string().url('Invalid URL format').min(1, 'Image URL is required'),
    alt: z.string().max(255, 'Alt text cannot exceed 255 characters').optional(),
    caption: z.string().max(1000, 'Caption cannot exceed 1000 characters').optional(),
    is_primary: z.boolean().optional().default(false),
    is_360: z.boolean().optional().default(false),
    display_order: z.number().int().min(0, 'Display order cannot be negative').optional().default(0),
});

export const createVehicleImageSchema = z.object({
    params: z.object({
        vehicleId: z.string().uuid('Invalid vehicle ID'),
    }),
    body: vehicleImageBaseSchema,
});

export const updateVehicleImageSchema = z.object({
    params: z.object({
        imageId: z.string().uuid('Invalid image ID'),
    }),
    body: vehicleImageBaseSchema.partial(),
});

export const deleteVehicleImageSchema = z.object({
    params: z.object({
        imageId: z.string().uuid('Invalid image ID'),
    }),
});

export const getVehicleImagesSchema = z.object({
    params: z.object({
        vehicleId: z.string().uuid('Invalid vehicle ID'),
    }),
});

export const setPrimaryImageSchema = z.object({
    params: z.object({
        vehicleId: z.string().uuid('Invalid vehicle ID'),
        imageId: z.string().uuid('Invalid image ID'),
    }),
});

export const reorderImagesSchema = z.object({
    params: z.object({
        vehicleId: z.string().uuid('Invalid vehicle ID'),
    }),
    body: z.object({
        imageOrders: z.array(z.object({
            imageId: z.string().uuid('Invalid image ID'),
            order: z.number().int().min(0, 'Order cannot be negative'),
        })).min(1, 'At least one image order is required'),
    }),
});

// Export validation middleware functions
export const validateCreateVehicleImage = (req: any, res: any, next: any) => {
    try {
        createVehicleImageSchema.parse({
            params: req.params,
            body: req.body,
        });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateUpdateVehicleImage = (req: any, res: any, next: any) => {
    try {
        updateVehicleImageSchema.parse({
            params: req.params,
            body: req.body,
        });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateDeleteVehicleImage = (req: any, res: any, next: any) => {
    try {
        deleteVehicleImageSchema.parse({
            params: req.params,
        });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateGetVehicleImages = (req: any, res: any, next: any) => {
    try {
        getVehicleImagesSchema.parse({
            params: req.params,
        });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateSetPrimaryImage = (req: any, res: any, next: any) => {
    try {
        setPrimaryImageSchema.parse({
            params: req.params,
        });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateReorderImages = (req: any, res: any, next: any) => {
    try {
        reorderImagesSchema.parse({
            params: req.params,
            body: req.body,
        });
        next();
    } catch (error) {
        next(error);
    }
};
