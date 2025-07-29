import { Router } from 'express';
import { AgentController } from './agent.controller';
import { authenticateToken, requireAdminOrAgent } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const agentController = new AgentController();

// Validation schemas
const getAgentsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        status: z.enum(['active', 'inactive', 'busy', 'available']).optional(),
        search: z.string().min(1).max(100).optional(),
        sortBy: z.enum(['created_at', 'firstname', 'lastname', 'email']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
    })
});

const getAgentWorkloadSchema = z.object({
    query: z.object({
        agent_id: z.string().uuid('Agent ID must be a valid UUID').optional()
    })
});

const getAgentAnalyticsSchema = z.object({
    query: z.object({
        date_range: z.enum(['last_7_days', 'last_30_days', 'last_90_days']).optional()
    })
});

const assignAgentSchema = z.object({
    params: z.object({
        ticketId: z.string().uuid('Ticket ID must be a valid UUID')
    }),
    body: z.object({
        agentId: z.string().uuid('Agent ID must be a valid UUID'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        specialization: z.string().min(1).max(100).optional(),
        assignmentNote: z.string().min(1).max(500).optional()
    })
});

const getAgentByIdSchema = z.object({
    params: z.object({
        agentId: z.string().uuid('Agent ID must be a valid UUID')
    })
});

const updateAgentStatusSchema = z.object({
    params: z.object({
        id: z.string().uuid('Agent ID must be a valid UUID')
    }),
    body: z.object({
        status: z.enum(['active', 'inactive', 'busy', 'available'])
    })
});

// Routes

/**
 * @route GET /api/agents
 * @desc Get all support agents with filters and pagination
 * @access Admin/Agent only
 */
router.get(
    '/',
    authenticateToken,
    requireAdminOrAgent,
    validate(getAgentsSchema),
    agentController.getAllAgents.bind(agentController)
);

/**
 * @route GET /api/agents/statistics
 * @desc Get agent statistics
 * @access Admin/Agent only
 */
router.get(
    '/statistics',
    authenticateToken,
    requireAdminOrAgent,
    agentController.getAgentStatistics.bind(agentController)
);

/**
 * @route GET /api/agents/workload
 * @desc Get agent workload data
 * @access Admin/Agent only
 */
router.get(
    '/workload',
    authenticateToken,
    requireAdminOrAgent,
    validate(getAgentWorkloadSchema),
    agentController.getAgentWorkload.bind(agentController)
);

/**
 * @route GET /api/agents/specializations
 * @desc Get agent specializations
 * @access Admin/Agent only
 */
router.get(
    '/specializations',
    authenticateToken,
    requireAdminOrAgent,
    agentController.getSpecializations.bind(agentController)
);

/**
 * @route GET /api/agents/analytics
 * @desc Get agent analytics
 * @access Admin/Agent only
 */
router.get(
    '/analytics',
    authenticateToken,
    requireAdminOrAgent,
    validate(getAgentAnalyticsSchema),
    agentController.getAgentAnalytics.bind(agentController)
);

/**
 * @route POST /api/agents/assign/:ticketId
 * @desc Assign agent to ticket
 * @access Admin/Agent only
 */
router.post(
    '/assign/:ticketId',
    authenticateToken,
    requireAdminOrAgent,
    validate(assignAgentSchema),
    agentController.assignAgent.bind(agentController)
);

/**
 * @route GET /api/agents/:agentId
 * @desc Get agent by ID
 * @access Admin/Agent only
 */
router.get(
    '/:agentId',
    authenticateToken,
    requireAdminOrAgent,
    validate(getAgentByIdSchema),
    agentController.getAgentById.bind(agentController)
);

/**
 * @route PATCH /api/agents/:id/status
 * @desc Update agent availability status
 * @access Admin/Agent only
 */
router.patch(
    '/:id/status',
    authenticateToken,
    requireAdminOrAgent,
    validate(updateAgentStatusSchema),
    agentController.updateAgentStatus.bind(agentController)
);

export default router;
