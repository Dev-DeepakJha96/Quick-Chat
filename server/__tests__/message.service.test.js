const { connect, disconnect, clearDatabase } = require('../tests/mongodb');
const Conversation = require('../src/models/Conversation.model');
const User = require('../src/models/User');
const Message = require('../src/models/Message.model');
const MessageService = require('../src/services/message.service');

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clearDatabase();
});

const unique = () => Math.random().toString(36).slice(2, 10);

describe('MessageService', () => {
  let user1, user2, conversation;

  beforeEach(async () => {
    const u1 = unique();
    const u2 = unique();
    user1 = await User.create({
      username: `user1_${u1}`,
      email: `user1_${u1}@test.com`,
      password: 'Password1!',
      isEmailVerified: true,
    });
    user2 = await User.create({
      username: `user2_${u2}`,
      email: `user2_${u2}@test.com`,
      password: 'Password1!',
      isEmailVerified: true,
    });
    conversation = await Conversation.create({
      participants: [user1._id, user2._id],
    });
  });

  describe('sendMessage', () => {
    it('should create a message in a conversation', async () => {
      const message = await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Hello World',
      });

      expect(message).toBeDefined();
      expect(message.text).toBe('Hello World');
      expect(message.sender._id.toString()).toBe(user1._id.toString());
      expect(message.conversation.toString()).toBe(conversation._id.toString());
    });

    it('should update conversation lastMessage', async () => {
      await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Hello World',
      });

      const updated = await Conversation.findById(conversation._id);
      expect(updated.lastMessage).toBeDefined();
    });

    it('should throw if conversation not found', async () => {
      const fakeId = new Conversation()._id;
      await expect(
        MessageService.sendMessage({
          conversationId: fakeId,
          senderId: user1._id,
          text: 'Hello',
        })
      ).rejects.toThrow();
    });

    it('should send a reply to an existing message', async () => {
      const original = await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Original message',
      });

      const reply = await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user2._id,
        text: 'Reply message',
        replyTo: original._id,
      });

      expect(reply.replyTo).toBeDefined();
      expect(reply.replyTo._id.toString()).toBe(original._id.toString());
    });
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Message 1',
      });
      await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user2._id,
        text: 'Message 2',
      });

      const result = await MessageService.getMessages({
        conversationId: conversation._id,
        userId: user1._id,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should exclude soft-deleted messages', async () => {
      await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Visible message',
      });
      const msg = await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Deleted message',
      });
      msg.isDeleted = true;
      await msg.save();

      const result = await MessageService.getMessages({
        conversationId: conversation._id,
        userId: user1._id,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].text).toBe('Visible message');
    });

    it('should throw if conversation not found', async () => {
      const fakeId = new Conversation()._id;
      await expect(
        MessageService.getMessages({
          conversationId: fakeId,
          userId: user1._id,
        })
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Unread message',
      });

      const result = await MessageService.markAsRead({
        conversationId: conversation._id,
        userId: user2._id,
      });

      expect(result.updatedCount).toBe(1);
    });

    it('should not mark own messages as read', async () => {
      await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'My own message',
      });

      const result = await MessageService.markAsRead({
        conversationId: conversation._id,
        userId: user1._id,
      });

      expect(result.updatedCount).toBe(0);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete if sender', async () => {
      const msg = await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'To delete',
      });

      const result = await MessageService.deleteMessage({
        messageId: msg._id,
        userId: user1._id,
      });

      expect(result.isDeleted).toBe(true);
    });

    it('should add to deletedFor if not sender', async () => {
      const msg = await MessageService.sendMessage({
        conversationId: conversation._id,
        senderId: user1._id,
        text: 'Other message',
      });

      const result = await MessageService.deleteMessage({
        messageId: msg._id,
        userId: user2._id,
      });

      expect(result.deletedFor).toContainEqual(user2._id);
    });

    it('should throw if message not found', async () => {
      const fakeId = new Message()._id;
      await expect(
        MessageService.deleteMessage({
          messageId: fakeId,
          userId: user1._id,
        })
      ).rejects.toThrow('Message not found');
    });
  });
});
