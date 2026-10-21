import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getContacts, getMessages, sendMessage, getUnreadCount, editMessage, deleteMessage, hideMessage, markConversationRead } from '../controllers/chatController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get contacts based on user role
router.get('/contacts', getContacts);

// Get messages with a specific contact
router.get('/messages/:contactId', getMessages);

// Send a message
router.post('/send', sendMessage);
router.post('/read/:contactId',markConversationRead);
router.patch('/messages/:messageId',editMessage);
router.delete('/messages/:messageId',deleteMessage);
router.delete('/messages/:messageId/hide',hideMessage);

// Get unread message count
router.get('/unread-count', getUnreadCount);

export default router;
