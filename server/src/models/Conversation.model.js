const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
    ],
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
    isActive: {
      type: Boolean,
      default: true,
    },
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

conversationSchema.index(
  { participants: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ isActive: 1, lastMessageAt: -1 });

conversationSchema.virtual('otherParticipant').get(function () {
  if (this.participants && this.participants.length === 2) {
    return this.participants[0];
  }
  return null;
});

conversationSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversation',
  count: true,
});

conversationSchema.pre('save', async function () {
  if (this.participants && this.participants.length === 2) {
    this.participants.sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );
  }
});

conversationSchema.statics.findOrCreate = async function (user1Id, user2Id) {
  const participants = [user1Id, user2Id].sort();

  let conversation = await this.findOne({
    participants: { $all: participants, $size: 2 },
    isActive: true,
  });

  if (!conversation) {
    conversation = await this.create({
      participants: participants,
    });
  }

  return conversation;
};

conversationSchema.statics.getUserConversations = async function (userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    participants: userId,
    isActive: true,
  })
    .populate('participants', 'username email avatarColor isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit);
};

conversationSchema.statics.existsBetweenUsers = async function (user1Id, user2Id) {
  const participants = [user1Id, user2Id].sort();
  const conversation = await this.findOne({
    participants: { $all: participants, $size: 2 },
    isActive: true,
  });
  return !!conversation;
};

conversationSchema.statics.getTotalUnreadCount = async function (userId) {
  const Message = mongoose.model('Message');

  // Find all conversations for user
  const conversations = await this.find({
    participants: userId,
    isActive: true,
  }).select('_id');

  const conversationIds = conversations.map((conv) => conv._id);

  if (conversationIds.length === 0) return 0;

  // Count unread messages in these conversations
  const count = await Message.countDocuments({
    conversation: { $in: conversationIds },
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
  });

  return count;
};

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;