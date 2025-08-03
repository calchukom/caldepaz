import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import crypto from 'crypto';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinarySignature {
    signature: string;
    timestamp: number;
    public_id: string;
    folder: string;
    api_key: string;
    cloud_name?: string; // Optional since it's added in controller
}

export interface CloudinaryUploadResponse {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    bytes: number;
    url: string;
}

export class CloudinaryService {
    private static readonly UPLOAD_PRESET = 'vehicle_images';
    private static readonly FOLDER_PREFIX = 'vehicle_images';

    /**
     * Generate signed upload parameters for frontend
     * This ensures secure uploads without exposing API secrets
     */
    static generateSignedUploadParams(vehicleId: string, is360: boolean = false): CloudinarySignature {
        const timestamp = Math.round(Date.now() / 1000);
        const folder = `${this.FOLDER_PREFIX}/${vehicleId}${is360 ? '/360' : ''}`;
        const public_id = `${vehicleId}_${crypto.randomBytes(8).toString('hex')}`;

        // Parameters to sign (ONLY include what Cloudinary expects)
        // Based on error: 'folder=...&public_id=...&timestamp=...'
        const params = {
            folder,
            public_id,
            timestamp
            // ❌ REMOVED: resource_type (not expected in signature)
            // ❌ REMOVED: transformation parameters (these break Cloudinary signatures)
        };

        // Generate signature
        const signature = this.generateSignature(params);

        return {
            signature,
            timestamp,
            public_id,
            folder,
            api_key: process.env.CLOUDINARY_API_KEY!
        };
    }

    /**
     * Generate Cloudinary signature for secure uploads
     */
    private static generateSignature(params: Record<string, any>): string {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        return crypto
            .createHash('sha1')
            .update(sortedParams + process.env.CLOUDINARY_API_SECRET)
            .digest('hex');
    }

    /**
     * Validate uploaded image signature from frontend
     */
    static validateUploadSignature(
        publicId: string,
        version: string,
        signature: string
    ): boolean {
        const expectedSignature = crypto
            .createHash('sha1')
            .update(`public_id=${publicId}&version=${version}${process.env.CLOUDINARY_API_SECRET}`)
            .digest('hex');

        return signature === expectedSignature;
    }

    /**
     * Delete image from Cloudinary
     */
    static async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
            throw new Error('Failed to delete image from cloud storage');
        }
    }

    /**
     * Generate optimized URLs for different use cases
     */
    static getOptimizedUrl(publicId: string, options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string;
        format?: string;
        is360?: boolean;
    } = {}): string {
        const transformations = [];

        if (options.is360) {
            // 360 image specific optimizations
            transformations.push({
                width: options.width || 1024,
                height: options.height || 512,
                crop: options.crop || 'fill',
                quality: options.quality || 'auto:good',
                format: options.format || 'jpg'
            });
        } else {
            // Regular image optimizations
            transformations.push({
                width: options.width || 800,
                height: options.height || 600,
                crop: options.crop || 'fill',
                quality: options.quality || 'auto:eco',
                format: options.format || 'webp'
            });
        }

        return cloudinary.url(publicId, {
            transformation: transformations,
            secure: true
        });
    }

    /**
     * Get multiple transformation URLs for responsive images
     */
    static getResponsiveUrls(publicId: string, is360: boolean = false): {
        thumbnail: string;
        medium: string;
        large: string;
        original: string;
    } {
        const baseOptions = { is360 };

        return {
            thumbnail: this.getOptimizedUrl(publicId, { ...baseOptions, width: 200, height: 150 }),
            medium: this.getOptimizedUrl(publicId, { ...baseOptions, width: 600, height: 450 }),
            large: this.getOptimizedUrl(publicId, { ...baseOptions, width: 1200, height: 900 }),
            original: this.getOptimizedUrl(publicId, baseOptions)
        };
    }
}
