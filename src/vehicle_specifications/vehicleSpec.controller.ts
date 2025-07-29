import { Request, Response, NextFunction } from 'express';
import { vehicleSpecService } from './vehicleSpec.service';
import { ResponseUtil } from '../middleware/response';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';
import { AuthenticatedRequest } from '../middleware/bearAuth';

export class VehicleSpecController {

    /**
     * Create a new vehicle specification
     */
    async createVehicleSpec(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const specification = await vehicleSpecService.createVehicleSpec(req.body);

            ResponseUtil.created(res, specification, 'Vehicle specification created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all vehicle specifications
     */
    async getAllVehicleSpecs(req: Request, res: Response, next: NextFunction) {
        try {
            // Define valid enum values
            const validSortBy = ['manufacturer', 'model', 'year', 'seating_capacity', 'created_at', 'updated_at'] as const;
            const validSortOrder = ['asc', 'desc'] as const;
            const validFuelTypes = ['petrol', 'diesel', 'electric', 'hybrid'] as const;
            const validTransmissions = ['manual', 'automatic', 'cvt'] as const;
            const validVehicleCategories = ['four_wheeler', 'two_wheeler'] as const;

            // Validate and cast sortBy
            const sortBy = req.query.sortBy as string;
            const validatedSortBy = validSortBy.includes(sortBy as any) ? sortBy as typeof validSortBy[number] : 'created_at' as const;

            // Validate and cast sortOrder
            const sortOrder = req.query.sortOrder as string;
            const validatedSortOrder = validSortOrder.includes(sortOrder as any) ? sortOrder as typeof validSortOrder[number] : 'desc' as const;

            // Validate fuel_type
            const fuelType = req.query.fuel_type as string;
            const validatedFuelType = validFuelTypes.includes(fuelType as any) ? fuelType as typeof validFuelTypes[number] : undefined;

            // Validate transmission
            const transmission = req.query.transmission as string;
            const validatedTransmission = validTransmissions.includes(transmission as any) ? transmission as typeof validTransmissions[number] : undefined;

            // Validate vehicle_category
            const vehicleCategory = req.query.vehicle_category as string;
            const validatedVehicleCategory = validVehicleCategories.includes(vehicleCategory as any) ? vehicleCategory as typeof validVehicleCategories[number] : undefined;

            const query = {
                page: req.query.page as string || '1',
                limit: req.query.limit as string || '10',
                manufacturer: req.query.manufacturer as string,
                fuel_type: validatedFuelType,
                transmission: validatedTransmission,
                vehicle_category: validatedVehicleCategory,
                seating_capacity: req.query.seating_capacity as string,
                year_from: req.query.year_from as string,
                year_to: req.query.year_to as string,
                min_year: req.query.min_year as string,
                max_year: req.query.max_year as string,
                min_seating: req.query.min_seating as string,
                max_seating: req.query.max_seating as string,
                search: req.query.search as string,
                sortBy: validatedSortBy,
                sortOrder: validatedSortOrder,
            };

            const result = await vehicleSpecService.getAllVehicleSpecs(query);

            ResponseUtil.success(res, result, 'Vehicle specifications retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vehicle specification by ID
     */
    async getVehicleSpecById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const specification = await vehicleSpecService.getVehicleSpecById(id);

            ResponseUtil.success(res, specification, 'Vehicle specification retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update vehicle specification
     */
    async updateVehicleSpec(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const specification = await vehicleSpecService.updateVehicleSpec(id, req.body);

            ResponseUtil.success(res, specification, 'Vehicle specification updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete vehicle specification
     */
    async deleteVehicleSpec(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await vehicleSpecService.deleteVehicleSpec(id);

            ResponseUtil.success(res, { message: result.message }, result.message);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vehicle specification statistics
     */
    async getVehicleSpecStatistics(req: Request, res: Response, next: NextFunction) {
        try {
            const statistics = await vehicleSpecService.getVehicleSpecStatistics();

            ResponseUtil.success(res, statistics, 'Vehicle specification statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get unique manufacturers
     */
    async getManufacturers(req: Request, res: Response, next: NextFunction) {
        try {
            const manufacturers = await vehicleSpecService.getManufacturers();

            ResponseUtil.success(res, manufacturers, 'Manufacturers retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get models by manufacturer
     */
    async getModelsByManufacturer(req: Request, res: Response, next: NextFunction) {
        try {
            const { manufacturer } = req.params;

            if (!manufacturer) {
                throw ErrorFactory.badRequest('Manufacturer parameter is required');
            }

            const models = await vehicleSpecService.getModelsByManufacturer(manufacturer);

            ResponseUtil.success(res, models, 'Models retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bulk create vehicle specifications
     */
    async bulkCreateVehicleSpecs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { specifications } = req.body;

            if (!specifications || !Array.isArray(specifications) || specifications.length === 0) {
                throw ErrorFactory.badRequest('specifications array is required');
            }

            const result = await vehicleSpecService.bulkCreateVehicleSpecs(specifications);

            ResponseUtil.created(res, result, 'Bulk vehicle specification creation completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get fuel types (for dropdowns)
     */
    async getFuelTypes(req: Request, res: Response, next: NextFunction) {
        try {
            const fuelTypes = [
                { value: 'petrol', label: 'Petrol' },
                { value: 'diesel', label: 'Diesel' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'electric', label: 'Electric' },
                { value: 'cng', label: 'CNG' },
                { value: 'lpg', label: 'LPG' }
            ];

            ResponseUtil.success(res, fuelTypes, 'Fuel types retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get transmission types (for dropdowns)
     */
    async getTransmissionTypes(req: Request, res: Response, next: NextFunction) {
        try {
            const transmissionTypes = [
                { value: 'manual', label: 'Manual' },
                { value: 'automatic', label: 'Automatic' },
                { value: 'cvt', label: 'CVT' },
                { value: 'semi_automatic', label: 'Semi-Automatic' }
            ];

            ResponseUtil.success(res, transmissionTypes, 'Transmission types retrieved successfully');
        } catch (error) {
            next(error);
        }
    }    /**
     * Get popular vehicle specifications
     */
    async getPopularVehicleSpecs(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;

            if (limit < 1 || limit > 50) {
                return next(ErrorFactory.badRequest('Limit must be between 1 and 50', 'limit'));
            }

            const popularSpecs = await vehicleSpecService.getPopularVehicleSpecs(limit);

            ResponseUtil.success(res, popularSpecs, 'Popular vehicle specifications retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const vehicleSpecController = new VehicleSpecController();