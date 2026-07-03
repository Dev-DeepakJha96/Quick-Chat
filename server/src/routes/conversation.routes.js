const express = require('express');
const router = express.Router();

// Controllers
const conversationController = require('../controllers/conversation.controller');

// Middleware
const { protect } = require('../middlewares/auth.middlware');
const { validate } = require('../middlewares/validation.middleware');
const conversationValidation = require('../validators/conversation.validation');

// All routes require authentication
router.use(protect);

/**
 * @route GET /api/v1/conversations
 * @desc Get all conversations for the current user
 * @access Private
 */
router.get(
  '/',
  validate(conversationValidation.getConversations, 'query'),
  conversationController.getConversations
);

/**
 * @route GET /api/v1/conversations/unread-count
 * @desc Get total unread count for all conversations
 * @access Private
 */
router.get('/unread-count', conversationController.getUnreadCount);

/**
 * @route POST /api/v1/conversations
 * @desc Create a new conversation
 * @access Private
 */
router.post(
  '/',
  validate(conversationValidation.createConversation),
  conversationController.createConversation
);

/**
 * @route GET /api/v1/conversations/:conversationId
 * @desc Get a specific conversation
 * @access Private
 */
router.get('/:conversationId', conversationController.getConversation);

/**
 * @route GET /api/v1/conversations/:conversationId/messages
 * @desc Get messages for a conversation
 * @access Private
 */
router.get(
  '/:conversationId/messages',
  validate(conversationValidation.getMessages, 'query'),
  conversationController.getMessages
);

/**
 * @route DELETE /api/v1/conversations/:conversationId
 * @desc Delete/archive a conversation
 * @access Private
 */
router.delete('/:conversationId', conversationController.deleteConversation);

module.exports = router;