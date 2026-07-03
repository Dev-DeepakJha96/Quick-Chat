const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHanlder');
const ApiResponse = require('../utils/ApiResponse');
const MessageService = require('../services/message.service');
const logger = require('../config/logger.config');

/**
 * Send a new message
 * POST /api/v1/messages
 * Private
 */
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId, text } = req.body;
  
  const message = await MessageService.sendMessage({
    conversationId,
    senderId: req.user._id,
    text,
  });

  logger.info(`Message sent in conversation ${conversationId} by ${req.user.username}`);

  res.status(201).json(ApiResponse.created({ message }, 'Message sent successfully'));
});

/**
 * Get messages for a conversation
 * GET /api/v1/messages/:conversationId
 * Private
 */
exports.getMessages = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { limit = 50, before = null } = req.query;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
    isActive: true,
  });

  if (!conversation) {
    return next(AppError.notFound('Conversation not found or you do not have access'));
  }

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
 * Delete a message
 * DELETE /api/v1/messages/:messageId
 * Private
 */
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  
  const deletedMessage = await MessageService.deleteMessage({
    messageId,
    userId: req.user._id,
  });

  logger.info(`Message ${messageId} deleted by ${req.user.username}`);

  res.status(200).json(ApiResponse.success({ message: deletedMessage }, 'Message deleted successfully'));
});

/**
 * Mark messages as read in a conversation
 * POST /api/v1/messages/mark-read
 * Private
 */
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.body;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
    isActive: true,
  });

  if (!conversation) {
    return next(AppError.notFound('Conversation not found or you do not have access'));
  }

  const result = await MessageService.markAsRead({
    conversationId,
    userId: req.user._id,
  });

  logger.info(`Messages marked as read in conversation ${conversationId} by ${req.user.username}`);

  res.status(200).json(
    ApiResponse.success({ updatedCount: result.updatedCount }, `Marked ${result.updatedCount} messages as read`)
  );
});

/**
 * Get unread count for a specific conversation
 * GET /api/v1/messages/unread/:conversationId
 * Private
 */
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
    isActive: true,
  });

  if (!conversation) {
    return next(AppError.notFound('Conversation not found or you do not have access'));
  }

  const unreadCount = await Message.getUnreadCount(conversationId, req.user._id);
  
  res.status(200).json(ApiResponse.success({ unreadCount }, 'Unread count fetched successfully'));
});

/**
 * Search messages
 * GET /api/v1/messages/search?q=query
 * Private
 */
exports.searchMessages = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(200).json(ApiResponse.success({ messages: [] }, 'Search results fetched'));
  }

  const conversations = await Conversation.find({
    participants: req.user._id,
    isActive: true,
  }).select('_id');
  
  const conversationIds = conversations.map((conv) => conv._id);

  const messages = await Message.find({
    conversation: { $in: conversationIds },
    text: { $regex: q, $options: 'i' },
    isDeleted: false,
    deletedFor: { $ne: req.user._id },
  })
    .populate('sender', 'username email avatarColor')
    .populate('conversation', 'participants')
    .sort({ createdAt: -1 })
    .limit(20);

  res.status(200).json(ApiResponse.success({ messages }, 'Search results fetched successfully'));
});
