import { eq, and, or, like, gte, lte, desc, asc, count, isNull, isNotNull, sql } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { users, supportTickets } from '../drizzle/schema';
import { ErrorFactory } from '../middleware/appError';
import { logger } from '../middleware/logger';
import { PaginationInfo } from '../middleware/response';

export interface GetAllAgentsQuery {
    page: number;
    limit: number;
    status?: string;
    role?: string;
    search?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface AgentWorkload {
    agent_id: string;
    agent_name: string;
    email: string;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    total_tickets: number;
    avg_resolution_time_hours?: number;
    current_workload_score: number;
}

export interface AgentStatistics {
    total_agents: number;
    active_agents: number;
    agents_with_tickets: number;
    total_tickets_assigned: number;
    avg_tickets_per_agent: number;
    workload_distribution: {
        low: number;
        medium: number;
        high: number;
        overloaded: number;
    };
}

export interface AgentAnalytics {
    date_range: string;
    performance_metrics: {
        total_resolved: number;
        avg_resolution_time_hours: number;
        customer_satisfaction: number;
        response_time_minutes: number;
    };
    top_performers: Array<{
        agent_id: string;
        agent_name: string;
        resolved_count: number;
        avg_resolution_time: number;
    }>;
    category_distribution: Array<{
        category: string;
        count: number;
        avg_resolution_time: number;
    }>;
}

export interface AssignmentData {
    agentId: string;
    priority?: string;
    specialization?: string;
    assignmentNote?: string;
}

export class AgentService {

    /**
     * Get all support agents with filters and pagination
     */
    static async getAllAgents(query: GetAllAgentsQuery) {
        try {
            const { page, limit, status, search, sortBy, sortOrder } = query;
            const offset = (page - 1) * limit;
            const conditions = [];

            // Only get support agents and admins
            conditions.push(or(
                eq(users.role, 'support_agent'),
                eq(users.role, 'admin')
            ));

            // Search filter
            if (search) {
                conditions.push(
                    or(
                        like(users.firstname, `%${search}%`),
                        like(users.lastname, `%${search}%`),
                        like(users.email, `%${search}%`)
                    )
                );
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            // Build sort order
            let orderBy;
            const sortColumn = users[sortBy as keyof typeof users] as any;
            if (sortColumn) {
                orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
            } else {
                orderBy = desc(users.created_at);
            }

            // Get agents with their ticket counts
            const agentsQuery = db
                .select({
                    user_id: users.user_id,
                    firstname: users.firstname,
                    lastname: users.lastname,
                    email: users.email,
                    role: users.role,
                    contact_phone: users.contact_phone,
                    address: users.address,
                    created_at: users.created_at,
                    updated_at: users.updated_at,
                    total_tickets: sql<number>`CAST(COUNT(${supportTickets.ticket_id}) AS INTEGER)`,
                    open_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'open' THEN 1 ELSE 0 END) AS INTEGER)`,
                    in_progress_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'in_progress' THEN 1 ELSE 0 END) AS INTEGER)`,
                    resolved_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'resolved' THEN 1 ELSE 0 END) AS INTEGER)`
                })
                .from(users)
                .leftJoin(supportTickets as any, eq(users.user_id, supportTickets.assigned_to))
                .where(whereClause)
                .groupBy(users.user_id)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset);

            const agents = await agentsQuery;

            // Get total count
            const [totalResult] = await db
                .select({ count: count() })
                .from(users)
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

            logger.info('Support agents retrieved successfully', {
                count: agents.length,
                total,
                page
            });

            return {
                agents: agents.map((agent: any) => ({
                    ...agent,
                    full_name: `${agent.firstname} ${agent.lastname}`,
                    workload_score: this.calculateWorkloadScore(
                        agent.open_tickets || 0,
                        agent.in_progress_tickets || 0
                    )
                })),
                pagination
            };
        } catch (error) {
            logger.error('Error getting all agents', { error, query });
            throw ErrorFactory.database('Failed to retrieve support agents');
        }
    }

    /**
     * Get agent statistics
     */
    static async getAgentStatistics(): Promise<AgentStatistics> {
        try {
            logger.info('Getting agent statistics');

            // Get total agents count
            const [totalAgentsResult] = await db
                .select({ count: count() })
                .from(users)
                .where(or(
                    eq(users.role, 'support_agent'),
                    eq(users.role, 'admin')
                ));

            const total_agents = totalAgentsResult?.count || 0;

            // Get agents with ticket assignments
            const agentsWithTickets = await db
                .select({
                    agent_id: users.user_id,
                    total_tickets: sql<number>`CAST(COUNT(${supportTickets.ticket_id}) AS INTEGER)`,
                    open_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'open' THEN 1 ELSE 0 END) AS INTEGER)`,
                    in_progress_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'in_progress' THEN 1 ELSE 0 END) AS INTEGER)`
                })
                .from(users)
                .leftJoin(supportTickets as any, eq(users.user_id, supportTickets.assigned_to))
                .where(or(
                    eq(users.role, 'support_agent'),
                    eq(users.role, 'admin')
                ))
                .groupBy(users.user_id);

            const agents_with_tickets = agentsWithTickets.filter((agent: any) => agent.total_tickets > 0).length;
            const total_tickets_assigned = agentsWithTickets.reduce((sum: number, agent: any) => sum + agent.total_tickets, 0);
            const avg_tickets_per_agent = total_agents > 0 ? Math.round(total_tickets_assigned / total_agents) : 0;

            // Calculate workload distribution
            const workload_distribution = {
                low: 0,
                medium: 0,
                high: 0,
                overloaded: 0
            };

            agentsWithTickets.forEach((agent: any) => {
                const workloadScore = this.calculateWorkloadScore(
                    agent.open_tickets || 0,
                    agent.in_progress_tickets || 0
                );

                if (workloadScore <= 25) workload_distribution.low++;
                else if (workloadScore <= 50) workload_distribution.medium++;
                else if (workloadScore <= 75) workload_distribution.high++;
                else workload_distribution.overloaded++;
            });

            const statistics: AgentStatistics = {
                total_agents,
                active_agents: total_agents, // All agents are considered active
                agents_with_tickets,
                total_tickets_assigned,
                avg_tickets_per_agent,
                workload_distribution
            };

            logger.info('Agent statistics retrieved successfully', { statistics });
            return statistics;
        } catch (error) {
            logger.error('Error getting agent statistics', { error });
            throw ErrorFactory.database('Failed to retrieve agent statistics');
        }
    }

    /**
     * Get agent workload
     */
    static async getAgentWorkload(agentId?: string): Promise<AgentWorkload[]> {
        try {
            logger.info('Getting agent workload', { agentId });

            const conditions = [
                or(
                    eq(users.role, 'support_agent'),
                    eq(users.role, 'admin')
                )
            ];

            if (agentId) {
                conditions.push(eq(users.user_id, agentId));
            }

            const workloadData = await db
                .select({
                    agent_id: users.user_id,
                    agent_name: sql<string>`CONCAT(${users.firstname}, ' ', ${users.lastname})`,
                    email: users.email,
                    total_tickets: sql<number>`CAST(COUNT(${supportTickets.ticket_id}) AS INTEGER)`,
                    open_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'open' THEN 1 ELSE 0 END) AS INTEGER)`,
                    in_progress_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'in_progress' THEN 1 ELSE 0 END) AS INTEGER)`,
                    resolved_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'resolved' THEN 1 ELSE 0 END) AS INTEGER)`,
                    avg_resolution_time_hours: sql<number>`
                        CAST(
                            AVG(
                                CASE 
                                    WHEN ${supportTickets.status} = 'resolved' AND ${supportTickets.resolved_at} IS NOT NULL 
                                    THEN EXTRACT(EPOCH FROM (${supportTickets.resolved_at} - ${supportTickets.created_at})) / 3600 
                                    ELSE NULL 
                                END
                            ) AS INTEGER
                        )
                    `
                })
                .from(users)
                .leftJoin(supportTickets as any, eq(users.user_id, supportTickets.assigned_to))
                .where(and(...conditions))
                .groupBy(users.user_id, users.firstname, users.lastname, users.email);

            const workload: AgentWorkload[] = workloadData.map((agent: any) => ({
                ...agent,
                current_workload_score: this.calculateWorkloadScore(
                    agent.open_tickets || 0,
                    agent.in_progress_tickets || 0
                )
            }));

            logger.info('Agent workload retrieved successfully', { count: workload.length });
            return workload;
        } catch (error) {
            logger.error('Error getting agent workload', { error, agentId });
            throw ErrorFactory.database('Failed to retrieve agent workload');
        }
    }

    /**
     * Get agent specializations (categories they handle most)
     */
    static async getSpecializations() {
        try {
            logger.info('Getting agent specializations');

            const specializations = await db
                .select({
                    agent_id: users.user_id,
                    agent_name: sql<string>`CONCAT(${users.firstname}, ' ', ${users.lastname})`,
                    category: supportTickets.category,
                    ticket_count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
                    avg_resolution_time: sql<number>`
                        CAST(
                            AVG(
                                CASE 
                                    WHEN ${supportTickets.status} = 'resolved' AND ${supportTickets.resolved_at} IS NOT NULL 
                                    THEN EXTRACT(EPOCH FROM (${supportTickets.resolved_at} - ${supportTickets.created_at})) / 3600 
                                    ELSE NULL 
                                END
                            ) AS INTEGER
                        )
                    `
                })
                .from(users)
                .innerJoin(supportTickets as any, eq(users.user_id, supportTickets.assigned_to))
                .where(or(
                    eq(users.role, 'support_agent'),
                    eq(users.role, 'admin')
                ))
                .groupBy(users.user_id, users.firstname, users.lastname, supportTickets.category)
                .orderBy(desc(sql`COUNT(*)`));

            // Group by agent
            const agentSpecializations = specializations.reduce((acc: Record<string, any>, spec: any) => {
                if (!acc[spec.agent_id]) {
                    acc[spec.agent_id] = {
                        agent_id: spec.agent_id,
                        agent_name: spec.agent_name,
                        specializations: []
                    };
                }

                acc[spec.agent_id].specializations.push({
                    category: spec.category,
                    ticket_count: spec.ticket_count,
                    avg_resolution_time: spec.avg_resolution_time
                });

                return acc;
            }, {});

            const result = Object.values(agentSpecializations);

            logger.info('Agent specializations retrieved successfully', { count: result.length });
            return result;
        } catch (error) {
            logger.error('Error getting agent specializations', { error });
            throw ErrorFactory.database('Failed to retrieve agent specializations');
        }
    }

    /**
     * Get agent analytics
     */
    static async getAgentAnalytics(dateRange: string = 'last_30_days'): Promise<AgentAnalytics> {
        try {
            logger.info('Getting agent analytics', { dateRange });

            // Calculate date range
            const now = new Date();
            let startDate: Date;

            switch (dateRange) {
                case 'last_7_days':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'last_30_days':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'last_90_days':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            // Get performance metrics
            const [performanceResult] = await db
                .select({
                    total_resolved: sql<number>`CAST(COUNT(CASE WHEN ${supportTickets.status} = 'resolved' THEN 1 END) AS INTEGER)`,
                    avg_resolution_time_hours: sql<number>`
                        CAST(
                            AVG(
                                CASE 
                                    WHEN ${supportTickets.status} = 'resolved' AND ${supportTickets.resolved_at} IS NOT NULL 
                                    THEN EXTRACT(EPOCH FROM (${supportTickets.resolved_at} - ${supportTickets.created_at})) / 3600 
                                    ELSE NULL 
                                END
                            ) AS INTEGER
                        )
                    `
                })
                .from(supportTickets as any)
                .innerJoin(users as any, eq(supportTickets.assigned_to, users.user_id))
                .where(and(
                    gte(supportTickets.created_at, startDate),
                    or(
                        eq(users.role, 'support_agent'),
                        eq(users.role, 'admin')
                    )
                ));

            // Get top performers
            const topPerformers = await db
                .select({
                    agent_id: users.user_id,
                    agent_name: sql<string>`CONCAT(${users.firstname}, ' ', ${users.lastname})`,
                    resolved_count: sql<number>`CAST(COUNT(CASE WHEN ${supportTickets.status} = 'resolved' THEN 1 END) AS INTEGER)`,
                    avg_resolution_time: sql<number>`
                        CAST(
                            AVG(
                                CASE 
                                    WHEN ${supportTickets.status} = 'resolved' AND ${supportTickets.resolved_at} IS NOT NULL 
                                    THEN EXTRACT(EPOCH FROM (${supportTickets.resolved_at} - ${supportTickets.created_at})) / 3600 
                                    ELSE NULL 
                                END
                            ) AS INTEGER
                        )
                    `
                })
                .from(users)
                .innerJoin(supportTickets as any, eq(users.user_id, supportTickets.assigned_to))
                .where(and(
                    gte(supportTickets.created_at, startDate),
                    or(
                        eq(users.role, 'support_agent'),
                        eq(users.role, 'admin')
                    )
                ))
                .groupBy(users.user_id, users.firstname, users.lastname)
                .orderBy(desc(sql`COUNT(CASE WHEN ${supportTickets.status} = 'resolved' THEN 1 END)`))
                .limit(5);

            // Get category distribution
            const categoryDistribution = await db
                .select({
                    category: supportTickets.category,
                    count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
                    avg_resolution_time: sql<number>`
                        CAST(
                            AVG(
                                CASE 
                                    WHEN ${supportTickets.status} = 'resolved' AND ${supportTickets.resolved_at} IS NOT NULL 
                                    THEN EXTRACT(EPOCH FROM (${supportTickets.resolved_at} - ${supportTickets.created_at})) / 3600 
                                    ELSE NULL 
                                END
                            ) AS INTEGER
                        )
                    `
                })
                .from(supportTickets as any)
                .innerJoin(users as any, eq(supportTickets.assigned_to, users.user_id))
                .where(and(
                    gte(supportTickets.created_at, startDate),
                    or(
                        eq(users.role, 'support_agent'),
                        eq(users.role, 'admin')
                    )
                ))
                .groupBy(supportTickets.category);

            const analytics: AgentAnalytics = {
                date_range: dateRange,
                performance_metrics: {
                    total_resolved: performanceResult?.total_resolved || 0,
                    avg_resolution_time_hours: performanceResult?.avg_resolution_time_hours || 0,
                    customer_satisfaction: 4.2, // Mock data - would come from feedback system
                    response_time_minutes: 15 // Mock data - would come from chat system
                },
                top_performers: topPerformers,
                category_distribution: categoryDistribution
            };

            logger.info('Agent analytics retrieved successfully', { dateRange });
            return analytics;
        } catch (error) {
            logger.error('Error getting agent analytics', { error, dateRange });
            throw ErrorFactory.database('Failed to retrieve agent analytics');
        }
    }

    /**
     * Assign agent to ticket
     */
    static async assignAgent(ticketId: string, assignment: AssignmentData) {
        try {
            const { agentId, priority, assignmentNote } = assignment;

            logger.info('Assigning agent to ticket', { ticketId, agentId, priority });

            // Verify agent exists and has appropriate role
            const [agent] = await db
                .select()
                .from(users)
                .where(and(
                    eq(users.user_id, agentId),
                    or(
                        eq(users.role, 'support_agent'),
                        eq(users.role, 'admin')
                    )
                ));

            if (!agent) {
                throw ErrorFactory.notFound('Support agent');
            }

            // Update the ticket
            const updateData: any = {
                assigned_to: agentId,
                status: 'in_progress' as const,
                updated_at: new Date()
            };

            if (priority) {
                updateData.priority = priority;
            }

            if (assignmentNote) {
                updateData.admin_notes = assignmentNote;
            }

            const [updatedTicket] = await db
                .update(supportTickets)
                .set(updateData)
                .where(eq(supportTickets.ticket_id, ticketId))
                .returning();

            if (!updatedTicket) {
                throw ErrorFactory.notFound('Support ticket');
            }

            logger.info('Agent assigned to ticket successfully', { ticketId, agentId });

            return {
                ticket: updatedTicket,
                agent: {
                    agent_id: agent.user_id,
                    name: `${agent.firstname} ${agent.lastname}`,
                    email: agent.email
                }
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            logger.error('Error assigning agent to ticket', { error, ticketId, assignment });
            throw ErrorFactory.database('Failed to assign agent to ticket');
        }
    }

    /**
     * Get agent by ID
     */
    static async getAgentById(agentId: string) {
        try {
            logger.info('Getting agent by ID', { agentId });

            const [agent] = await db
                .select({
                    user_id: users.user_id,
                    firstname: users.firstname,
                    lastname: users.lastname,
                    email: users.email,
                    role: users.role,
                    contact_phone: users.contact_phone,
                    address: users.address,
                    created_at: users.created_at,
                    updated_at: users.updated_at,
                    total_tickets: sql<number>`CAST(COUNT(${supportTickets.ticket_id}) AS INTEGER)`,
                    open_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'open' THEN 1 ELSE 0 END) AS INTEGER)`,
                    in_progress_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'in_progress' THEN 1 ELSE 0 END) AS INTEGER)`,
                    resolved_tickets: sql<number>`CAST(SUM(CASE WHEN ${supportTickets.status} = 'resolved' THEN 1 ELSE 0 END) AS INTEGER)`
                })
                .from(users)
                .leftJoin(supportTickets as any, eq(users.user_id, supportTickets.assigned_to))
                .where(and(
                    eq(users.user_id, agentId),
                    or(
                        eq(users.role, 'support_agent'),
                        eq(users.role, 'admin')
                    )
                ))
                .groupBy(users.user_id);

            if (!agent) {
                throw ErrorFactory.notFound('Support agent');
            }

            const result = {
                ...agent,
                full_name: `${agent.firstname} ${agent.lastname}`,
                workload_score: this.calculateWorkloadScore(
                    agent.open_tickets || 0,
                    agent.in_progress_tickets || 0
                )
            };

            logger.info('Agent retrieved successfully', { agentId });
            return result;
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            logger.error('Error getting agent by ID', { error, agentId });
            throw ErrorFactory.database('Failed to retrieve agent');
        }
    }

    /**
     * Update agent status (availability)
     */
    static async updateAgentStatus(agentId: string, status: string) {
        try {
            logger.info('Updating agent status', { agentId, status });

            // For now, we'll use the address field to store status
            // In a production system, you'd want a dedicated status field
            const [updatedAgent] = await db
                .update(users)
                .set({
                    updated_at: new Date()
                })
                .where(and(
                    eq(users.user_id, agentId),
                    or(
                        eq(users.role, 'support_agent'),
                        eq(users.role, 'admin')
                    )
                ))
                .returning();

            if (!updatedAgent) {
                throw ErrorFactory.notFound('Support agent');
            }

            logger.info('Agent status updated successfully', { agentId, status });
            return updatedAgent;
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            logger.error('Error updating agent status', { error, agentId, status });
            throw ErrorFactory.database('Failed to update agent status');
        }
    }

    /**
     * Calculate workload score based on active tickets
     */
    private static calculateWorkloadScore(openTickets: number, inProgressTickets: number): number {
        // Weight in-progress tickets more heavily since they require active attention
        const weightedScore = (openTickets * 1) + (inProgressTickets * 2);

        // Convert to percentage (assuming max reasonable workload is 20 tickets)
        const maxTickets = 20;
        const score = Math.min((weightedScore / maxTickets) * 100, 100);

        return Math.round(score);
    }
}
