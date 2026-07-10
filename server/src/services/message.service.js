const mongoose = require('mongoose');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const AppError = require('../utils/AppError');

class MessageService {
    
  static async sendMessage({ conversationId, senderId, text, replyTo = null }) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
      isActive: true,
    });

    if (!conversation) {
      throw new AppError('Conversation not found or user not authorized', 404);
    }

    // Validate replyTo message exists and belongs to same conversation
    if (replyTo) {
      if (!mongoose.Types.ObjectId.isValid(replyTo)) {
        throw new AppError('Invalid reply message ID format', 400);
      }
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.conversation.toString() !== conversationId.toString()) {
        throw new AppError('Reply message not found or belongs to different conversation');
      }
    }

    const messageData = {
      conversation: conversationId,
      sender: senderId,
      text: text.trim(),
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    const message = await Message.create(messageData);

    // Populate sender and replyTo info
    await message.populate('sender', 'username email avatarColor avatar');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'text sender username',
        populate: { path: 'sender', select: 'username' }
      });
    }

    // Update conversation's last message details
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    return message;
  }

  static async getMessages({conversationId, userId, limit = 50, before = null}){
       const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

     if (!conversation) {
      throw new AppError('Conversation not found or user not authorized', 404);
    }

    // Retrieve deletedAt if user previously deleted conversation
    const deleteRecord = conversation.deletedFor.find(
      (d) => d.user.toString() === userId.toString()
    );
    const after = deleteRecord ? deleteRecord.deletedAt : null;

    const messages = await Message.getConversationMessages(
      conversationId,
      { limit, before, after, userId }
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
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      throw new AppError('Conversation not found or you do not have access', 404);
    }

    const result = await Message.markAllAsRead(conversationId, userId);
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

  static async editMessage({ messageId, userId, text }) {
    if (!text || !text.trim()) {
      throw AppError.badRequest('Message text is required');
    }

    const message = await Message.findById(messageId);

    if (!message) {
      throw AppError.notFound('Message not found');
    }

    if (message.sender.toString() !== userId.toString()) {
      throw AppError.forbidden('You can only edit your own messages');
    }

    if (message.isDeleted) {
      throw AppError.badRequest('Cannot edit deleted messages');
    }

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    await message.populate('sender', 'username email avatarColor avatar');

    return message;
  }

  static async addReaction({ messageId, userId, emoji }) {
    if (!emoji || !emoji.trim()) {
      throw AppError.badRequest('Emoji is required');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw AppError.notFound('Message not found');
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }

    const existingReaction = message.reactions.find(
      (r) => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      throw AppError.badRequest('You already reacted with this emoji');
    }

    message.reactions = message.reactions.filter((r) => r.user.toString() !== userId.toString());

    message.reactions.push({ user: userId, emoji });
    await message.save();

    await message.populate('reactions.user', 'username avatarColor');

    return message;
  }

  static async removeReaction({ messageId, userId, emoji }) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw AppError.notFound('Message not found');
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }

    message.reactions = message.reactions.filter((r) => !(r.user.toString() === userId.toString() && r.emoji === emoji));

    await message.save();
    await message.populate('reactions.user', 'username avatarColor');

    return message;
  }

  static async clearChat({ conversationId, userId }) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }

    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    return true;
  }
}

module.exports = MessageService; 