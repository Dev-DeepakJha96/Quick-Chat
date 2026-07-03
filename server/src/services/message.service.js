const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const AppError = require('../utils/AppError');

class MessageService {
    
  static async sendMessage({ conversationId, senderId, text }) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
      isActive: true,
    });

    if (!conversation) {
      throw new AppError('Conversation not found or user not authorized');
    }
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      text: text.trim(),
    });

    // Populate sender info
    await message.populate('sender', 'username email avatarColor');

    return message;
  }

  static async getMessages({conversationId, userId, limit = 50, before = null}){
       const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

     if (!conversation) {
      throw new AppError('Conversation not found');
    }
      const messages = await Message.getConversationMessages(
      conversationId,
      { limit, before, userId }
    );
        const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, -1) : messages;

    return {
      messages: results,
      hasMore,
      nextBefore: results.length > 0 ? results[0].createdAt : null,
    };
  }

  static async markAsRead({conversationId,userId}){
    const result = await Message.markAllAsRead(conversationId,userId); 
    return result; 
  }

  static async deleteMessage({ messageId, userId}){
    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: userId,
    });
    if (!conversation) {
      throw new AppError('Not authorized to delete this message');
    }
    if (message.sender.toString() === userId.toString()) {
      message.isDeleted = true;
      await message.save();
      return message;
    }
    return await message.deleteForUser(userId);
  }

}

module.exports = MessageService; 