const { connectedUsers, userSockets, typingUsers } = require('../config/socket.config');
const User = require('../models/User.model');
const Conversation = require('../models/Conversation.model');
const logger = require('../config/logger.config');

/**
 * Socket Service - Helper functions for socket operations
 */
class SocketService {
  /**
   * Get socket ID for a user
   * @param {string} userId - User ID
   * @returns {string|null} - Socket ID or null if offline
   */
  static getSocketId(userId) {
    return connectedUsers.get(userId.toString()) || null;
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} - True if online
   */
  static isUserOnline(userId) {
    return connectedUsers.has(userId.toString());
  }

  /**
   * Get all online users
   * @returns {Array} - Array of user IDs
   */
  static getOnlineUsers() {
    return Array.from(connectedUsers.keys());
  }

  /**
   * Get online users in a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array>} - Array of online user objects
   */
  static async getOnlineUsersInConversation(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return [];
      
      const onlineUsers = [];
      for (const participant of conversation.participants) {
        const userId = participant.toString();
        if (this.isUserOnline(userId)) {
          const user = await User.findById(userId)
            .select('username email avatarColor')
            .lean();
          if (user) {
            onlineUsers.push({
              ...user,
              isOnline: true,
            });
          }
        }
      }
      return onlineUsers;
    } catch (error) {
      logger.error('Error getting online users in conversation:', error);
      return [];
    }
  }

  /**
   * Get typing users in a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Array} - Array of user IDs currently typing
   */
  static getTypingUsers(conversationId) {
    return typingUsers.has(conversationId) 
      ? Array.from(typingUsers.get(conversationId))
      : [];
  }

  /**
   * Broadcast event to all users in a conversation
   * @param {Object} io - Socket.io instance
   * @param {string} conversationId - Conversation ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  static broadcastToConversation(io, conversationId, event, data) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * Send event to a specific user
   * @param {Object} io - Socket.io instance
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  static sendToUser(io, userId, event, data) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Update user's online status and notify others
   * @param {Object} io - Socket.io instance
   * @param {string} userId - User ID
   * @param {boolean} isOnline - Online status
   */
  static async updateUserStatus(io, userId, isOnline) {
    try {
      // Update database
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: isOnline ? null : new Date(),
      });
      
      // Get all conversations for this user
      const conversations = await Conversation.find({
        participants: userId,
        isActive: true,
      }).select('participants');
      
      // Get user data
      const user = await User.findById(userId).select('username avatarColor isOnline');
      
      // Notify all participants
      const participantsToNotify = new Set();
      conversations.forEach(conv => {
        conv.participants.forEach(p => {
          if (p.toString() !== userId) {
            participantsToNotify.add(p.toString());
          }
        });
      });
      
      const statusData = {
        userId,
        username: user.username,
        avatarColor: user.avatarColor,
        isOnline,
        lastSeen: isOnline ? null : new Date(),
      };
      
      // Send to each participant
      for (const participantId of participantsToNotify) {
        this.sendToUser(io, participantId, 'user:status', statusData);
      }
      
      logger.debug(`User ${user.username} status updated to ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      logger.error('Error updating user status:', error);
    }
  }
}

module.exports = SocketService;
