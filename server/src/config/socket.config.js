const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { verifyAccessToken } = require('../utils/jwt');

const User = require('../models/User');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const MessageService = require('../services/message.service');

const config = require('./env.config');
const logger = require('./logger.config');

/**
 * In-memory stores
 */
const connectedUsers = new Map(); // userId -> Set(socketId)
const userSockets = new Map(); // socketId -> userId
const typingUsers = new Map(); // conversationId -> Set(userId)

/**
 * Global safety handlers (VERY IMPORTANT)
 */
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
});

/**
 * Helper: safe callback
 */
const safeCallback = (cb) => (typeof cb === 'function' ? cb : () => {});

/**
 * Helper: async wrapper for socket events
 */
const socketAsyncHandler = (fn) => {
  return (data, callback) => {
    Promise.resolve(fn(data, callback)).catch((err) => {
      logger.error('Socket Error:', err);
      if (callback) {
        callback({
          success: false,
          error: err.message || 'Internal server error',
        });
      }
    });
  };
};

/**
 * Init Socket
 */
const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.server.clientUrls,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  /**
   * AUTH MIDDLEWARE
   */
  io.use(async (socket, next) => {
    try {
      let token = null;

      const cookieHeader = socket.handshake.headers?.cookie;
      if (cookieHeader) {
        const parsed = cookie.parse(cookieHeader);
        token = parsed.accessToken;
      }

      if (!token) {
        token = socket.handshake.auth?.token;
      }

      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);

      const user = await User.findById(decoded.sub).select(
        'username email avatarColor isActive'
      );

      if (!user) return next(new Error('User not found'));
      if (!user.isActive) return next(new Error('User deactivated'));

      socket.user = user;
      socket.userId = user._id.toString();

      next();
    } catch (err) {
      logger.error('Socket auth error:', err);
      next(new Error('Authentication failed'));
    }
  });

  /**
   * CONNECTION
   */
  io.on('connection', (socket) => {
    const userId = socket.userId;
    const username = socket.user?.username || 'Unknown';

    // store connection
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }

    connectedUsers.get(userId).add(socket.id);
    userSockets.set(socket.id, userId);

    // mark online (first device only)
    if (connectedUsers.get(userId).size === 1) {
      User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      }).catch((err) => logger.error(err));

      notifyOnlineStatus(io, userId, true);
    }

    socket.join(`user:${userId}`);

    /**
     * Join conversations
     */
    Conversation.find({ participants: userId, isActive: true })
      .select('_id')
      .then((conversations) => {
        conversations.forEach((c) => {
          socket.join(`conversation:${c._id}`);
        });

        socket.emit('conversations:joined', {
          conversationIds: conversations.map((c) => c._id.toString()),
        });
      })
      .catch((err) => logger.error('Conversation join error:', err));

    /**
     * MESSAGE SEND
     */
    socket.on(
      'message:send',
      socketAsyncHandler(async (data, callback) => {
        const cb = safeCallback(callback);

        if (!data?.conversationId || !data?.text) {
          return cb({ success: false, error: 'Invalid data' });
        }

        const message = await MessageService.sendMessage({
          conversationId: data.conversationId,
          senderId: userId,
          text: data.text,
          replyTo: data.replyTo,
        });

        io.to(`conversation:${data.conversationId}`).emit(
          'message:receive',
          {
            message,
            conversationId: data.conversationId,
          }
        );

        cb({ success: true, message });
      })
    );

    /**
     * EDIT MESSAGE
     */
    socket.on(
      'message:edit',
      socketAsyncHandler(async (data, callback) => {
        const cb = safeCallback(callback);

        if (!data?.messageId || !data?.text) {
          return cb({ success: false, error: 'Invalid data' });
        }

        const message = await MessageService.editMessage({
          messageId: data.messageId,
          userId,
          text: data.text,
        });

        io.to(`conversation:${message.conversation}`).emit(
          'message:edited',
          {
            message,
            conversationId: message.conversation.toString(),
          }
        );

        cb({ success: true, message });
      })
    );

    /**
     * REACTIONS
     */
    socket.on(
      'message:react',
      socketAsyncHandler(async (data, callback) => {
        const cb = safeCallback(callback);

        const updated = await MessageService.addReaction({
          messageId: data.messageId,
          userId,
          emoji: data.emoji,
        });

        io.to(`conversation:${updated.conversation}`).emit(
          'message:reacted',
          {
            messageId: data.messageId,
            reactions: updated.reactions,
            conversationId: updated.conversation.toString(),
          }
        );

        cb({ success: true, reactions: updated.reactions });
      })
    );

    /**
     * UNREACT
     */
    socket.on(
      'message:unreact',
      socketAsyncHandler(async (data, callback) => {
        const cb = safeCallback(callback);

        const updated = await MessageService.removeReaction({
          messageId: data.messageId,
          userId,
          emoji: data.emoji,
        });

        io.to(`conversation:${updated.conversation}`).emit(
          'message:reacted',
          {
            messageId: data.messageId,
            reactions: updated.reactions,
            conversationId: updated.conversation.toString(),
          }
        );

        cb({ success: true, reactions: updated.reactions });
      })
    );

    /**
     * TYPING
     */
    socket.on('typing:start', (data) => {
      if (!data?.conversationId) return;

      if (!typingUsers.has(data.conversationId)) {
        typingUsers.set(data.conversationId, new Set());
      }

      typingUsers.get(data.conversationId).add(userId);

      socket.to(`conversation:${data.conversationId}`).emit(
        'typing:indicator',
        {
          conversationId: data.conversationId,
          userId,
          username,
          isTyping: true,
        }
      );
    });

    socket.on('typing:stop', (data) => {
      if (!data?.conversationId) return;

      typingUsers.get(data.conversationId)?.delete(userId);

      socket.to(`conversation:${data.conversationId}`).emit(
        'typing:indicator',
        {
          conversationId: data.conversationId,
          userId,
          username,
          isTyping: false,
        }
      );
    });

    /**
     * READ RECEIPT
     */
    socket.on('message:read', async (data) => {
      try {
        if (!data?.conversationId || !data?.messageId) return;

        const message = await Message.findById(data.messageId);
        if (!message) return;

        await message.markAsRead(userId);

        io.to(`conversation:${data.conversationId}`).emit(
          'message:readReceipt',
          {
            conversationId: data.conversationId,
            messageId: data.messageId,
            readBy: userId,
            readAt: new Date(),
          }
        );
      } catch (err) {
        logger.error('Read receipt error:', err);
      }
    });

    /**
     * DISCONNECT
     */
    socket.on('disconnect', () => {
      userSockets.delete(socket.id);

      const set = connectedUsers.get(userId);
      if (set) {
        set.delete(socket.id);

        if (set.size === 0) {
          connectedUsers.delete(userId);

          User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          }).catch((err) => logger.error(err));

          notifyOnlineStatus(io, userId, false);
        }
      }

      logger.info(`🔌 Disconnected: ${username}`);
    });
  });

  /**
   * ONLINE STATUS NOTIFIER
   */
  async function notifyOnlineStatus(io, userId, isOnline) {
    try {
      const conversations = await Conversation.find({
        participants: userId,
        isActive: true,
      }).select('participants');

      const user = await User.findById(userId).select(
        'username avatarColor'
      );

      if (!user) return;

      const recipients = new Set();

      conversations.forEach((c) => {
        c.participants.forEach((p) => {
          const id = p.toString();
          if (id !== userId) recipients.add(id);
        });
      });

      recipients.forEach((id) => {
        io.to(`user:${id}`).emit('user:status', {
          userId,
          username: user.username,
          avatarColor: user.avatarColor,
          isOnline,
        });
      });
    } catch (err) {
      logger.error('notifyOnlineStatus error:', err);
    }
  }

  return io;
};

module.exports = {
  initSocket,
  connectedUsers,
  userSockets,
  typingUsers,
};