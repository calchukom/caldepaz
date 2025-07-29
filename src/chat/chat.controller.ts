import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { getWebSocketService } from '../services/websocket.service';
import { logger } from '../middleware/logger';
import { ErrorFactory } from '../middleware/appError';

export class ChatController {
    private chatService: ChatService;

    constructor() {
        this.chatService = new ChatService();
    }

    // Get chat messages for a support ticket
    getChatMessages = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ticketId } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            logger.info('Fetching chat messages', {
                ticketId,
                userId,
                page: Number(page),
                limit: Number(limit),
                service: 'chat-api'
            });

            // Verify user has access to this ticket
            const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
            if (!hasAccess) {
                throw ErrorFactory.forbidden('Access denied to this chat');
            }

            const result = await this.chatService.getChatMessages(
                ticketId,
                Number(page),
                Number(limit)
            );

            res.status(200).json({
                success: true,
                data: result,
                message: 'Chat messages retrieved successfully'
            });

        } catch (error) {
            logger.error('Error fetching chat messages', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: req.params.ticketId,
                service: 'chat-api'
            });
            throw error;
        }
    };

    // Send a chat message
    sendMessage = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ticketId } = req.params;
            const { message, messageType = 'text' } = req.body;
            const userId = req.user?.userId;
            const userRole = req.user?.role;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            if (!userRole) {
                throw ErrorFactory.badRequest('User role is required');
            }

            logger.info('Sending chat message', {
                ticketId,
                userId,
                messageType,
                messageLength: message?.length,
                service: 'chat-api'
            });

            // Validate input
            if (!message || message.trim().length === 0) {
                throw ErrorFactory.badRequest('Message content is required');
            }

            if (message.length > 1000) {
                throw ErrorFactory.badRequest('Message too long (max 1000 characters)');
            }

            // Verify user has access to this ticket
            const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
            if (!hasAccess) {
                throw ErrorFactory.forbidden('Access denied to this chat');
            }

            // Create the message
            const chatMessage = await this.chatService.createMessage({
                ticketId,
                senderId: userId,
                senderRole: userRole,
                message: message.trim(),
                messageType
            });

            // Send real-time notification via WebSocket
            const webSocketService = getWebSocketService();
            if (webSocketService) {
                // Notify all users in the ticket chat room
                webSocketService.notifyTicketChat(ticketId, {
                    action: 'message:new',
                    message: chatMessage,
                    timestamp: new Date().toISOString()
                });

                logger.info('💬 WebSocket: Sent chat message notification', {
                    ticketId,
                    messageId: chatMessage.messageId,
                    senderRole: userRole,
                    service: 'websocket'
                });
            }

            res.status(201).json({
                success: true,
                data: chatMessage,
                message: 'Message sent successfully'
            });

        } catch (error) {
            logger.error('Error sending chat message', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: req.params.ticketId,
                service: 'chat-api'
            });
            throw error;
        }
    };

    // Mark messages as read
    markMessagesAsRead = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ticketId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            logger.info('Marking messages as read', {
                ticketId,
                userId,
                service: 'chat-api'
            });

            // Verify user has access to this ticket
            const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
            if (!hasAccess) {
                throw ErrorFactory.forbidden('Access denied to this chat');
            }

            const updatedCount = await this.chatService.markMessagesAsRead(ticketId, userId);

            // Send real-time notification for read status
            const webSocketService = getWebSocketService();
            if (webSocketService) {
                webSocketService.notifyTicketChat(ticketId, {
                    action: 'messages:read',
                    userId,
                    readAt: new Date().toISOString(),
                    count: updatedCount
                });
            }

            res.status(200).json({
                success: true,
                data: { messagesMarkedAsRead: updatedCount },
                message: 'Messages marked as read'
            });

        } catch (error) {
            logger.error('Error marking messages as read', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: req.params.ticketId,
                service: 'chat-api'
            });
            throw error;
        }
    };

    // Get chat statistics
    getChatStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ticketId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            logger.info('Fetching chat statistics', {
                ticketId,
                userId,
                service: 'chat-api'
            });

            // Verify user has access to this ticket
            const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
            if (!hasAccess) {
                throw ErrorFactory.forbidden('Access denied to this chat');
            }

            const stats = await this.chatService.getChatStats(ticketId, userId);

            res.status(200).json({
                success: true,
                data: stats,
                message: 'Chat statistics retrieved successfully'
            });

        } catch (error) {
            logger.error('Error fetching chat statistics', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: req.params.ticketId,
                service: 'chat-api'
            });
            throw error;
        }
    };

    // Get active chats (for support agents)
    getActiveChats = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const userRole = req.user?.role;
            const { page = 1, limit = 20 } = req.query;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            // Only admins and support agents can access active chats
            if (userRole !== 'admin' && userRole !== 'support_agent') {
                throw ErrorFactory.forbidden('Access denied to active chats');
            }

            logger.info('Fetching active chats', {
                userId,
                userRole,
                page: Number(page),
                limit: Number(limit),
                service: 'chat-api'
            });

            const result = await this.chatService.getActiveChats(
                Number(page),
                Number(limit)
            );

            res.status(200).json({
                success: true,
                data: result,
                message: 'Active chats retrieved successfully'
            });

        } catch (error) {
            logger.error('Error fetching active chats', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
                service: 'chat-api'
            });
            throw error;
        }
    };

    // Start typing indicator
    startTyping = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ticketId } = req.params;
            const userId = req.user?.userId;
            const userName = `${req.user?.firstname} ${req.user?.lastname}`;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            // Verify user has access to this ticket
            const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
            if (!hasAccess) {
                throw ErrorFactory.forbidden('Access denied to this chat');
            }

            // Send typing indicator via WebSocket
            const webSocketService = getWebSocketService();
            if (webSocketService) {
                webSocketService.notifyTicketChat(ticketId, {
                    action: 'user:typing',
                    userId,
                    userName,
                    timestamp: new Date().toISOString()
                });
            }

            res.status(200).json({
                success: true,
                message: 'Typing indicator sent'
            });

        } catch (error) {
            logger.error('Error sending typing indicator', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: req.params.ticketId,
                service: 'chat-api'
            });
            throw error;
        }
    };

    // Stop typing indicator
    stopTyping = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ticketId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                throw ErrorFactory.badRequest('User ID is required');
            }

            // Verify user has access to this ticket
            const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
            if (!hasAccess) {
                throw ErrorFactory.forbidden('Access denied to this chat');
            }

            // Send stop typing indicator via WebSocket
            const webSocketService = getWebSocketService();
            if (webSocketService) {
                webSocketService.notifyTicketChat(ticketId, {
                    action: 'user:stop_typing',
                    userId,
                    timestamp: new Date().toISOString()
                });
            }

            res.status(200).json({
                success: true,
                message: 'Stop typing indicator sent'
            });

        } catch (error) {
            logger.error('Error sending stop typing indicator', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketId: req.params.ticketId,
                service: 'chat-api'
            });
            throw error;
        }
    };
}

export const chatController = new ChatController();
