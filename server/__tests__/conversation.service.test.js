const { connect, disconnect, clearDatabase } = require('../tests/mongodb');
const Conversation = require('../src/models/Conversation.model');
const User = require('../src/models/User');
const Message = require('../src/models/Message.model');
const ConversationService = require('../src/services/conversation.service');
const AppError = require('../src/utils/AppError');

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

describe('ConversationService', () => {
  let user1, user2;

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
  });

  describe('getOrCreateConversation', () => {
    it('should create a new conversation between two users', async () => {
      const conversation = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      expect(conversation).toBeDefined();
      expect(conversation.participants).toHaveLength(2);
      expect(conversation.isActive).toBe(true);
    });

    it('should return existing conversation if one already exists', async () => {
      const first = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });
      const second = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      expect(first._id.toString()).toBe(second._id.toString());
    });

    it('should throw if one user does not exist', async () => {
      const fakeId = new User()._id;
      await expect(
        ConversationService.getOrCreateConversation({
          user1Id: user1._id,
          user2Id: fakeId,
        })
      ).rejects.toThrow('One or both users not found');
    });
  });

  describe('getUserConversations', () => {
    it('should return conversations for a user', async () => {
      await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      const result = await ConversationService.getUserConversations({
        userId: user1._id,
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty array for user with no conversations', async () => {
      const u3 = unique();
      const user3 = await User.create({
        username: `user3_${u3}`,
        email: `user3_${u3}@test.com`,
        password: 'Password1!',
        isEmailVerified: true,
      });

      const result = await ConversationService.getUserConversations({
        userId: user3._id,
      });

      expect(result.conversations).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getConversation', () => {
    it('should return conversation by ID for participant', async () => {
      const conv = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      const result = await ConversationService.getConversation({
        conversationId: conv._id,
        userId: user1._id,
      });

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(conv._id.toString());
    });

    it('should throw if user is not participant', async () => {
      const conv = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      const u3 = unique();
      const user3 = await User.create({
        username: `user3_${u3}`,
        email: `user3_${u3}@test.com`,
        password: 'Password1!',
        isEmailVerified: true,
      });

      await expect(
        ConversationService.getConversation({
          conversationId: conv._id,
          userId: user3._id,
        })
      ).rejects.toThrow('Conversation not Found');
    });
  });

  describe('deleteConversation', () => {
    it('should add user to deletedFor and keep participants intact', async () => {
      const conv = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      const result = await ConversationService.deleteConversation({
        conversationId: conv._id,
        userId: user1._id,
      });

      expect(result).toBe(true);

      const updated = await Conversation.findById(conv._id);
      expect(updated.participants).toHaveLength(2);
      expect(updated.deletedFor).toHaveLength(1);
      expect(updated.deletedFor[0].user.toString()).toBe(user1._id.toString());
      expect(updated.deletedFor[0].deletedAt).toBeDefined();
    });

    it('should allow both users to delete the conversation independently', async () => {
      const conv = await ConversationService.getOrCreateConversation({
        user1Id: user1._id,
        user2Id: user2._id,
      });

      await ConversationService.deleteConversation({
        conversationId: conv._id,
        userId: user1._id,
      });

      await ConversationService.deleteConversation({
        conversationId: conv._id,
        userId: user2._id,
      });

      const updated = await Conversation.findById(conv._id);
      expect(updated.participants).toHaveLength(2);
      expect(updated.deletedFor).toHaveLength(2);
      expect(updated.isActive).toBe(true);
    });

    it('should throw if conversation not found', async () => {
      const fakeId = new Conversation()._id;
      await expect(
        ConversationService.deleteConversation({
          conversationId: fakeId,
          userId: user1._id,
        })
      ).rejects.toThrow('Conversation not found');
    });
  });
});
