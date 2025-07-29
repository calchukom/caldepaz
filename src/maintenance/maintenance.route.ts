import { Router } from 'express';
import * as maintenanceController from './maintenance.controller';
import { authenticateToken, requireAdmin } from '../middleware/bearAuth';
import {
    apiRateLimiter,
    adminActionsRateLimiter
} from '../middleware/rateLimiter';

const router = Router();

// MAINTENANCE STATISTICS - Must come before other routes (following guide exactly)
router.get('/statistics', authenticateToken, adminActionsRateLimiter, maintenanceController.getMaintenanceStatistics);

// GET ALL MAINTENANCE RECORDS - Main route as per guide (admin access)
router.get('/', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.getAllMaintenanceRecords);

// VEHICLE-SPECIFIC MAINTENANCE ROUTES - Primary frontend use case
router.get('/vehicle/:vehicleId', authenticateToken, apiRateLimiter, maintenanceController.getVehicleMaintenanceRecords);
router.post('/vehicle/:vehicleId', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.createMaintenanceRecord);
router.put('/vehicle/:vehicleId/:maintenanceId', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.updateMaintenanceRecord);
router.delete('/vehicle/:vehicleId/:maintenanceId', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.deleteMaintenanceRecord);

// ADDITIONAL HELPFUL ENDPOINTS - As specified in guide
router.get('/upcoming', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.getUpcomingMaintenance);
router.get('/overdue', authenticateToken, requireAdmin, adminActionsRateLimiter, maintenanceController.getOverdueMaintenance);

// INDIVIDUAL MAINTENANCE RECORD - Must come last to avoid route conflicts
router.get('/:maintenanceId', authenticateToken, apiRateLimiter, maintenanceController.getMaintenanceRecordById);

export default router;
