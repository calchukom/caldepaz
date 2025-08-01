import { Request, Response, NextFunction } from 'express';
import * as locationService from './location.service';
import { logger } from '../middleware/logger';
import ResponseUtil from '../middleware/response';
import { ErrorFactory } from '../middleware/appError';

// Helper function for consistent responses
const sendResponse = (res: Response, statusCode: number, message: string, data: any) => {
    if (statusCode === 201) {
        ResponseUtil.created(res, data, message);
    } else if (statusCode === 200) {
        ResponseUtil.success(res, data, message);
    } else {
        ResponseUtil.error(res, statusCode, message);
    }
};

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * Get all locations with pagination and filtering
 */
export const getAllLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const search = req.query.search as string;
        const sortBy = req.query.sortBy as string;
        const sortOrder = req.query.sortOrder as 'asc' | 'desc';
        const country = req.query.country as string;
        const city = req.query.city as string;

        // Geographic filtering parameters
        const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
        const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
        const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

        const filters = {
            search,
            sortBy,
            sortOrder,
            country,
            city,
            latitude,
            longitude,
            radius
        };

        const result = await locationService.getAllLocations(page, limit, filters);

        sendResponse(res, 200, 'Locations retrieved successfully', result);
    } catch (error) {
        logger.error('Error in getAllLocations controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Get location by ID
 */
export const getLocationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const locationId = req.params.id;
        const location = await locationService.getLocationById(locationId);

        if (!location) {
            throw ErrorFactory.notFound('Location not found');
        }

        sendResponse(res, 200, 'Location retrieved successfully', location);
    } catch (error) {
        logger.error('Error in getLocationById controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Get popular locations
 */
export const getPopularLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const source = req.query.source as string || 'database';

        const locations = await locationService.getPopularLocations(limit, source);

        sendResponse(res, 200, 'Popular locations retrieved successfully', {
            locations,
            source,
            count: locations.length
        });
    } catch (error) {
        logger.error('Error in getPopularLocations controller', { module: 'locations', error });
        next(error);
    }
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * Create a new location
 */
export const createLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            name,
            address,
            contact_phone,
            city,
            state,
            country,
            postal_code,
            email,
            latitude,
            longitude,
            operating_hours
        } = req.body;

        const locationData = {
            name,
            address,
            contact_phone,
            city,
            state,
            country,
            postal_code,
            email,
            latitude,
            longitude,
            operating_hours
        };

        const location = await locationService.createLocation(locationData);

        sendResponse(res, 201, 'Location created successfully', location);
    } catch (error) {
        logger.error('Error in createLocation controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Update an existing location
 */
export const updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const locationId = req.params.id;
        const {
            name,
            address,
            contact_phone,
            city,
            state,
            country,
            postal_code,
            email,
            latitude,
            longitude,
            operating_hours
        } = req.body;

        const updateData = {
            name,
            address,
            contact_phone,
            city,
            state,
            country,
            postal_code,
            email,
            latitude,
            longitude,
            operating_hours
        };

        const location = await locationService.updateLocation(locationId, updateData);

        sendResponse(res, 200, 'Location updated successfully', location);
    } catch (error) {
        logger.error('Error in updateLocation controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Delete a location
 */
export const deleteLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const locationId = req.params.id;

        await locationService.deleteLocation(locationId);

        sendResponse(res, 200, 'Location deleted successfully', null);
    } catch (error) {
        logger.error('Error in deleteLocation controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Get popular locations with IDs for admin selection
 */
export const getPopularLocationsWithIds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const source = req.query.source as string || 'external';

        const locations = await locationService.getPopularLocationsWithIds(limit, source);

        sendResponse(res, 200, 'Popular locations with IDs retrieved successfully', {
            locations,
            source,
            count: locations.length
        });
    } catch (error) {
        logger.error('Error in getPopularLocationsWithIds controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Create location from popular API selection
 */
export const createLocationFromPopular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { locationId, source } = req.body;

        if (!locationId || !source) {
            throw ErrorFactory.badRequest('locationId and source are required');
        }

        const location = await locationService.createLocationFromPopular(locationId, source);

        sendResponse(res, 201, 'Location created from popular selection successfully', location);
    } catch (error) {
        logger.error('Error in createLocationFromPopular controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Get location statistics
 */
export const getLocationStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const statistics = await locationService.getLocationStatistics();

        sendResponse(res, 200, 'Location statistics retrieved successfully', statistics);
    } catch (error) {
        logger.error('Error in getLocationStatistics controller', { module: 'locations', error });
        next(error);
    }
};

// Export controller object
/**
 * Search locations by query
 */
export const searchLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const query = req.query.query as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        const locations = await locationService.searchLocations(query, limit);

        sendResponse(res, 200, 'Locations search results', { locations });
    } catch (error) {
        logger.error('Error in searchLocations controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Get vehicles by location ID
 */
export const getVehiclesByLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const locationId = req.params.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

        const vehicles = await locationService.getVehiclesByLocation(locationId, page, limit);

        if (!vehicles) {
            throw ErrorFactory.notFound('Location not found');
        }

        sendResponse(res, 200, 'Vehicles retrieved successfully', vehicles);
    } catch (error) {
        logger.error('Error in getVehiclesByLocation controller', { module: 'locations', error });
        next(error);
    }
};

/**
 * Get location availability
 */
export const getLocationAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const locationId = req.params.id;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days ahead

        const availability = await locationService.getLocationAvailability(locationId, startDate, endDate);

        sendResponse(res, 200, 'Location availability retrieved successfully', availability);
    } catch (error) {
        logger.error('Error in getLocationAvailability controller', { module: 'locations', error });
        next(error);
    }
};

export const locationController = {
    getAllLocations,
    getLocationById,
    getPopularLocations,
    searchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getPopularLocationsWithIds,
    createLocationFromPopular,
    getLocationStatistics,
    getVehiclesByLocation,
    getLocationAvailability,
};
