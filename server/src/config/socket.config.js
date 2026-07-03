const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const config = require('./env.config');
const logger = require('./logger.config');

/**
 * Socket.io Configuration
 */
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId
const typingUsers = new Map(); // conversationId -> Set of userIds

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.server.clientUrls,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout:  60000,
    pingInterval:  25000,
    transports: ['websocket', 'polling'],
  });

  // ====================
  // Authentication Middleware
  // ====================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      // Verify JWT using accessSecret
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      
      const user = await User.findById(decoded.sub).select('username email avatarColor isActive');
      if (!user) return next(new Error('User not found'));
      if (!user.isActive) return next(new Error('User account is deactivated'));

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // ====================
  // Connection Handler
  // ====================
  io.on('connection', (socket) => {
    const { userId } = socket;
    const { username } = socket.user;
    logger.info(`🔌 User connected: ${username} (${userId})`);

    // Store user connection
    const existingSocketId = connectedUsers.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      userSockets.delete(existingSocketId);
    }
    connectedUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);

    // Update DB status
    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch(err => logger.error(err));
    notifyOnlineStatus(io, userId, true);

    socket.join(`user:${userId}`);

    // Join conversation rooms
    Conversation.find({ participants: userId, isActive: true })
      .select('_id')
      .then(conversations => {
        conversations.forEach(conv => socket.join(`conversation:${conv._id}`));
      })
      .catch(err => logger.error('Error joining conversation rooms:', err));

    // ====================
    // Message Broadcasting
    // ====================
    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, text } = data;
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId, isActive: true });
        
        if (!conversation) return callback({ success: false, error: 'Unauthorized' });

        const message = await Message.create({ conversation: conversationId, sender: userId, text: text.trim() });
        await message.populate('sender', 'username email avatarColor');

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        io.to(`conversation:${conversationId}`).emit('message:receive', { message, conversationId });
        callback({ success: true, message });
      } catch (error) {
        callback({ success: false, error: 'Failed to send' });
      }
    });

    // ====================
    // Disconnect Handler
    // ====================
    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      userSockets.delete(socket.id);
      
      User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(err => logger.error(err));
      notifyOnlineStatus(io, userId, false);
      logger.info(`🔌 User disconnected: ${username}`);
    });
  });

  // Helper
  async function notifyOnlineStatus(io, userId, isOnline) {
    const conversations = await Conversation.find({ participants: userId, isActive: true }).select('participants');
    const participants = new Set();
    conversations.forEach(c => c.participants.forEach(p => participants.add(p.toString())));
    
    const user = await User.findById(userId).select('username avatarColor');
    participants.forEach(pid => {
      if (pid !== userId) io.to(`user:${pid}`).emit('user:status', { userId, ...user.toObject(), isOnline });
    });
  }

  return io;
};

module.exports = { initSocket, connectedUsers, userSockets, typingUsers };
