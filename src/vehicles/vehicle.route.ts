import { Router } from 'express';
import * as vehicleController from './vehicle.controller';
import * as maintenanceController from '../maintenance/maintenance.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import {
    searchRateLimiter,
    apiRateLimiter,
    adminActionsRateLimiter,
    uploadRateLimiter
} from '../middleware/rateLimiter';
import {
    createVehicleSchema,
    updateVehicleSchema,
    vehicleQuerySchema,
    vehicleAvailabilitySchema,
    batchVehicleSchema,
    vehicleStatusUpdateSchema,
    vehicleAvailabilityUpdateSchema,
    maintenanceRecordSchema,
    availableVehiclesQuerySchema,
    vehicleConditionUpdateSchema,
    vehicleFuelUpdateSchema,
    vehicleMileageUpdateSchema,
    vehicleEarningsQuerySchema,
} from '../validation/vehicle.validator';

const router = Router();

// PUBLIC ROUTES - Order matters! More specific routes should come first
router.get('/search', searchRateLimiter, validate(vehicleQuerySchema), vehicleController.searchVehicles);
router.get('/available', searchRateLimiter, validate(availableVehiclesQuerySchema), vehicleController.getAvailableVehicles);
router.get('/statistics', authenticateToken, requireAdmin, adminActionsRateLimiter, vehicleController.getVehicleStatistics);
router.get('/earnings', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(vehicleEarningsQuerySchema), vehicleController.getVehicleEarnings);

// Routes with :id parameter should come after static routes
router.get('/:id/availability', apiRateLimiter, validate(vehicleAvailabilitySchema), vehicleController.checkVehicleAvailability);
router.get('/:id/maintenance', authenticateToken, apiRateLimiter, maintenanceController.getVehicleMaintenanceRecords);
router.get('/:id', apiRateLimiter, vehicleController.getVehicleById);
router.get('/', searchRateLimiter, validate(vehicleQuerySchema), vehicleController.getAllVehicles);

// ADMIN ROUTES - POST methods
router.post('/', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(createVehicleSchema), vehicleController.createVehicle);
router.post('/batch', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(batchVehicleSchema), vehicleController.batchImportVehicles);
router.post('/:id/maintenance', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.createMaintenanceRecord);
router.post('/:id/images', authenticateToken, requireAdmin, uploadRateLimiter, vehicleController.uploadVehicleImages);

// ADMIN ROUTES - PUT methods
router.put('/:id', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(updateVehicleSchema), vehicleController.updateVehicle);
router.put('/:id/maintenance/:maintenanceId', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.updateMaintenanceRecord);

// ADMIN ROUTES - PATCH methods
router.patch('/:id/availability', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(vehicleAvailabilityUpdateSchema), vehicleController.updateVehicleAvailability);
router.patch('/:id/status', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(vehicleStatusUpdateSchema), vehicleController.updateVehicleStatus);
router.patch('/:id/condition', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(vehicleConditionUpdateSchema), vehicleController.updateVehicleCondition);
router.patch('/:id/fuel', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(vehicleFuelUpdateSchema), vehicleController.updateVehicleFuel);
router.patch('/:id/mileage', authenticateToken, requireAdmin, validate(vehicleMileageUpdateSchema), vehicleController.updateVehicleMileage);
router.patch('/:id/clean', authenticateToken, requireAdmin, vehicleController.markVehicleCleaned);

// ADMIN ROUTES - DELETE methods
router.delete('/:id/maintenance/:maintenanceId', authenticateToken, requireAdmin, maintenanceController.deleteMaintenanceRecord);

// ADMIN ROUTES - DELETE methods
router.delete('/:id/images/:imageId', authenticateToken, requireAdmin, vehicleController.deleteVehicleImage);
router.delete('/:id', authenticateToken, requireAdmin, vehicleController.deleteVehicle);

export default router;