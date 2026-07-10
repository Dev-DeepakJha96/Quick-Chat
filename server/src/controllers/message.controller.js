const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const MessageService = require('../services/message.service');
const logger = require('../config/logger.config');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Send a new message
 * POST /api/v1/messages
 * Private
 */
exports.sendMessage = asyncHandler(async (req, res, next) => {
  console.log('--- BACKEND CONTROLLER: sendMessage ---');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('User:', JSON.stringify(req.user, null, 2));
  console.log('--------------------------------------');

  const { conversationId, text, replyTo } = req.body;
  
  const message = await MessageService.sendMessage({
    conversationId,
    senderId: req.user._id,
    text,
    replyTo,
  });

  logger.info(`Message sent in conversation ${conversationId} by ${req.user.username}`);

  // Broadcast via Socket.io if available
  const io = req.app.get('io');
  if (io) {
    // Ensure all connected participants of this conversation are joined to the room
    const conversation = await Conversation.findById(conversationId).select('participants');
    if (conversation) {
      const { connectedUsers } = require('../config/socket.config');
      conversation.participants.forEach((participantId) => {
        const pIdStr = participantId.toString();
        const socketIds = connectedUsers.get(pIdStr);
        if (socketIds) {
          socketIds.forEach((socketId) => {
            const s = io.sockets.sockets.get(socketId);
            if (s) {
              s.join(`conversation:${conversationId}`);
            }
          });
        }
      });
    }

    io.to(`conversation:${conversationId}`).emit('message:receive', {
      message,
      conversationId,
    });
  }

  res.status(201).json(ApiResponse.created({ message }, 'Message sent successfully'));
});

/**
 * Edit a message (only sender can edit)
 * PATCH /api/v1/messages/:messageId
 * Private
 */
exports.editMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { text } = req.body;

  const message = await MessageService.editMessage({
    messageId,
    userId: req.user._id,
    text,
  });

  logger.info(`Message ${messageId} edited by ${req.user.username}`);

  // Broadcast via Socket.io if available
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${message.conversation}`).emit('message:edited', {
      message,
      conversationId: message.conversation.toString(),
    });
  }

  res.status(200).json(ApiResponse.success({ message }, 'Message edited successfully'));
});

/**
 * Get messages for a conversation
 * GET /api/v1/messages/:conversationId
 * Private
 */
exports.getMessages = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { limit = 50, before = null } = req.query;

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

  // Broadcast via Socket.io if globally deleted
  const io = req.app.get('io');
  if (io && deletedMessage.isDeleted) {
    io.to(`conversation:${deletedMessage.conversation}`).emit('message:edited', {
      message: deletedMessage,
      conversationId: deletedMessage.conversation.toString(),
    });
  }

  res.status(200).json(ApiResponse.success({ message: deletedMessage }, 'Message deleted successfully'));
});

/**
 * Mark messages as read in a conversation
 * POST /api/v1/messages/mark-read
 * Private
 */
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.body;

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
 * Search messages using MongoDB text index for better performance
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

  // Use MongoDB text index for better performance and ranking
  const messages = await Message.find({
    conversation: { $in: conversationIds },
    $text: { $search: q },
    isDeleted: false,
    deletedFor: { $ne: req.user._id },
  }, {
    score: { $meta: 'textScore' } // Include text score for ranking
  })
    .populate('sender', 'username email avatarColor avatar')
    .populate('conversation', 'participants')
    .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
    .limit(20);

  res.status(200).json(ApiResponse.success({ messages }, 'Search results fetched successfully'));
});

/**
 * Add a reaction to a message
 * POST /api/v1/messages/:messageId/reactions
 * Private
 */
exports.addReaction = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const updatedMessage = await MessageService.addReaction({
    messageId,
    userId: req.user._id,
    emoji,
  });

  logger.info(`Reaction ${emoji} added to message ${messageId} by ${req.user.username}`);

  // Broadcast via Socket.io if available
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${updatedMessage.conversation}`).emit('message:reacted', {
      messageId,
      reactions: updatedMessage.reactions,
      conversationId: updatedMessage.conversation.toString(),
    });
  }

  res.status(200).json(
    ApiResponse.success(
      { reactions: updatedMessage.reactions },
      'Reaction added successfully'
    )
  );
});

/**
 * Remove a reaction from a message
 * DELETE /api/v1/messages/:messageId/reactions/:emoji
 * Private
 */
exports.removeReaction = asyncHandler(async (req, res, next) => {
  const { messageId, emoji } = req.params;

  const updatedMessage = await MessageService.removeReaction({
    messageId,
    userId: req.user._id,
    emoji,
  });

  logger.info(`Reaction ${emoji} removed from message ${messageId} by ${req.user.username}`);

  // Broadcast via Socket.io if available
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${updatedMessage.conversation}`).emit('message:reacted', {
      messageId,
      reactions: updatedMessage.reactions,
      conversationId: updatedMessage.conversation.toString(),
    });
  }

  res.status(200).json(
    ApiResponse.success(
      { reactions: updatedMessage.reactions },
      'Reaction removed successfully'
    )
  );
});

/**
 * Clear chat history for a conversation for the current user
 * POST /api/v1/messages/clear/:conversationId
 * Private
 */
exports.clearChat = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;

  await MessageService.clearChat({
    conversationId,
    userId: req.user._id,
  });

  logger.info(`Chat cleared for conversation ${conversationId} by user ${req.user.username}`);

  res.status(200).json(
    ApiResponse.success(null, 'Chat cleared successfully')
  );
});

