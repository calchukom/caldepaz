import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/bearAuth';
import { AgentService } from './agent.service';
import { ResponseUtil } from '../middleware/response';
import { logger } from '../middleware/logger';

export class AgentController {

    /**
     * Get all agents with filters and pagination
     */
    async getAllAgents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                role = 'support_agent',
                search,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = req.query;

            logger.info('Getting all agents', {
                page,
                limit,
                status,
                role,
                search,
                sortBy,
                sortOrder,
                requestedBy: req.user?.userId
            });

            const result = await AgentService.getAllAgents({
                page: Number(page),
                limit: Number(limit),
                status: status as string,
                role: role as string,
                search: search as string,
                sortBy: sortBy as string,
                sortOrder: sortOrder as 'asc' | 'desc'
            });

            ResponseUtil.success(res, result, 'Agents retrieved successfully');
        } catch (error) {
            logger.error('Error in getAllAgents controller', { error });
            next(error);
        }
    }

    /**
     * Get agent statistics
     */
    async getAgentStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            logger.info('Getting agent statistics', { requestedBy: req.user?.userId });

            const statistics = await AgentService.getAgentStatistics();
            ResponseUtil.success(res, statistics, 'Agent statistics retrieved successfully');
        } catch (error) {
            logger.error('Error in getAgentStatistics controller', { error });
            next(error);
        }
    }

    /**
     * Get agent workload
     */
    async getAgentWorkload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { agent_id } = req.query;

            logger.info('Getting agent workload', {
                agent_id,
                requestedBy: req.user?.userId
            });

            const workload = await AgentService.getAgentWorkload(agent_id as string);
            ResponseUtil.success(res, workload, 'Agent workload retrieved successfully');
        } catch (error) {
            logger.error('Error in getAgentWorkload controller', { error });
            next(error);
        }
    }

    /**
     * Get agent specializations
     */
    async getSpecializations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            logger.info('Getting agent specializations', { requestedBy: req.user?.userId });

            const specializations = await AgentService.getSpecializations();
            ResponseUtil.success(res, specializations, 'Specializations retrieved successfully');
        } catch (error) {
            logger.error('Error in getSpecializations controller', { error });
            next(error);
        }
    }

    /**
     * Get agent analytics
     */
    async getAgentAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { date_range } = req.query;

            logger.info('Getting agent analytics', {
                date_range,
                requestedBy: req.user?.userId
            });

            const analytics = await AgentService.getAgentAnalytics(date_range as string);
            ResponseUtil.success(res, analytics, 'Agent analytics retrieved successfully');
        } catch (error) {
            logger.error('Error in getAgentAnalytics controller', { error });
            next(error);
        }
    }

    /**
     * Assign agent to ticket
     */
    async assignAgent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { ticketId } = req.params;
            const { agentId, priority, specialization, assignmentNote } = req.body;

            logger.info('Assigning agent to ticket', {
                ticketId,
                agentId,
                priority,
                specialization,
                requestedBy: req.user?.userId
            });

            const result = await AgentService.assignAgent(ticketId, {
                agentId,
                priority,
                specialization,
                assignmentNote
            });

            ResponseUtil.success(res, result, 'Agent assigned successfully');
        } catch (error) {
            logger.error('Error in assignAgent controller', { error });
            next(error);
        }
    }

    /**
     * Get single agent by ID
     */
    async getAgentById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { agentId } = req.params;

            logger.info('Getting agent by ID', {
                agentId,
                requestedBy: req.user?.userId
            });

            const agent = await AgentService.getAgentById(agentId);
            ResponseUtil.success(res, agent, 'Agent retrieved successfully');
        } catch (error) {
            logger.error('Error in getAgentById controller', { error });
            next(error);
        }
    }

    /**
     * Update agent status
     */
    async updateAgentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            logger.info('Updating agent status', {
                agentId: id,
                status,
                requestedBy: req.user?.userId
            });

            const result = await AgentService.updateAgentStatus(id, status);
            ResponseUtil.success(res, result, 'Agent status updated successfully');
        } catch (error) {
            logger.error('Error in updateAgentStatus controller', { error });
            next(error);
        }
    }
}
