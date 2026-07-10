process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '4';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.EMAIL_HOST = 'smtp.gmail.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'testpass';

const request = require('supertest');
const { connect, disconnect, clearDatabase } = require('../tests/mongodb');
const app = require('../src/app');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation.model');
const Message = require('../src/models/Message.model');
const { signAccessToken } = require('../src/utils/jwt');

jest.mock('../src/services/email/sendmail', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clearDatabase();
});

const unique = () => Math.random().toString(36).slice(2, 8);
const TEST_PASSWORD = 'Password1!';

describe('Message Routes', () => {
  let user1, user2, conversation, token1, token2;

  beforeEach(async () => {
    const u1 = unique();
    const u2 = unique();
    user1 = await User.create({
      username: `user1_${u1}`,
      email: `user1_${u1}@test.com`,
      password: TEST_PASSWORD,
      isEmailVerified: true,
    });
    user2 = await User.create({
      username: `user2_${u2}`,
      email: `user2_${u2}@test.com`,
      password: TEST_PASSWORD,
      isEmailVerified: true,
    });
    conversation = await Conversation.create({
      participants: [user1._id, user2._id],
    });
    token1 = signAccessToken(user1._id);
    token2 = signAccessToken(user2._id);
  });

  describe('POST /api/v1/messages', () => {
    it('should send a message and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Cookie', [`accessToken=${token1}`])
        .send({
          conversationId: conversation._id.toString(),
          text: 'Hello World',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBeDefined();
      expect(res.body.data.message.text).toBe('Hello World');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({
          conversationId: conversation._id.toString(),
          text: 'Hello',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/messages/:conversationId', () => {
    it('should return 200 with messages', async () => {
      await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'Test message',
      });

      const res = await request(app)
        .get(`/api/v1/messages/${conversation._id}`)
        .set('Cookie', [`accessToken=${token1}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.messages).toBeDefined();
    });
  });

  describe('PATCH /api/v1/messages/:messageId', () => {
    it('should edit a message and return 200', async () => {
      const msg = await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'Original text',
      });

      const res = await request(app)
        .patch(`/api/v1/messages/${msg._id}`)
        .set('Cookie', [`accessToken=${token1}`])
        .send({ text: 'Edited text' });

      expect(res.status).toBe(200);
      expect(res.body.data.message.text).toBe('Edited text');
      expect(res.body.data.message.isEdited).toBe(true);
    });

    it('should return 403 if not sender', async () => {
      const msg = await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'Original text',
      });

      const res = await request(app)
        .patch(`/api/v1/messages/${msg._id}`)
        .set('Cookie', [`accessToken=${token2}`])
        .send({ text: 'Hacked text' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/messages/:messageId/reactions', () => {
    it('should add a reaction and return 200', async () => {
      const msg = await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'React to this',
      });

      const res = await request(app)
        .post(`/api/v1/messages/${msg._id}/reactions`)
        .set('Cookie', [`accessToken=${token2}`])
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      expect(res.body.data.reactions).toBeDefined();
    });
  });

  describe('DELETE /api/v1/messages/:messageId/reactions/:emoji', () => {
    it('should remove a reaction and return 200', async () => {
      const msg = await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'React to this',
        reactions: [{ user: user2._id, emoji: '👍' }],
      });

      const res = await request(app)
        .delete(`/api/v1/messages/${msg._id}/reactions/%F0%9F%91%8D`)
        .set('Cookie', [`accessToken=${token2}`]);

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/messages/:messageId', () => {
    it('should delete a message and return 200', async () => {
      const msg = await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'To delete',
      });

      const res = await request(app)
        .delete(`/api/v1/messages/${msg._id}`)
        .set('Cookie', [`accessToken=${token1}`]);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/messages/mark-read', () => {
    it('should mark messages as read and return 200', async () => {
      await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'Unread message',
      });

      const res = await request(app)
        .post('/api/v1/messages/mark-read')
        .set('Cookie', [`accessToken=${token2}`])
        .send({ conversationId: conversation._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(1);
    });
  });

  describe('GET /api/v1/messages/unread/:conversationId', () => {
    it('should return 200 with unread count', async () => {
      await Message.create({
        conversation: conversation._id,
        sender: user1._id,
        text: 'Unread message',
      });

      const res = await request(app)
        .get(`/api/v1/messages/unread/${conversation._id}`)
        .set('Cookie', [`accessToken=${token2}`]);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.unreadCount).toBe('number');
    });
  });
});
