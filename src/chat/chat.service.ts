import { db } from '../drizzle/db';
import { chatMessages, supportTickets, users } from '../drizzle/schema';
import { eq, desc, and, isNull, count, sql } from 'drizzle-orm';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';

export interface CreateMessageData {
    ticketId: string;
    senderId: string;
    senderRole: string;
    message: string;
    messageType: 'text' | 'image' | 'file';
    attachmentUrl?: string;
}

export interface ChatMessage {
    messageId: string;
    ticketId: string;
    senderId: string;
    senderRole: string;
    senderName: string;
    message: string;
    messageType: string;
    attachmentUrl?: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatStats {
    totalMessages: number;
    unreadMessages: number;
    lastMessageAt?: Date;
    participants: {
        userId: string;
        name: string;
        role: string;
        lastSeen?: Date;
    }[];
}

export class ChatService {

    // Verify if user has access to a ticket's chat
    async verifyTicketAccess(ticketId: string, userId: string): Promise<boolean> {
        try {
            const ticket = await db
                .select({
                    userId: supportTickets.user_id,
                    assignedTo: supportTickets.assigned_to
                })
                .from(supportTickets)
                .where(eq(supportTickets.ticket_id, ticketId))
                .limit(1); if (ticket.length === 0) {
                    return false;
                }

            // User can access if they created the ticket or are assigned to it
            const ticketData = ticket[0];
            return ticketData.userId === userId || ticketData.assignedTo === userId;

        } catch (error) {
            logger.error('Error verifying ticket access', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId,
                userId,
                service: 'chat-service'
            });
            return false;
        }
    }

    // Get chat messages for a ticket
    async getChatMessages(ticketId: string, page: number = 1, limit: number = 50): Promise<{
        messages: ChatMessage[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const totalResult = await db
                .select({ count: count() })
                .from(chatMessages)
                .where(eq(chatMessages.ticket_id, ticketId)); const total = totalResult[0]?.count || 0;
            const totalPages = Math.ceil(total / limit);

            // Get messages with sender information
            const messages = await db
                .select({
                    messageId: chatMessages.message_id,
                    ticketId: chatMessages.ticket_id,
                    senderId: chatMessages.sender_id,
                    senderRole: chatMessages.sender_role,
                    senderName: sql<string>`CONCAT(${users.firstname}, ' ', ${users.lastname})`,
                    message: chatMessages.message,
                    messageType: chatMessages.message_type,
                    attachmentUrl: chatMessages.attachment_url,
                    isRead: chatMessages.is_read,
                    createdAt: chatMessages.created_at,
                    updatedAt: chatMessages.updated_at
                })
                .from(chatMessages)
                .leftJoin(users as any, eq(chatMessages.sender_id, users.user_id))
                .where(eq(chatMessages.ticket_id, ticketId))
                .orderBy(desc(chatMessages.created_at))
                .limit(limit)
                .offset(offset);

            logger.info('Chat messages retrieved', {
                ticketId,
                page,
                limit,
                total,
                messagesReturned: messages.length,
                service: 'chat-service'
            });

            return {
                messages: messages.reverse(), // Reverse to show oldest first
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            };

        } catch (error) {
            logger.error('Error retrieving chat messages', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId,
                service: 'chat-service'
            });
            throw ErrorFactory.database('Failed to retrieve chat messages');
        }
    }

    // Create a new chat message
    async createMessage(data: CreateMessageData): Promise<ChatMessage> {
        try {
            // Insert the message
            const result = await db
                .insert(chatMessages)
                .values({
                    ticket_id: data.ticketId,
                    sender_id: data.senderId,
                    sender_role: data.senderRole as "user" | "admin" | "support_agent",
                    message: data.message,
                    message_type: data.messageType,
                    attachment_url: data.attachmentUrl,
                    is_read: false,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .returning();

            if (result.length === 0) {
                throw ErrorFactory.database('Failed to create chat message');
            }

            const messageId = result[0].message_id;

            // Get the created message with sender information
            const createdMessage = await db
                .select({
                    messageId: chatMessages.message_id,
                    ticketId: chatMessages.ticket_id,
                    senderId: chatMessages.sender_id,
                    senderRole: chatMessages.sender_role,
                    senderName: sql<string>`CONCAT(${users.firstname}, ' ', ${users.lastname})`,
                    message: chatMessages.message,
                    messageType: chatMessages.message_type,
                    attachmentUrl: chatMessages.attachment_url,
                    isRead: chatMessages.is_read,
                    createdAt: chatMessages.created_at,
                    updatedAt: chatMessages.updated_at
                })
                .from(chatMessages)
                .leftJoin(users as any, eq(chatMessages.sender_id, users.user_id))
                .where(eq(chatMessages.message_id, messageId))
                .limit(1); if (createdMessage.length === 0) {
                    throw ErrorFactory.database('Failed to retrieve created message');
                }

            logger.info('Chat message created successfully', {
                messageId,
                ticketId: data.ticketId,
                senderId: data.senderId,
                messageType: data.messageType,
                service: 'chat-service'
            });

            return createdMessage[0];

        } catch (error) {
            logger.error('Error creating chat message', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: data.ticketId,
                service: 'chat-service'
            });
            throw error instanceof Error && error.message.includes('Failed to') ? error : ErrorFactory.database('Failed to create chat message');
        }
    }

    // Mark messages as read for a user
    async markMessagesAsRead(ticketId: string, userId: string): Promise<number> {
        try {
            const result = await db
                .update(chatMessages)
                .set({
                    is_read: true,
                    updated_at: new Date()
                })
                .where(
                    and(
                        eq(chatMessages.ticket_id, ticketId),
                        sql`${chatMessages.sender_id} != ${userId}`, // Don't mark own messages as read
                        eq(chatMessages.is_read, false)
                    )
                )
                .returning({ messageId: chatMessages.message_id }); const updatedCount = result.length;

            logger.info('Messages marked as read', {
                ticketId,
                userId,
                messagesMarked: updatedCount,
                service: 'chat-service'
            });

            return updatedCount;

        } catch (error) {
            logger.error('Error marking messages as read', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId,
                userId,
                service: 'chat-service'
            });
            throw ErrorFactory.database('Failed to mark messages as read');
        }
    }

    // Get chat statistics for a ticket
    async getChatStats(ticketId: string, userId: string): Promise<ChatStats> {
        try {
            // Get total message count
            const totalResult = await db
                .select({ count: count() })
                .from(chatMessages)
                .where(eq(chatMessages.ticket_id, ticketId));

            const totalMessages = totalResult[0]?.count || 0;

            // Get unread message count (messages not sent by current user and not read)
            const unreadResult = await db
                .select({ count: count() })
                .from(chatMessages)
                .where(
                    and(
                        eq(chatMessages.ticket_id, ticketId),
                        sql`${chatMessages.sender_id} != ${userId}`,
                        eq(chatMessages.is_read, false)
                    )
                );

            const unreadMessages = unreadResult[0]?.count || 0;

            // Get last message timestamp
            const lastMessageResult = await db
                .select({ createdAt: chatMessages.created_at })
                .from(chatMessages)
                .where(eq(chatMessages.ticket_id, ticketId))
                .orderBy(desc(chatMessages.created_at))
                .limit(1);

            const lastMessageAt = lastMessageResult[0]?.createdAt;

            // Get participants (users who have sent messages in this ticket)
            const participantsResult = await db
                .select({
                    userId: users.user_id,
                    name: sql<string>`CONCAT(${users.firstname}, ' ', ${users.lastname})`,
                    role: users.role
                })
                .from(chatMessages)
                .leftJoin(users as any, eq(chatMessages.sender_id, users.user_id))
                .where(eq(chatMessages.ticket_id, ticketId))
                .groupBy(users.user_id, users.firstname, users.lastname, users.role); const participants = participantsResult.map((p: any) => ({
                    userId: p.userId,
                    name: p.name,
                    role: p.role
                }));

            logger.info('Chat statistics retrieved', {
                ticketId,
                totalMessages,
                unreadMessages,
                participants: participants.length,
                service: 'chat-service'
            });

            return {
                totalMessages,
                unreadMessages,
                lastMessageAt,
                participants
            };

        } catch (error) {
            logger.error('Error retrieving chat statistics', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId,
                service: 'chat-service'
            });
            throw ErrorFactory.database('Failed to retrieve chat statistics');
        }
    }

    // Get active chats (for support agents)
    async getActiveChats(page: number = 1, limit: number = 20): Promise<{
        chats: Array<{
            ticketId: string;
            ticketSubject: string;
            ticketStatus: string;
            lastMessage: string;
            lastMessageAt: Date;
            unreadCount: number;
            customerName: string;
            assignedAgent?: string;
        }>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        try {
            const offset = (page - 1) * limit;

            // Get tickets with recent chat activity
            const chats = await db
                .select({
                    ticketId: supportTickets.ticket_id,
                    ticketSubject: supportTickets.subject,
                    ticketStatus: supportTickets.status,
                    customerName: sql<string>`CONCAT(customer.firstname, ' ', customer.lastname)`,
                    assignedAgent: sql<string>`CONCAT(agent.firstname, ' ', agent.lastname)`,
                    lastMessage: chatMessages.message,
                    lastMessageAt: chatMessages.created_at,
                    unreadCount: sql<number>`COUNT(CASE WHEN ${chatMessages.is_read} = false AND ${chatMessages.sender_role} != 'admin' AND ${chatMessages.sender_role} != 'support_agent' THEN 1 END)`
                })
                .from(supportTickets)
                .leftJoin(sql`users as customer`, eq(supportTickets.user_id, sql`customer.user_id`))
                .leftJoin(sql`users as agent`, eq(supportTickets.assigned_to, sql`agent.user_id`))
                .leftJoin(chatMessages as any, eq(supportTickets.ticket_id, chatMessages.ticket_id))
                .where(
                    and(
                        sql`${supportTickets.status} != 'resolved'`,
                        sql`${chatMessages.message_id} IS NOT NULL`
                    )
                )
                .groupBy(
                    supportTickets.ticket_id,
                    supportTickets.subject,
                    supportTickets.status,
                    sql`customer.firstname`,
                    sql`customer.lastname`,
                    sql`agent.firstname`,
                    sql`agent.lastname`,
                    chatMessages.message,
                    chatMessages.created_at
                )
                .orderBy(desc(chatMessages.created_at))
                .limit(limit)
                .offset(offset);

            // Get total count
            const totalResult = await db
                .select({ count: count() })
                .from(supportTickets)
                .leftJoin(chatMessages as any, eq(supportTickets.ticket_id, chatMessages.ticket_id))
                .where(
                    and(
                        sql`${supportTickets.status} != 'resolved'`,
                        sql`${chatMessages.message_id} IS NOT NULL`
                    )
                );

            const total = totalResult[0]?.count || 0;
            const totalPages = Math.ceil(total / limit);

            logger.info('Active chats retrieved', {
                page,
                limit,
                total,
                chatsReturned: chats.length,
                service: 'chat-service'
            });

            return {
                chats,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            };

        } catch (error) {
            logger.error('Error retrieving active chats', {
                error: error instanceof Error ? error.message : 'Unknown error',
                service: 'chat-service'
            });
            throw ErrorFactory.database('Failed to retrieve active chats');
        }
    }
}
