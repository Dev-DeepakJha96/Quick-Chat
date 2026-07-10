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
 * @route POST /api/v1/messages/:messageId/reactions
 * @desc Add a reaction to a message
 * @access Private
 */
router.post(
  '/:messageId/reactions',
  validate(messageValidation.addReactionParams, 'params'),
  validate(messageValidation.addReactionBody),
  messageController.addReaction
);

/**
 * @route DELETE /api/v1/messages/:messageId/reactions/:emoji
 * @desc Remove a reaction from a message
 * @access Private
 */
router.delete(
  '/:messageId/reactions/:emoji',
  validate(messageValidation.removeReaction, 'params'),
  messageController.removeReaction
);

/**
 * @route PATCH /api/v1/messages/:messageId
 * @desc Edit a message (only sender can edit)
 * @access Private
 */
router.patch(
  '/:messageId',
  validate(messageValidation.editMessageParams, 'params'),
  validate(messageValidation.editMessageBody),
  messageController.editMessage
);

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

/**
 * @route POST /api/v1/messages/clear/:conversationId
 * @desc Clear chat history for the current user
 * @access Private
 */
router.post('/clear/:conversationId', messageController.clearChat);

module.exports = router;