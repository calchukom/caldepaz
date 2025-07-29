import { Router } from 'express';
import { ChatController } from './chat.controller';
import { verifyToken } from '../middleware/bearAuth';
import { validate } from '../middleware/validate';
import {
    chatMessageSchema,
    markAsReadSchema,
    getChatMessagesSchema,
    getChatStatsSchema,
    getActiveChatsSchema,
    typingIndicatorSchema
} from '../validation/chat.validation'; const router = Router();
const chatController = new ChatController();

// All chat routes require authentication
router.use(verifyToken);

// Get chat messages for a ticket
router.get(
    '/tickets/:ticketId/messages',
    validate(getChatMessagesSchema),
    chatController.getChatMessages
);

// Send a message in a ticket chat
router.post(
    '/tickets/:ticketId/messages',
    validate(chatMessageSchema),
    chatController.sendMessage
);

// Mark messages as read for a ticket
router.put(
    '/tickets/:ticketId/messages/read',
    validate(markAsReadSchema),
    chatController.markMessagesAsRead
);

// Get chat statistics for a ticket
router.get(
    '/tickets/:ticketId/stats',
    validate(getChatStatsSchema),
    chatController.getChatStats
);

// Get active chats (for support agents)
router.get(
    '/active',
    validate(getActiveChatsSchema),
    chatController.getActiveChats
);

// Start typing indicator
router.post(
    '/tickets/:ticketId/typing/start',
    validate(typingIndicatorSchema),
    chatController.startTyping
);

// Stop typing indicator
router.post(
    '/tickets/:ticketId/typing/stop',
    validate(typingIndicatorSchema),
    chatController.stopTyping
);

export default router;
