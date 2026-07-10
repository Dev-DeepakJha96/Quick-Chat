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
    deletedFor: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        deletedAt: {
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

conversationSchema.index(
  { 'participants.0': 1, 'participants.1': 1 },
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
  const Message = mongoose.model('Message');

  // Use aggregation to get conversations with unread counts in a single query
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const result = await this.aggregate([
    // Match user's active conversations
    { $match: { 
      participants: userObjectId, 
      isActive: true,
      $expr: {
        $let: {
          vars: {
            userDelete: {
              $filter: {
                input: { $ifNull: ['$deletedFor', []] },
                as: 'd',
                cond: { $eq: ['$$d.user', userObjectId] }
              }
            }
          },
          in: {
            $or: [
              { $eq: [{ $size: '$$userDelete' }, 0] },
              { $gt: ['$lastMessageAt', { $arrayElemAt: ['$$userDelete.deletedAt', 0] }] }
            ]
          }
        }
      }
    } },
    
    // Sort by lastMessageAt descending
    { $sort: { lastMessageAt: -1 } },
    
    // Skip and limit for pagination
    { $skip: skip },
    { $limit: limit },
    
    // Lookup to populate participants
    { $lookup: {
      from: 'users',
      let: { participantIds: '$participants' },
      pipeline: [
        { $match: { $expr: { $in: ['$_id', '$$participantIds'] } } },
        { $project: { username: 1, email: 1, avatarColor: 1, avatar: 1, isOnline: 1, lastSeen: 1 } }
      ],
      as: 'participantsData'
    }},
    
    // Lookup to populate lastMessage
    { $lookup: {
      from: 'messages',
      let: { lastMessageId: '$lastMessage' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$lastMessageId'] } } }
      ],
      as: 'lastMessageData'
    }},
    
    // Unwind lastMessageData (if exists)
    { $unwind: { path: '$lastMessageData', preserveNullAndEmptyArrays: true } },
    
    // Add unread count using $facet in a sub-pipeline
    { $set: {
      unreadCount: { $toInt: 0 } // Default value, will be calculated below
    }},
    
    // Project final structure
    { $project: {
      _id: 1,
      participants: '$participantsData',
      lastMessage: '$lastMessageData',
      lastMessageAt: 1,
      isActive: 1,
      createdAt: 1,
      updatedAt: 1,
      unreadCount: 1
    }}
  ]);

  // Get unread counts for all conversations in a single query
  if (result.length > 0) {
    const conversationIds = result.map(conv => conv._id);
    
    // Aggregate unread counts for all conversations at once
    const unreadCounts = await Message.aggregate([
      { $match: {
        conversation: { $in: conversationIds },
        sender: { $ne: userId },
        isDeleted: false,
        'readBy.user': { $ne: userId }
      }},
      { $group: {
        _id: '$conversation',
        count: { $sum: 1 }
      }}
    ]);

    // Create a map of conversation ID to unread count
    const unreadMap = new Map();
    unreadCounts.forEach(item => {
      unreadMap.set(item._id.toString(), item.count);
    });

    // Update result with unread counts
    result.forEach(conv => {
      conv.unreadCount = unreadMap.get(conv._id.toString()) || 0;
    });
  }

  return result;
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

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Find all conversations for user
  const conversations = await this.find({
    participants: userObjectId,
    isActive: true,
    $expr: {
      $let: {
        vars: {
          userDelete: {
            $filter: {
              input: { $ifNull: ['$deletedFor', []] },
              as: 'd',
              cond: { $eq: ['$$d.user', userObjectId] }
            }
          }
        },
        in: {
          $or: [
            { $eq: [{ $size: '$$userDelete' }, 0] },
            { $gt: ['$lastMessageAt', { $arrayElemAt: ['$$userDelete.deletedAt', 0] }] }
          ]
        }
      }
    }
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