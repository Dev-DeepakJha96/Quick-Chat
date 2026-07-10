const Conversation = require('../models/Conversation.model');
const User = require('../models/User');
const AppError = require('../utils/AppError');

class ConversationService {
  static async getOrCreateConversation({ user1Id, user2Id }) {
    const users = await User.find({
      _id: { $in: [user1Id, user2Id] },
      isActive: true,
    });

    if (users.length !== 2) {
      throw new AppError('One or both users not found');
    }

    const conversation = await Conversation.findOrCreate(user1Id, user2Id);
    await conversation.populate('participants', 'username email avatarColor avatar isOnline lastSeen');
    return conversation;
  }

  static async getUserConversations({ userId, limit = 50, skip = 0 }) {
    // Use aggregation pipeline to get conversations with unread counts in a single query
    const conversationsWithUnread = await Conversation.getUserConversations(userId, {
      limit,
      skip,
    });

    return {
      conversations: conversationsWithUnread,
      total: conversationsWithUnread.length,
    };
  }

  static async conversationExists({ user1Id, user2Id }) {
    return await Conversation.existsBetweenUsers(user1Id, user2Id);
  }

  static async getConversation({ conversationId, userId }) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    })
      .populate('participants', 'username email avatarColor avatar isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      throw new AppError('Conversation not Found', 404);
    }
    return conversation;
  }

  static async deleteConversation({ conversationId, userId }) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new AppError('Conversation not found');
    }

    // Check if user already deleted it, if not, add it
    const isAlreadyDeleted = conversation.deletedFor.some(
      (d) => d.user.toString() === userId.toString()
    );

    if (!isAlreadyDeleted) {
      conversation.deletedFor.push({
        user: userId,
        deletedAt: new Date(),
      });
    }

    await conversation.save();
    return true;
  }
}

module.exports = ConversationService; 