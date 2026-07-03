const Conversation = require('../models/Conversation.model');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ConversationService = require('../services/conversation.service');
const MessageService = require('../services/message.service');
const logger = require('../config/logger.config');

/**
 * Get all conversations for the current user
 * GET /api/v1/conversations
 * Private
 */
exports.getConversations = asyncHandler(async (req, res, next) => {
  const { limit = 50, skip = 0 } = req.query;
  const result = await ConversationService.getUserConversations({
    userId: req.user._id,
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  res.status(200).json(
    ApiResponse.success({
      conversations: result.conversations,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: result.conversations.length === parseInt(limit),
      },
    }, 'Conversations fetched successfully')
  );
});

/**
 * Create a new conversation with another user
 * POST /api/v1/conversations
 * Private
 */
exports.createConversation = asyncHandler(async (req, res, next) => {
  const { participantId } = req.body;

  if (participantId === req.user._id.toString()) {
    return next(AppError.badRequest('You can not create a conversation with yourself'));
  }

  const participant = await User.findById(participantId);
  if (!participant) {
    return next(AppError.notFound('User not found'));
  }

  const conversation = await ConversationService.getOrCreateConversation({
    user1Id: req.user._id,
    user2Id: participantId,
  });

  logger.info(`Conversation created between ${req.user.username} and ${participant.username}`);

  res.status(201).json(ApiResponse.created({ conversation }, 'Conversation created successfully'));
});

/**
 * Get a specific conversation by ID
 * GET /api/v1/conversations/:conversationId
 * Private
 */
exports.getConversation = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const conversation = await ConversationService.getConversation({
    conversationId,
    userId: req.user._id,
  });

  res.status(200).json(ApiResponse.success({ conversation }, 'Conversation fetched successfully'));
});

/**
 * Get messages for a conversation
 * GET /api/v1/conversations/:conversationId/messages
 * Private
 */
exports.getMessages = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { limit = 50, before = null } = req.query;

  // Use the service directly for consistency
  const result = await MessageService.getMessages({
    conversationId,
    userId: req.user._id,
    limit: parseInt(limit),
    before,
  });

  res.status(200).json(
    ApiResponse.success({
      messages: result.messages,
      pagination: {
        limit: parseInt(limit),
        hasMore: result.hasMore,
        nextBefore: result.nextBefore,
      },
    }, 'Messages fetched successfully')
  );
});

/**
 * Delete/archive a conversation
 * DELETE /api/v1/conversations/:conversationId
 * Private
 */
exports.deleteConversation = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;

  await ConversationService.deleteConversation({
    conversationId,
    userId: req.user._id,
  });

  logger.info(`Conversation ${conversationId} archived for user ${req.user._id}`);

  res.status(200).json(ApiResponse.success(null, 'Conversation archived successfully'));
});

/**
 * Get unread count for all conversations
 * GET /api/v1/conversations/unread-count
 * Private
 */
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  // Assuming Conversation model has this static method
  const totalUnread = await Conversation.getTotalUnreadCount(req.user._id);
  
  res.status(200).json(ApiResponse.success({ unreadCount: totalUnread }, 'Unread count fetched successfully'));
});
