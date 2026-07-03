const express = require('express');
const router = express.Router();

// Controllers
const messageController = require('../controllers/message.controller');

// Middleware
const { protect } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const messageValidation = require('../validators/message.validation');

// All routes require authentication
router.use(protect);

/**
 * @route POST /api/v1/messages
 * @desc Send a new message
 * @access Private
 */
router.post(
  '/',
  validate(messageValidation.sendMessage),
  messageController.sendMessage
);

/**
 * @route POST /api/v1/messages/mark-read
 * @desc Mark messages as read in a conversation
 * @access Private
 */
router.post(
  '/mark-read',
  validate(messageValidation.markAsRead),
  messageController.markAsRead
);

/**
 * @route GET /api/v1/messages/search
 * @desc Search messages
 * @access Private
 */
router.get('/search', messageController.searchMessages);

/**
 * @route GET /api/v1/messages/:conversationId
 * @desc Get messages for a conversation
 * @access Private
 */
router.get(
  '/:conversationId',
  validate(messageValidation.getMessages, 'query'),
  messageController.getMessages
);

/**
 * @route GET /api/v1/messages/unread/:conversationId
 * @desc Get unread count for a specific conversation
 * @access Private
 */
router.get('/unread/:conversationId', messageController.getUnreadCount);

/**
 * @route DELETE /api/v1/messages/:messageId
 * @desc Delete a message
 * @access Private
 */
router.delete(
  '/:messageId',
  validate(messageValidation.deleteMessage, 'params'),
  messageController.deleteMessage
);

module.exports = router;