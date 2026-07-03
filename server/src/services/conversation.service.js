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
    await conversation.populate('participants', 'username email avatarColor isOnline lastSeen');
    return conversation;
  }
  static async getUserConversations({ userId, limit = 50, skip = 0 }) {
    const conversations = await Conversation.getUserConversations(userId, {
      limit,
      skip,
    });

    const Message = require('../models/Message.model');
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.getUnreadCount(conv._id, userId);
        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

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
      .populate('participants', 'username email avatarColor isOnline lastSeen')
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
    conversation.participants = conversation.participants.filter(
      (p)=> p.toString() !== userId.toString()
    )

       if (conversation.participants.length === 0) {
      // If no participants left, deactivate
      conversation.isActive = false;
    }
  await conversation.save(); 
  return true; 
  }
}

module.exports = ConversationService; 