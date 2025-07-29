import { Request, Response, NextFunction } from 'express';
import * as maintenanceService from './maintenance.service';

// GET /maintenance/statistics
export const getMaintenanceStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { start_date, end_date, vehicle_id } = req.query;
        const stats = await maintenanceService.getMaintenanceStatistics(
            start_date as string,
            end_date as string,
            vehicle_id as string
        );

        // Also provide flat structure for easy frontend consumption
        const flatStats = {
            total_maintenance_cost: stats.summary.total_cost,
            total_records: stats.summary.total_records,
            average_cost: stats.summary.average_cost,
            // Count by status (need to calculate from records)
            completed_count: 0,
            pending_count: 0,
            in_progress_count: 0,
            overdue_count: 0,
            // Full structured data
            detailed: stats
        };

        // Get status counts
        const statusCounts = await maintenanceService.getMaintenanceStatusCounts(
            start_date as string,
            end_date as string,
            vehicle_id as string
        );

        // Merge status counts into flat stats
        Object.assign(flatStats, statusCounts);

        res.json({
            success: true,
            data: flatStats
        });
        return;
    } catch (err) {
        next(err);
    }
};

// GET /maintenance (all records)
export const getAllMaintenanceRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 20,
            vehicle_id,
            maintenance_type,
            status,
            date_from,
            date_to,
            cost_min,
            cost_max,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        const filters = {
            page: Number(page),
            limit: Number(limit),
            vehicle_id: vehicle_id as string,
            maintenance_type: maintenance_type as any,
            status: status as any,
            date_from: date_from as string,
            date_to: date_to as string,
            cost_min: cost_min ? Number(cost_min) : undefined,
            cost_max: cost_max ? Number(cost_max) : undefined,
            sortBy: sortBy as string,
            sortOrder: sortOrder as 'asc' | 'desc'
        };

        const result = await maintenanceService.getAllMaintenanceRecords(filters);

        res.json({
            success: true,
            data: result.records,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / filters.limit)
            }
        });
        return;
    } catch (err) {
        next(err);
    }
};

// GET /vehicles/:vehicleId/maintenance
export const getVehicleMaintenanceRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { vehicleId } = req.params;
        const {
            page = 1,
            limit = 20,
            maintenance_type,
            status,
            date_from,
            date_to,
            cost_min,
            cost_max,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        const filters = {
            page: Number(page),
            limit: Number(limit),
            maintenance_type: maintenance_type as any,
            status: status as any,
            date_from: date_from as string,
            date_to: date_to as string,
            cost_min: cost_min ? Number(cost_min) : undefined,
            cost_max: cost_max ? Number(cost_max) : undefined,
            sortBy: sortBy as string,
            sortOrder: sortOrder as 'asc' | 'desc'
        };

        const result = await maintenanceService.getVehicleMaintenanceRecords(vehicleId, filters);

        res.json({
            success: true,
            data: result.records,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / filters.limit)
            }
        });
        return;
    } catch (err) {
        next(err);
    }
};

// POST /vehicles/:vehicleId/maintenance
export const createMaintenanceRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { vehicleId } = req.params;
        const maintenanceData = { ...req.body, vehicle_id: vehicleId };

        const record = await maintenanceService.createMaintenanceRecord(maintenanceData);

        res.status(201).json({
            success: true,
            data: record,
            message: 'Maintenance record created successfully'
        });
        return;
    } catch (err) {
        next(err);
    }
};

// PUT /vehicles/:vehicleId/maintenance/:maintenanceId
export const updateMaintenanceRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { maintenanceId } = req.params;

        const record = await maintenanceService.updateMaintenanceRecord(maintenanceId, req.body);

        res.json({
            success: true,
            data: record,
            message: 'Maintenance record updated successfully'
        });
        return;
    } catch (err) {
        next(err);
    }
};

// DELETE /vehicles/:vehicleId/maintenance/:maintenanceId
export const deleteMaintenanceRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { maintenanceId } = req.params;

        await maintenanceService.deleteMaintenanceRecord(maintenanceId);

        res.json({
            success: true,
            message: 'Maintenance record deleted successfully'
        });
        return;
    } catch (err) {
        next(err);
    }
};

// GET /maintenance/:maintenanceId
export const getMaintenanceRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { maintenanceId } = req.params;

        const record = await maintenanceService.getMaintenanceRecordById(maintenanceId);

        if (!record) {
            res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
            return;
        }

        res.json({
            success: true,
            data: record
        });
        return;
    } catch (err) {
        next(err);
    }
};

// GET /maintenance/upcoming
export const getUpcomingMaintenance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { days = 30 } = req.query;
        const upcoming = await maintenanceService.getUpcomingMaintenance(Number(days));
        res.json({
            success: true,
            data: upcoming
        });
        return;
    } catch (err) {
        next(err);
    }
};

// GET /maintenance/overdue
export const getOverdueMaintenance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const overdue = await maintenanceService.getOverdueMaintenance();
        res.json({
            success: true,
            data: overdue
        });
        return;
    } catch (err) {
        next(err);
    }
};
