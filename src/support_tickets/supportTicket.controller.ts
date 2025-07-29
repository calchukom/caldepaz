import { Request, Response, NextFunction } from 'express';
import { supportTicketService } from './supportTicket.service';
import { ResponseUtil } from '../middleware/response';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';
import { AuthenticatedRequest } from '../middleware/bearAuth';
import { getWebSocketService } from '../services/websocket.service';
import { AgentService } from '../agents/agent.service';

export class SupportTicketController {

    /**
     * Create a new support ticket
     */
    async createSupportTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.unauthorized('User authentication required');
            }

            const ticket = await supportTicketService.createSupportTicket(req.body, userId);

            // Send WebSocket notification
            const webSocketService = getWebSocketService();
            logger.info('🔌 WebSocket service status', {
                service: 'support-tickets',
                webSocketServiceExists: !!webSocketService,
                ticketId: ticket.ticket_id
            });

            if (webSocketService) {
                webSocketService.notifyTicketCreated(ticket);
            } else {
                logger.warn('⚠️ WebSocket service not available for notification', {
                    service: 'support-tickets',
                    ticketId: ticket.ticket_id
                });
            } ResponseUtil.created(res, ticket, 'Support ticket created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all support tickets with filters and pagination
     */
    async getAllSupportTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            const query = {
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
                status: req.query.status as string,
                priority: req.query.priority as string,
                category: req.query.category as string,
                assigned_to: req.query.assigned_to as string,
                start_date: req.query.start_date as string,
                end_date: req.query.end_date as string,
                search: req.query.search as string,
                sortBy: (req.query.sortBy as string) || 'created_at',
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
            };

            const result = await supportTicketService.getAllSupportTickets(query, userId, isAdmin);

            ResponseUtil.success(res, result, 'Support tickets retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get support ticket by ID
     */
    async getSupportTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            const ticket = await supportTicketService.getSupportTicketById(id, userId, isAdmin);

            ResponseUtil.success(res, ticket, 'Support ticket retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update support ticket
     */
    async updateSupportTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            const ticket = await supportTicketService.updateSupportTicket(id, req.body, userId, isAdmin);

            ResponseUtil.updated(res, ticket, 'Support ticket updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update ticket status
     */
    async updateTicketStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            const ticket = await supportTicketService.updateSupportTicket(
                id,
                { status },
                userId,
                isAdmin
            );

            ResponseUtil.updated(res, ticket, 'Ticket status updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Assign ticket to agent (Admin/Support Agent only)
     */
    async assignTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { assigned_to } = req.body;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            const ticket = await supportTicketService.assignTicket(id, assigned_to, isAdmin);

            ResponseUtil.updated(res, ticket, 'Support ticket assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get ticket statistics
     */
    async getTicketStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            let stats;
            if (isAdmin) {
                stats = await supportTicketService.getSupportTicketStats(true);
            } else {
                // For regular users, get their own ticket stats
                const userTickets = await supportTicketService.getAllSupportTickets(
                    { page: 1, limit: 1000 }, // Get all user tickets
                    userId,
                    false
                );

                const tickets = userTickets.tickets;
                stats = {
                    total: tickets.length,
                    open: tickets.filter(t => t.status === 'open').length,
                    in_progress: tickets.filter(t => t.status === 'in_progress').length,
                    pending: tickets.filter(t => t.status === 'pending').length,
                    resolved: tickets.filter(t => t.status === 'resolved').length,
                    closed: tickets.filter(t => t.status === 'closed').length,
                    by_priority: {
                        low: tickets.filter(t => t.priority === 'low').length,
                        medium: tickets.filter(t => t.priority === 'medium').length,
                        high: tickets.filter(t => t.priority === 'high').length,
                        urgent: tickets.filter(t => t.priority === 'urgent').length
                    },
                    by_category: {
                        general: tickets.filter(t => t.category === 'general').length,
                        technical: tickets.filter(t => t.category === 'technical').length,
                        billing: tickets.filter(t => t.category === 'billing').length,
                        feedback: tickets.filter(t => t.category === 'feedback').length,
                        bug_report: tickets.filter(t => t.category === 'bug_report').length,
                        feature_request: tickets.filter(t => t.category === 'feature_request').length
                    }
                };
            }

            ResponseUtil.success(res, stats, 'Ticket statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete support ticket (Admin only)
     */
    async deleteSupportTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const isAdmin = req.user?.role === 'admin';

            const result = await supportTicketService.deleteSupportTicket(id, isAdmin);

            ResponseUtil.deleted(res, 'Support ticket deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get tickets assigned to current agent
     */
    async getMyAssignedTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'support_agent';

            if (!isAdmin) {
                throw ErrorFactory.forbidden('Only support agents can access assigned tickets');
            }

            const query = {
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
                assigned_to: userId,
                sortBy: (req.query.sortBy as string) || 'updated_at',
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
            };

            const result = await supportTicketService.getAllSupportTickets(query, undefined, true);

            ResponseUtil.success(res, result, 'Assigned tickets retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get available support agents
     */
    async getAvailableAgents(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Getting available support agents');

            // Get agents with their current workload
            const agentsWorkload = await AgentService.getAgentWorkload();

            // Format response to match the expected structure
            const agents = agentsWorkload.map(agent => ({
                id: agent.agent_id,
                name: agent.agent_name,
                email: agent.email,
                active_tickets: agent.open_tickets + agent.in_progress_tickets,
                open_tickets: agent.open_tickets,
                in_progress_tickets: agent.in_progress_tickets,
                resolved_tickets: agent.resolved_tickets,
                total_tickets: agent.total_tickets,
                workload_score: agent.current_workload_score,
                avg_resolution_time_hours: agent.avg_resolution_time_hours || 0
            }));

            // Sort by workload score (ascending - least busy first)
            agents.sort((a, b) => a.workload_score - b.workload_score);

            logger.info('Available agents retrieved successfully', { count: agents.length });
            ResponseUtil.success(res, agents, 'Available agents retrieved successfully');
        } catch (error) {
            logger.error('Error getting available agents', { error });
            next(error);
        }
    }

    /**
     * Bulk update ticket status (Admin only)
     */
    async bulkUpdateTicketStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { ticket_ids, status } = req.body;
            const isAdmin = req.user?.role === 'admin';

            if (!isAdmin) {
                throw ErrorFactory.forbidden('Only administrators can perform bulk updates');
            }

            const updatePromises = ticket_ids.map((id: string) =>
                supportTicketService.updateSupportTicket(id, { status }, undefined, true)
            );

            const results = await Promise.allSettled(updatePromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            ResponseUtil.success(res,
                { successful, failed, total: ticket_ids.length },
                `Bulk update completed: ${successful} successful, ${failed} failed`
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get ticket categories (for dropdowns)
     */
    async getTicketCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const dropdowns = await supportTicketService.getSupportTicketDropdowns();
            ResponseUtil.success(res, dropdowns.categories, 'Ticket categories retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get ticket priorities (for dropdowns)
     */
    async getTicketPriorities(req: Request, res: Response, next: NextFunction) {
        try {
            const dropdowns = await supportTicketService.getSupportTicketDropdowns();
            ResponseUtil.success(res, dropdowns.priorities, 'Ticket priorities retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get ticket statuses (for dropdowns)
     */
    async getTicketStatuses(req: Request, res: Response, next: NextFunction) {
        try {
            const dropdowns = await supportTicketService.getSupportTicketDropdowns();
            ResponseUtil.success(res, dropdowns.statuses, 'Ticket statuses retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const supportTicketController = new SupportTicketController();