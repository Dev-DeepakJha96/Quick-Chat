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

describe('Conversation Routes', () => {
  let user1, user2, token1;

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
    token1 = signAccessToken(user1._id);
  });

  describe('POST /api/v1/conversations', () => {
    it('should create a conversation and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [`accessToken=${token1}`])
        .send({ participantId: user2._id });

      expect(res.status).toBe(201);
      expect(res.body.data.conversation).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .send({ participantId: user2._id });

      expect(res.status).toBe(401);
    });

    it('should return 400 when creating conversation with self', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [`accessToken=${token1}`])
        .send({ participantId: user1._id });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/conversations', () => {
    it('should return 200 with user conversations', async () => {
      await Conversation.create({
        participants: [user1._id, user2._id],
      });

      const res = await request(app)
        .get('/api/v1/conversations')
        .set('Cookie', [`accessToken=${token1}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.conversations).toBeDefined();
      expect(Array.isArray(res.body.data.conversations)).toBe(true);
    });
  });

  describe('GET /api/v1/conversations/:conversationId', () => {
    it('should return 200 with conversation', async () => {
      const conv = await Conversation.create({
        participants: [user1._id, user2._id],
      });

      const res = await request(app)
        .get(`/api/v1/conversations/${conv._id}`)
        .set('Cookie', [`accessToken=${token1}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.conversation).toBeDefined();
    });

    it('should return 404 if not participant', async () => {
      const u3 = unique();
      const user3 = await User.create({
        username: `user3_${u3}`,
        email: `user3_${u3}@test.com`,
        password: TEST_PASSWORD,
        isEmailVerified: true,
      });
      const conv = await Conversation.create({
        participants: [user1._id, user2._id],
      });

      const token3 = signAccessToken(user3._id);
      const res = await request(app)
        .get(`/api/v1/conversations/${conv._id}`)
        .set('Cookie', [`accessToken=${token3}`]);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/conversations/:conversationId', () => {
    it('should return 200 and archive conversation', async () => {
      const conv = await Conversation.create({
        participants: [user1._id, user2._id],
      });

      const res = await request(app)
        .delete(`/api/v1/conversations/${conv._id}`)
        .set('Cookie', [`accessToken=${token1}`]);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/conversations/unread-count', () => {
    it('should return 200 with unread count', async () => {
      const res = await request(app)
        .get('/api/v1/conversations/unread-count')
        .set('Cookie', [`accessToken=${token1}`]);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.unreadCount).toBe('number');
    });
  });
});
