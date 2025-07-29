import { db } from '../drizzle/db';
import { vehicleImages, VehicleImage, NewVehicleImage } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CloudinaryService } from './cloudinary.service';

export interface VehicleImageData {
    vehicle_id: string;
    url: string;
    cloudinary_public_id?: string;
    alt?: string;
    caption?: string;
    is_primary?: boolean;
    is_360?: boolean;
    display_order?: number;
    file_size?: number;
    mime_type?: string;
}

export class VehicleImageService {
    // Get all images for a vehicle with optimized URLs
    async getVehicleImages(vehicleId: string) {
        const images = await db
            .select()
            .from(vehicleImages)
            .where(eq(vehicleImages.vehicle_id, vehicleId))
            .orderBy(desc(vehicleImages.is_primary), vehicleImages.display_order);

        // Add optimized URLs for each image
        return images.map((image: any) => ({
            ...image,
            optimized_urls: image.cloudinary_public_id
                ? CloudinaryService.getResponsiveUrls(image.cloudinary_public_id, image.is_360 || false)
                : null
        }));
    }

    // Get 360° images specifically
    async get360Images(vehicleId: string) {
        const images = await db
            .select()
            .from(vehicleImages)
            .where(and(
                eq(vehicleImages.vehicle_id, vehicleId),
                eq(vehicleImages.is_360, true)
            ))
            .orderBy(vehicleImages.display_order);

        return images.map((image: any) => ({
            ...image,
            optimized_urls: image.cloudinary_public_id
                ? CloudinaryService.getResponsiveUrls(image.cloudinary_public_id, true)
                : null
        }));
    }

    // Add new image with Cloudinary data
    async addVehicleImage(imageData: VehicleImageData) {
        // If setting as primary, remove primary flag from other images
        if (imageData.is_primary) {
            await this.removePrimaryFlag(imageData.vehicle_id);
        }

        const insertData: NewVehicleImage = {
            vehicle_id: imageData.vehicle_id,
            url: imageData.url,
            cloudinary_public_id: imageData.cloudinary_public_id || null,
            alt: imageData.alt || null,
            caption: imageData.caption || null,
            is_primary: imageData.is_primary || false,
            is_360: imageData.is_360 || false,
            display_order: imageData.display_order || 0,
            file_size: imageData.file_size || null,
            mime_type: imageData.mime_type || null,
            created_at: new Date(),
            updated_at: new Date()
        };

        return await db.insert(vehicleImages).values(insertData).returning();
    }

    // Update image
    async updateVehicleImage(imageId: string, updates: Partial<VehicleImage>) {
        if (updates.is_primary) {
            // Remove primary flag from other images first
            const currentImage = await this.getImageById(imageId);
            if (currentImage) {
                await this.removePrimaryFlag(currentImage.vehicle_id);
            }
        }

        return await db
            .update(vehicleImages)
            .set({ ...updates, updated_at: new Date() })
            .where(eq(vehicleImages.image_id, imageId))
            .returning();
    }

    // Delete image (also removes from Cloudinary)
    async deleteVehicleImage(imageId: string) {
        // Get image data first to delete from Cloudinary
        const imageToDelete = await this.getImageById(imageId);

        if (!imageToDelete) {
            throw new Error('Image not found');
        }

        // Delete from database first
        const result = await db
            .delete(vehicleImages)
            .where(eq(vehicleImages.image_id, imageId))
            .returning();

        // Then delete from Cloudinary if public_id exists
        if (imageToDelete.cloudinary_public_id) {
            try {
                await CloudinaryService.deleteImage(imageToDelete.cloudinary_public_id);
            } catch (error) {
                console.error('Failed to delete from Cloudinary:', error);
                // Continue - database deletion was successful
            }
        }

        return result;
    }

    // Set primary image
    async setPrimaryImage(vehicleId: string, imageId: string) {
        // Remove primary flag from all images
        await this.removePrimaryFlag(vehicleId);

        // Set new primary image
        return await db
            .update(vehicleImages)
            .set({ is_primary: true, updated_at: new Date() })
            .where(eq(vehicleImages.image_id, imageId))
            .returning();
    }

    // Reorder images
    async reorderImages(vehicleId: string, imageOrders: Array<{ imageId: string, order: number }>) {
        const updates = imageOrders.map(({ imageId, order }) =>
            db.update(vehicleImages)
                .set({ display_order: order, updated_at: new Date() })
                .where(eq(vehicleImages.image_id, imageId))
        );

        return await Promise.all(updates);
    }

    // Helper methods
    private async removePrimaryFlag(vehicleId: string) {
        return await db
            .update(vehicleImages)
            .set({ is_primary: false, updated_at: new Date() })
            .where(eq(vehicleImages.vehicle_id, vehicleId));
    }

    private async getImageById(imageId: string) {
        const result = await db
            .select()
            .from(vehicleImages)
            .where(eq(vehicleImages.image_id, imageId))
            .limit(1);
        return result[0];
    }
}
