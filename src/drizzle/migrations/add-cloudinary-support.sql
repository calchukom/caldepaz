-- Add Cloudinary support columns to vehicle_images table

-- Add new columns for Cloudinary integration
ALTER TABLE vehicle_images 
ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Update any existing records to have default values
UPDATE vehicle_images 
SET 
    cloudinary_public_id = NULL,
    file_size = NULL,
    mime_type = 'image/jpeg'
WHERE cloudinary_public_id IS NULL;

-- Add index for faster queries on cloudinary_public_id
CREATE INDEX IF NOT EXISTS idx_vehicle_images_cloudinary_public_id 
ON vehicle_images(cloudinary_public_id);

-- Add index for faster queries on is_360 images
CREATE INDEX IF NOT EXISTS idx_vehicle_images_is_360 
ON vehicle_images(vehicle_id, is_360);

-- Add index for faster queries on is_primary
CREATE INDEX IF NOT EXISTS idx_vehicle_images_is_primary 
ON vehicle_images(vehicle_id, is_primary);

-- Add comment to the table
COMMENT ON TABLE vehicle_images IS 'Vehicle images with Cloudinary integration support';
COMMENT ON COLUMN vehicle_images.cloudinary_public_id IS 'Cloudinary public ID for image management';
COMMENT ON COLUMN vehicle_images.file_size IS 'File size in bytes';
COMMENT ON COLUMN vehicle_images.mime_type IS 'MIME type of the image file';
COMMENT ON COLUMN vehicle_images.is_360 IS 'Whether this is a 360-degree image';
