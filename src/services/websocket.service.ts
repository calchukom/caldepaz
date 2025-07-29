import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../middleware/logger';

export interface SocketUser {
    userId: string;
    role: string;
    email: string;
}

export class WebSocketService {
    private io: SocketIOServer;
    private connectedUsers = new Map<string, SocketUser>();

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    private setupMiddleware() {
        // Authentication middleware for WebSocket connections
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

                const user: SocketUser = {
                    userId: decoded.userId,
                    role: decoded.role,
                    email: decoded.email
                };

                socket.data.user = user;
                next();
            } catch (error) {
                logger.error('WebSocket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const user = socket.data.user as SocketUser;

            logger.info(`User connected via WebSocket: ${user.email} (${user.userId})`);

            // Store connected user
            this.connectedUsers.set(socket.id, user);

            // Join user to their own room for private notifications
            socket.join(`user:${user.userId}`);

            // Join role-based rooms
            socket.join(`role:${user.role}`);

            // Support ticket events
            socket.on('join-ticket', (ticketId: string) => {
                socket.join(`ticket:${ticketId}`);
                logger.info(`User ${user.email} joined ticket room: ${ticketId}`);
            });

            socket.on('leave-ticket', (ticketId: string) => {
                socket.leave(`ticket:${ticketId}`);
                logger.info(`User ${user.email} left ticket room: ${ticketId}`);
            });

            // Chat typing indicators
            socket.on('typing-start', (ticketId: string) => {
                socket.to(`ticket:${ticketId}`).emit('user-typing', {
                    userId: user.userId,
                    userEmail: user.email,
                    ticketId,
                    timestamp: new Date().toISOString()
                });
                logger.debug(`User ${user.email} started typing in ticket ${ticketId}`);
            });

            socket.on('typing-stop', (ticketId: string) => {
                socket.to(`ticket:${ticketId}`).emit('user-stop-typing', {
                    userId: user.userId,
                    userEmail: user.email,
                    ticketId,
                    timestamp: new Date().toISOString()
                });
                logger.debug(`User ${user.email} stopped typing in ticket ${ticketId}`);
            });

            // Handle disconnect
            socket.on('disconnect', (reason) => {
                logger.info(`User disconnected: ${user.email} - Reason: ${reason}`);
                this.connectedUsers.delete(socket.id);
            });

            // Heartbeat/ping for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });

            // Send welcome message
            socket.emit('connected', {
                message: 'Successfully connected to WebSocket server',
                user: {
                    userId: user.userId,
                    email: user.email,
                    role: user.role
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    // Support Ticket Real-time Events
    public notifyTicketCreated(ticket: any) {
        logger.info(`🔥 WebSocket: Sending ticket:created notification`, {
            service: 'websocket',
            ticketId: ticket.ticket_id,
            userId: ticket.user_id,
            connectedUsers: this.connectedUsers.size
        });

        // Notify all admins and support agents
        this.io.to('role:admin').to('role:support_agent').emit('ticket:created', {
            type: 'TICKET_CREATED',
            data: ticket,
            timestamp: new Date().toISOString()
        });

        // Notify the ticket creator
        this.io.to(`user:${ticket.user_id}`).emit('ticket:created', {
            type: 'TICKET_CREATED',
            data: ticket,
            timestamp: new Date().toISOString()
        });

        logger.info(`✅ WebSocket: ticket:created notification sent`, {
            service: 'websocket',
            ticketId: ticket.ticket_id
        });
    }

    public notifyTicketUpdated(ticket: any) {
        // Notify all users in the ticket room
        this.io.to(`ticket:${ticket.ticket_id}`).emit('ticket:updated', {
            type: 'TICKET_UPDATED',
            data: ticket,
            timestamp: new Date().toISOString()
        });

        // Notify assigned agent if any
        if (ticket.assigned_to) {
            this.io.to(`user:${ticket.assigned_to}`).emit('ticket:updated', {
                type: 'TICKET_UPDATED',
                data: ticket,
                timestamp: new Date().toISOString()
            });
        }

        // Notify ticket owner
        this.io.to(`user:${ticket.user_id}`).emit('ticket:updated', {
            type: 'TICKET_UPDATED',
            data: ticket,
            timestamp: new Date().toISOString()
        });
    }

    public notifyTicketStatusChanged(ticket: any, previousStatus: string) {
        const notificationData = {
            type: 'TICKET_STATUS_CHANGED',
            data: {
                ...ticket,
                previousStatus
            },
            timestamp: new Date().toISOString()
        };

        // Notify all users in the ticket room
        this.io.to(`ticket:${ticket.ticket_id}`).emit('ticket:status-changed', notificationData);

        // Notify ticket owner
        this.io.to(`user:${ticket.user_id}`).emit('ticket:status-changed', notificationData);

        // Notify assigned agent
        if (ticket.assigned_to) {
            this.io.to(`user:${ticket.assigned_to}`).emit('ticket:status-changed', notificationData);
        }
    }

    public notifyTicketAssigned(ticket: any) {
        const notificationData = {
            type: 'TICKET_ASSIGNED',
            data: ticket,
            timestamp: new Date().toISOString()
        };

        // Notify assigned agent
        if (ticket.assigned_to) {
            this.io.to(`user:${ticket.assigned_to}`).emit('ticket:assigned', notificationData);
        }

        // Notify ticket owner
        this.io.to(`user:${ticket.user_id}`).emit('ticket:assigned', notificationData);
    }

    public notifyNewMessage(ticketId: string, message: any) {
        // Notify all users in the ticket room
        this.io.to(`ticket:${ticketId}`).emit('ticket:new-message', {
            type: 'TICKET_NEW_MESSAGE',
            data: message,
            timestamp: new Date().toISOString()
        });
    }

    // Booking Real-time Events
    public notifyBookingCreated(booking: any) {
        // Notify admins
        this.io.to('role:admin').emit('booking:created', {
            type: 'BOOKING_CREATED',
            data: booking,
            timestamp: new Date().toISOString()
        });

        // Notify booking owner
        this.io.to(`user:${booking.user_id}`).emit('booking:created', {
            type: 'BOOKING_CREATED',
            data: booking,
            timestamp: new Date().toISOString()
        });
    }

    public notifyBookingUpdated(booking: any) {
        // Notify booking owner
        this.io.to(`user:${booking.user_id}`).emit('booking:updated', {
            type: 'BOOKING_UPDATED',
            data: booking,
            timestamp: new Date().toISOString()
        });

        // Notify admins
        this.io.to('role:admin').emit('booking:updated', {
            type: 'BOOKING_UPDATED',
            data: booking,
            timestamp: new Date().toISOString()
        });
    }

    // System notifications
    public notifySystemMessage(message: string, targetRole?: string, targetUser?: string) {
        const notificationData = {
            type: 'SYSTEM_MESSAGE',
            data: { message },
            timestamp: new Date().toISOString()
        };

        if (targetUser) {
            this.io.to(`user:${targetUser}`).emit('system:message', notificationData);
        } else if (targetRole) {
            this.io.to(`role:${targetRole}`).emit('system:message', notificationData);
        } else {
            this.io.emit('system:message', notificationData);
        }
    }

    // Get connected users count
    public getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    // Get connected users by role
    public getConnectedUsersByRole(role: string): SocketUser[] {
        return Array.from(this.connectedUsers.values()).filter(user => user.role === role);
    }

    // Broadcast to all users
    public broadcast(event: string, data: any) {
        this.io.emit(event, data);
    }

    // Send to specific user
    public sendToUser(userId: string, event: string, data: any) {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    // Send to role
    public sendToRole(role: string, event: string, data: any) {
        this.io.to(`role:${role}`).emit(event, data);
    }

    // Chat-specific real-time events
    public notifyChatMessage(ticketId: string, message: any) {
        logger.info(`🔥 WebSocket: Sending chat:message notification`, {
            service: 'websocket',
            ticketId,
            messageId: message.messageId,
            senderId: message.senderId,
            connectedUsers: this.connectedUsers.size
        });

        // Notify all users in the ticket room
        this.io.to(`ticket:${ticketId}`).emit('chat:message', {
            type: 'CHAT_MESSAGE',
            data: message,
            timestamp: new Date().toISOString()
        });

        logger.info(`✅ WebSocket: chat:message notification sent`, {
            service: 'websocket',
            ticketId,
            messageId: message.messageId
        });
    }

    public notifyTicketChat(ticketId: string, data: any) {
        // Alias for notifyChatMessage for backward compatibility
        this.notifyChatMessage(ticketId, data);
    }

    public notifyMessagesRead(ticketId: string, userId: string, readCount: number) {
        logger.info(`🔥 WebSocket: Sending messages:read notification`, {
            service: 'websocket',
            ticketId,
            userId,
            readCount,
            connectedUsers: this.connectedUsers.size
        });

        // Notify all users in the ticket room except the reader
        this.io.to(`ticket:${ticketId}`).emit('messages:read', {
            type: 'MESSAGES_READ',
            data: {
                ticketId,
                userId,
                readCount,
                timestamp: new Date().toISOString()
            }
        });

        logger.info(`✅ WebSocket: messages:read notification sent`, {
            service: 'websocket',
            ticketId,
            readCount
        });
    }

    public notifyTypingIndicator(ticketId: string, userId: string, userEmail: string, isTyping: boolean) {
        const eventType = isTyping ? 'user-typing' : 'user-stop-typing';
        const logAction = isTyping ? 'started' : 'stopped';

        logger.debug(`WebSocket: User ${logAction} typing`, {
            service: 'websocket',
            ticketId,
            userId,
            userEmail,
            isTyping
        });

        // Notify all users in the ticket room except the typer
        this.io.to(`ticket:${ticketId}`).emit(eventType, {
            userId,
            userEmail,
            ticketId,
            isTyping,
            timestamp: new Date().toISOString()
        });
    }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (server: HTTPServer): WebSocketService => {
    if (!webSocketService) {
        webSocketService = new WebSocketService(server);
        logger.info('WebSocket service initialized successfully');
    }
    return webSocketService;
};

export const getWebSocketService = (): WebSocketService | null => {
    return webSocketService;
};
