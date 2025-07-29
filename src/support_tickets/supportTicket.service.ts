import { eq, and, or, like, gte, lte, desc, asc, count } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { supportTickets } from '../drizzle/schema';
import { ErrorFactory } from '../middleware/appError';
import { logger } from '../middleware/logger';
import { PaginationInfo } from '../middleware/response';

export interface CreateSupportTicketDto {
    subject: string;
    description: string;
    category: 'general' | 'technical' | 'booking' | 'payment' | 'vehicle';
    priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UpdateSupportTicketDto {
    subject?: string;
    description?: string;
    category?: 'general' | 'technical' | 'booking' | 'payment' | 'vehicle';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    assigned_to?: string;
    resolution?: string;
    admin_notes?: string;
}

export interface SupportTicketQuery {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface SupportTicketResponse {
    tickets: any[];
    pagination: PaginationInfo;
}

export interface SupportTicketStats {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    by_priority: {
        low: number;
        medium: number;
        high: number;
        urgent: number;
    };
    by_category: {
        general: number;
        technical: number;
        booking: number;
        payment: number;
        vehicle: number;
    };
}

class SupportTicketService {

    /**
     * Create a new support ticket
     */
    async createSupportTicket(data: CreateSupportTicketDto, userId: string) {
        try {
            logger.info('Creating support ticket', { userId, data });

            const ticketData = {
                user_id: userId,
                subject: data.subject,
                description: data.description,
                category: data.category,
                priority: data.priority,
                status: 'open' as const,
                created_at: new Date(),
                updated_at: new Date()
            };

            const [ticket] = await db.insert(supportTickets)
                .values(ticketData)
                .returning();

            logger.info('Support ticket created successfully', { ticketId: ticket.ticket_id });

            return ticket;
        } catch (error) {
            logger.error('Error creating support ticket', { error, userId, data });
            throw ErrorFactory.database('Failed to create support ticket');
        }
    }

    /**
     * Get all support tickets with filters and pagination
     */
    async getAllSupportTickets(query: SupportTicketQuery, userId?: string, isAdmin: boolean = false): Promise<SupportTicketResponse> {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                priority,
                category,
                assigned_to,
                start_date,
                end_date,
                search,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = query;

            const offset = (page - 1) * limit;
            const conditions = [];

            // If not admin, only show user's own tickets
            if (!isAdmin && userId) {
                conditions.push(eq(supportTickets.user_id, userId));
            }

            // Add filters
            if (status) {
                conditions.push(eq(supportTickets.status, status as any));
            }

            if (priority) {
                conditions.push(eq(supportTickets.priority, priority as any));
            }

            if (category) {
                conditions.push(eq(supportTickets.category, category as any));
            }

            if (assigned_to) {
                conditions.push(eq(supportTickets.assigned_to, assigned_to));
            }

            if (start_date) {
                conditions.push(gte(supportTickets.created_at, new Date(start_date)));
            }

            if (end_date) {
                conditions.push(lte(supportTickets.created_at, new Date(end_date)));
            }

            if (search) {
                conditions.push(
                    or(
                        like(supportTickets.subject, `%${search}%`),
                        like(supportTickets.description, `%${search}%`)
                    )
                );
            }

            // Build the where clause
            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            // Build sort order
            let orderBy;
            const sortColumn = supportTickets[sortBy as keyof typeof supportTickets] as any;
            if (sortColumn) {
                orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
            } else {
                orderBy = desc(supportTickets.created_at);
            }

            // Get tickets with pagination
            const tickets = await db.select()
                .from(supportTickets)
                .where(whereClause)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset);

            // Get total count
            const [totalResult] = await db.select({ count: count() })
                .from(supportTickets)
                .where(whereClause);

            const total = totalResult?.count || 0;
            const totalPages = Math.ceil(total / limit);

            const pagination: PaginationInfo = {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            };

            logger.info('Support tickets retrieved', {
                count: tickets.length,
                total,
                page,
                isAdmin,
                userId: userId || 'admin'
            });

            return { tickets, pagination };
        } catch (error) {
            logger.error('Error getting support tickets', { error, query, userId, isAdmin });
            throw ErrorFactory.database('Failed to retrieve support tickets');
        }
    }

    /**
     * Get support ticket by ID
     */
    async getSupportTicketById(ticketId: string, userId?: string, isAdmin: boolean = false) {
        try {
            logger.info('Getting support ticket by ID', { ticketId, userId, isAdmin });

            const conditions = [eq(supportTickets.ticket_id, ticketId)];

            // If not admin, only allow access to user's own tickets
            if (!isAdmin && userId) {
                conditions.push(eq(supportTickets.user_id, userId));
            }

            const [ticket] = await db.select()
                .from(supportTickets)
                .where(and(...conditions));

            if (!ticket) {
                throw ErrorFactory.notFound('Support ticket');
            }

            logger.info('Support ticket retrieved', { ticketId });

            return ticket;
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            logger.error('Error getting support ticket', { error, ticketId, userId });
            throw ErrorFactory.database('Failed to retrieve support ticket');
        }
    }

    /**
     * Update support ticket
     */
    async updateSupportTicket(ticketId: string, data: UpdateSupportTicketDto, userId?: string, isAdmin: boolean = false) {
        try {
            logger.info('Updating support ticket', { ticketId, data, userId, isAdmin });

            // First check if ticket exists and user has permission
            await this.getSupportTicketById(ticketId, userId, isAdmin);

            const updateData: any = {
                ...data,
                updated_at: new Date()
            };

            const conditions = [eq(supportTickets.ticket_id, ticketId)];

            // If not admin, only allow updating user's own tickets (and only certain fields)
            if (!isAdmin && userId) {
                conditions.push(eq(supportTickets.user_id, userId));

                // Non-admin users can only update certain fields
                const allowedFields = ['subject', 'description', 'category', 'priority'];
                const filteredData: any = { updated_at: new Date() };

                Object.keys(updateData).forEach(key => {
                    if (allowedFields.includes(key) && updateData[key] !== undefined) {
                        filteredData[key] = updateData[key];
                    }
                });

                Object.assign(updateData, filteredData);
            }

            const [updatedTicket] = await db.update(supportTickets)
                .set(updateData)
                .where(and(...conditions))
                .returning();

            if (!updatedTicket) {
                throw ErrorFactory.notFound('Support ticket');
            }

            logger.info('Support ticket updated successfully', { ticketId });

            return updatedTicket;
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            logger.error('Error updating support ticket', { error, ticketId, data, userId });
            throw ErrorFactory.database('Failed to update support ticket');
        }
    }

    /**
     * Delete support ticket (admin only)
     */
    async deleteSupportTicket(ticketId: string, isAdmin: boolean = false) {
        try {
            if (!isAdmin) {
                throw ErrorFactory.forbidden('Only administrators can delete support tickets');
            }

            logger.info('Deleting support ticket', { ticketId });

            // Check if ticket exists
            await this.getSupportTicketById(ticketId, undefined, true);

            const [deletedTicket] = await db.delete(supportTickets)
                .where(eq(supportTickets.ticket_id, ticketId))
                .returning();

            if (!deletedTicket) {
                throw ErrorFactory.notFound('Support ticket');
            }

            logger.info('Support ticket deleted successfully', { ticketId });

            return deletedTicket;
        } catch (error) {
            if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Forbidden'))) {
                throw error;
            }
            logger.error('Error deleting support ticket', { error, ticketId });
            throw ErrorFactory.database('Failed to delete support ticket');
        }
    }

    /**
     * Assign ticket to support agent (admin only)
     */
    async assignTicket(ticketId: string, assignedTo: string, isAdmin: boolean = false) {
        try {
            if (!isAdmin) {
                throw ErrorFactory.forbidden('Only administrators can assign support tickets');
            }

            logger.info('Assigning support ticket', { ticketId, assignedTo });

            const updateData = {
                assigned_to: assignedTo,
                status: 'in_progress' as const,
                updated_at: new Date()
            };

            const [updatedTicket] = await db.update(supportTickets)
                .set(updateData)
                .where(eq(supportTickets.ticket_id, ticketId))
                .returning();

            if (!updatedTicket) {
                throw ErrorFactory.notFound('Support ticket');
            }

            logger.info('Support ticket assigned successfully', { ticketId, assignedTo });

            return updatedTicket;
        } catch (error) {
            if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Forbidden'))) {
                throw error;
            }
            logger.error('Error assigning support ticket', { error, ticketId, assignedTo });
            throw ErrorFactory.database('Failed to assign support ticket');
        }
    }

    /**
     * Get support ticket statistics (admin only)
     */
    async getSupportTicketStats(isAdmin: boolean = false): Promise<SupportTicketStats> {
        try {
            if (!isAdmin) {
                throw ErrorFactory.forbidden('Only administrators can view support ticket statistics');
            }

            logger.info('Getting support ticket statistics');

            // Get total count
            const [totalResult] = await db.select({ count: count() })
                .from(supportTickets);
            const total = totalResult?.count || 0;

            // Get counts by status
            const statusCounts = await db.select({
                status: supportTickets.status,
                count: count()
            })
                .from(supportTickets)
                .groupBy(supportTickets.status);

            // Get counts by priority
            const priorityCounts = await db.select({
                priority: supportTickets.priority,
                count: count()
            })
                .from(supportTickets)
                .groupBy(supportTickets.priority);

            // Get counts by category
            const categoryCounts = await db.select({
                category: supportTickets.category,
                count: count()
            })
                .from(supportTickets)
                .groupBy(supportTickets.category);

            // Build stats object
            const stats: SupportTicketStats = {
                total,
                open: 0,
                in_progress: 0,
                resolved: 0,
                closed: 0,
                by_priority: {
                    low: 0,
                    medium: 0,
                    high: 0,
                    urgent: 0
                },
                by_category: {
                    general: 0,
                    technical: 0,
                    booking: 0,
                    payment: 0,
                    vehicle: 0
                }
            };

            // Populate status counts
            statusCounts.forEach((item: any) => {
                const status = item.status as keyof typeof stats;
                if (status in stats && typeof stats[status] === 'number') {
                    (stats as any)[status] = item.count;
                }
            });

            // Populate priority counts
            priorityCounts.forEach((item: any) => {
                const priority = item.priority as keyof typeof stats.by_priority;
                if (priority in stats.by_priority) {
                    stats.by_priority[priority] = item.count;
                }
            });

            // Populate category counts
            categoryCounts.forEach((item: any) => {
                const category = item.category as keyof typeof stats.by_category;
                if (category in stats.by_category) {
                    stats.by_category[category] = item.count;
                }
            });

            logger.info('Support ticket statistics retrieved', { total });

            return stats;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Forbidden')) {
                throw error;
            }
            logger.error('Error getting support ticket statistics', { error });
            throw ErrorFactory.database('Failed to retrieve support ticket statistics');
        }
    }

    /**
     * Get dropdown options for support tickets
     */
    async getSupportTicketDropdowns() {
        try {
            const dropdowns = {
                categories: [
                    { value: 'general', label: 'General Inquiry' },
                    { value: 'technical', label: 'Technical Support' },
                    { value: 'booking', label: 'Booking Issues' },
                    { value: 'payment', label: 'Payment Issues' },
                    { value: 'vehicle', label: 'Vehicle Issues' }
                ],
                priorities: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                ],
                statuses: [
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' }
                ]
            };

            return dropdowns;
        } catch (error) {
            logger.error('Error getting support ticket dropdowns', { error });
            throw ErrorFactory.internal('Failed to retrieve dropdown options');
        }
    }
}

export const supportTicketService = new SupportTicketService();
