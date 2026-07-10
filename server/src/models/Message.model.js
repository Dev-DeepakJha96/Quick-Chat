const mongoose = require('mongoose');
const logger = require('../config/logger.config');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
      minlength: [1, 'Message cannot be empty'],
    },
    attachments: [
      {
        url: { type: String, trim: true },
        type: { type: String, enum: ['image', 'document', 'audio', 'video'] },
        name: { type: String, trim: true },
        size: { type: Number },
        mimeType: { type: String },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deliveredTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: {
          type: String,
          default: '👍',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, 'readBy.user': 1 });
messageSchema.index({ text: 'text' });
messageSchema.index({ isDeleted: 1 });



messageSchema.methods.markAsRead = async function (userId) {
  const userIdStr = userId.toString();
  const alreadyRead = this.readBy.some((read) => read.user.toString() === userIdStr);
  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    await this.save();
  }
  return this;
};

messageSchema.methods.deleteForUser = async function (userId) {
  const userIdStr = userId.toString();
  if (!this.deletedFor.some((id) => id.toString() === userIdStr)) {
    this.deletedFor.push(userId);
    const conversation = await mongoose.model('Conversation').findById(this.conversation);
    if (conversation) {
      const otherParticipants = conversation.participants.filter((p) => p.toString() !== userIdStr);
      const allDeleted = otherParticipants.every((p) =>
        this.deletedFor.some((d) => d.toString() === p.toString())
      );
      if (allDeleted) {
        this.isDeleted = true;
      }
    }
    await this.save();
  }
  return this;
};

messageSchema.statics.getConversationMessages = async function (conversationId, options = {}) {
  const { limit = 50, before = null, after = null, userId = null } = options;
  const query = { conversation: conversationId, isDeleted: false };
  if (before || after) {
    query.createdAt = {};
    if (before) query.createdAt.$lt = new Date(before);
    if (after) query.createdAt.$gt = new Date(after);
  }
  if (userId) query.deletedFor = { $ne: userId };

  return this.find(query)
    .populate('sender', 'username email avatarColor avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) + 1)
    .lean();
};

messageSchema.statics.getUnreadCount = async function (conversationId, userId) {
  return this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    isDeleted: false,
    'readBy.user': { $ne: userId },
  });
};

messageSchema.statics.markAllAsRead = async function (conversationId, userId) {
  const result = await this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      isDeleted: false,
      'readBy.user': { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: new Date() } },
    }
  );
  return { updatedCount: result.modifiedCount };
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
