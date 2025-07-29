import * as vehicleService from './vehicle.service';
import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../middleware/response';

// GET /vehicles
export const getAllVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page = 1, limit = 10, ...filters } = req.query;
        const vehicles = await vehicleService.getAllVehicles(
            Number(page),
            Number(limit),
            filters
        );
        ResponseUtil.success(res, vehicles, 'Vehicles retrieved successfully');
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/search
export const searchVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { q, limit = 10 } = req.query;
        const result = await vehicleService.searchVehicles(q as string, Number(limit));
        res.json(result);
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/:id
export const getVehicleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const vehicle = await vehicleService.getVehicleById(req.params.id);
        if (!vehicle) {
            ResponseUtil.notFound(res, 'Vehicle not found');
            return;
        }
        ResponseUtil.success(res, vehicle, 'Vehicle retrieved successfully');
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/:id/availability
export const checkVehicleAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { start_date, end_date } = req.query;
        const result = await vehicleService.checkVehicleAvailability(
            req.params.id,
            new Date(start_date as string),
            new Date(end_date as string)
        );
        res.json(result);
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/available
export const getAvailableVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { start_date, end_date, location_id, ...filters } = req.query;
        const result = await vehicleService.getAvailableVehicles(
            new Date(start_date as string),
            new Date(end_date as string),
            location_id as string,
            filters
        );
        res.json(result);
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/statistics
export const getVehicleStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const stats = await vehicleService.getVehicleStatistics();
        res.json(stats);
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/earnings
export const getVehicleEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { start_date, end_date } = req.query;
        const earnings = await vehicleService.getVehicleEarnings(
            start_date as string,
            end_date as string
        );
        res.json(earnings);
        return;
    } catch (err) {
        next(err);
    }
};

// POST /vehicles
export const createVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const vehicle = await vehicleService.createVehicle(req.body);
        res.status(201).json(vehicle);
        return;
    } catch (err) {
        next(err);
    }
};

// POST /vehicles/batch
export const batchImportVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { vehicles } = req.body;
        const imported = await vehicleService.batchImportVehicles(vehicles);
        res.status(201).json(imported);
        return;
    } catch (err) {
        next(err);
    }
};

// PUT /vehicles/:id
export const updateVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updated = await vehicleService.updateVehicle(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        res.json(updated);
        return;
    } catch (err) {
        next(err);
    }
};

// PATCH /vehicles/:id/availability
export const updateVehicleAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updated = await vehicleService.updateVehicleAvailability(req.params.id, req.body.availability);
        if (!updated) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        res.json(updated);
        return;
    } catch (err) {
        next(err);
    }
};

// PATCH /vehicles/:id/status
export const updateVehicleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updated = await vehicleService.updateVehicleStatus(req.params.id, req.body.status);
        if (!updated) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        res.json(updated);
        return;
    } catch (err) {
        next(err);
    }
};

// PATCH /vehicles/:id/condition
export const updateVehicleCondition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { condition_rating, is_damaged, damage_description } = req.body;
        const updated = await vehicleService.updateVehicleCondition(
            req.params.id,
            condition_rating,
            is_damaged,
            damage_description
        );
        if (!updated) {
            ResponseUtil.notFound(res, 'Vehicle not found');
            return;
        }
        ResponseUtil.success(res, updated, 'Vehicle condition updated successfully');
        return;
    } catch (err) {
        next(err);
    }
};

// PATCH /vehicles/:id/fuel
export const updateVehicleFuel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fuel_level } = req.body;
        const updated = await vehicleService.updateVehicleFuelLevel(req.params.id, fuel_level);
        if (!updated) {
            ResponseUtil.notFound(res, 'Vehicle not found');
            return;
        }
        ResponseUtil.success(res, updated, 'Vehicle fuel level updated successfully');
        return;
    } catch (err) {
        next(err);
    }
};

// PATCH /vehicles/:id/mileage
export const updateVehicleMileage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { mileage } = req.body;
        const updated = await vehicleService.updateVehicleMileage(req.params.id, mileage);
        if (!updated) {
            ResponseUtil.notFound(res, 'Vehicle not found');
            return;
        }
        ResponseUtil.success(res, updated, 'Vehicle mileage updated successfully');
        return;
    } catch (err) {
        next(err);
    }
};

// PATCH /vehicles/:id/clean
export const markVehicleCleaned = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updated = await vehicleService.markVehicleCleaned(req.params.id);
        if (!updated) {
            ResponseUtil.notFound(res, 'Vehicle not found');
            return;
        }
        ResponseUtil.success(res, updated, 'Vehicle marked as cleaned successfully');
        return;
    } catch (err) {
        next(err);
    }
};

// POST /vehicles/:id/maintenance
export const addMaintenanceRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const record = await vehicleService.addMaintenanceRecord(req.params.id, req.body);
        res.status(201).json(record);
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/:id/maintenance
export const getMaintenanceHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const records = await vehicleService.getMaintenanceHistory(req.params.id);
        res.json(records);
        return;
    } catch (err) {
        next(err);
    }
};

// DELETE /vehicles/:id
export const deleteVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await vehicleService.deleteVehicle(req.params.id);
        res.json({ success: true });
        return;
    } catch (err) {
        next(err);
    }
};

// POST /vehicles/:id/images
export const uploadVehicleImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const files = (req as any).files || [];
        const imageUrls = await vehicleService.uploadVehicleImages(req.params.id, files);
        res.status(201).json({ images: imageUrls });
        return;
    } catch (err) {
        next(err);
    }
};

// DELETE /vehicles/:id/images/:imageId
export const deleteVehicleImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const success = await vehicleService.deleteVehicleImage(req.params.id, req.params.imageId);
        res.json({ success });
        return;
    } catch (err) {
        next(err);
    }
};