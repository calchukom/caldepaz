import { Router } from 'express';
import { supportTicketController } from './supportTicket.controller';
import { authenticateToken, requireAdmin, requireAdminOrAgent } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import {
    apiRateLimiter,
    adminActionsRateLimiter,
    reportingRateLimiter
} from '../middleware/rateLimiter';
import {
    createSupportTicketSchema,
    updateSupportTicketSchema,
    supportTicketQuerySchema,
    updateTicketStatusSchema,
    assignTicketSchema,
    bulkUpdateTicketStatusSchema,
    getSupportTicketSchema
} from '../validation/supportTicket.validator';

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * @route   GET /api/support-tickets/categories
 * @desc    Get available ticket categories
 * @access  Public
 */
router.get('/categories', apiRateLimiter, supportTicketController.getTicketCategories);

/**
 * @route   GET /api/support-tickets/priorities
 * @desc    Get available ticket priorities
 * @access  Public
 */
router.get('/priorities', apiRateLimiter, supportTicketController.getTicketPriorities);

/**
 * @route   GET /api/support-tickets/statuses
 * @desc    Get available ticket statuses
 * @access  Public
 */
router.get('/statuses', apiRateLimiter, supportTicketController.getTicketStatuses);

// ============================================================================
// AUTHENTICATED ROUTES (User must be logged in)
// ============================================================================

/**
 * @route   POST /api/support-tickets
 * @desc    Create a new support ticket
 * @access  Private (User)
 */
router.post('/', authenticateToken, reportingRateLimiter, validate(createSupportTicketSchema), supportTicketController.createSupportTicket);

/**
 * @route   GET /api/support-tickets
 * @desc    Get all support tickets (User sees own tickets, Admin/Agent sees all)
 * @access  Private (User/Admin/Agent)
 */
router.get('/', authenticateToken, apiRateLimiter, validate(supportTicketQuerySchema), supportTicketController.getAllSupportTickets);

/**
 * @route   GET /api/support-tickets/statistics
 * @desc    Get ticket statistics (User gets own stats, Admin/Agent gets all stats)
 * @access  Private (User/Admin/Agent)
 */
router.get('/statistics', authenticateToken, adminActionsRateLimiter, supportTicketController.getTicketStatistics);

/**
 * @route   GET /api/support-tickets/:id
 * @desc    Get support ticket by ID (User can only access own tickets)
 * @access  Private (User/Admin/Agent)
 */
router.get('/:id', authenticateToken, apiRateLimiter, validate(getSupportTicketSchema), supportTicketController.getSupportTicketById);

/**
 * @route   PUT /api/support-tickets/:id
 * @desc    Update support ticket (User can only update own tickets, limited fields)
 * @access  Private (User/Admin/Agent)
 */
router.put('/:id', authenticateToken, apiRateLimiter, validate(updateSupportTicketSchema), supportTicketController.updateSupportTicket);

// ============================================================================
// ADMIN & AGENT ROUTES
// ============================================================================

/**
 * @route   PATCH /api/support-tickets/bulk/status
 * @desc    Bulk update ticket status
 * @access  Private (Admin)
 */
router.patch('/bulk/status', authenticateToken, requireAdmin, adminActionsRateLimiter, validate(bulkUpdateTicketStatusSchema), supportTicketController.bulkUpdateTicketStatus);

/**
 * @route   PATCH /api/support-tickets/:id/status
 * @desc    Update ticket status
 * @access  Private (User/Admin/Agent)
 */
router.patch('/:id/status', authenticateToken, adminActionsRateLimiter, validate(updateTicketStatusSchema), supportTicketController.updateTicketStatus);

/**
 * @route   GET /api/support-tickets/assigned/me
 * @desc    Get tickets assigned to current agent
 * @access  Private (Admin/Agent)
 */
router.get('/assigned/me', authenticateToken, requireAdminOrAgent, adminActionsRateLimiter, supportTicketController.getMyAssignedTickets);

/**
 * @route   GET /api/support-tickets/agents/available
 * @desc    Get available support agents
 * @access  Private (Admin/Agent)
 */
router.get('/agents/available', authenticateToken, requireAdminOrAgent, adminActionsRateLimiter, supportTicketController.getAvailableAgents);

/**
 * @route   PATCH /api/support-tickets/:id/assign
 * @desc    Assign ticket to agent
 * @access  Private (Admin/Agent)
 */
router.patch('/:id/assign', authenticateToken, requireAdminOrAgent, adminActionsRateLimiter, validate(assignTicketSchema), supportTicketController.assignTicket);

// ============================================================================
// ADMIN ONLY ROUTES
// ============================================================================

/**
 * @route   DELETE /api/support-tickets/:id
 * @desc    Delete support ticket (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, adminActionsRateLimiter, supportTicketController.deleteSupportTicket);

export default router;