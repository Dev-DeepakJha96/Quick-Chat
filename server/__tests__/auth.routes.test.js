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
const { signAccessToken, signRefreshToken } = require('../src/utils/jwt');
const { hashToken } = require('../src/utils/crypto');

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

const TEST_PASSWORD = 'Password1!';

const createUser = async (overrides = {}) => {
  const userData = {
    username: 'testuser',
    email: 'test@example.com',
    password: TEST_PASSWORD,
    isEmailVerified: true,
    ...overrides,
  };
  return await User.create(userData);
};

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('newuser');
    });

    it('should return 400 on invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: '',
          email: 'not-an-email',
          password: '123',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 on duplicate email', async () => {
      await createUser({ email: 'exists@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'another',
          email: 'exists@example.com',
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with user data on valid credentials', async () => {
      await createUser();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 on invalid credentials', async () => {
      await createUser();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Wrongpassword1!',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 on unverified email', async () => {
      await createUser({ isEmailVerified: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with new tokens', async () => {
      const user = await createUser();
      const refreshToken = signRefreshToken(user._id);
      user.refreshToken = hashToken(refreshToken);
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 on invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token']);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 and clear cookies', async () => {
      const user = await createUser();
      const token = signAccessToken(user._id);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 200 with user data', async () => {
      const user = await createUser();
      const token = signAccessToken(user._id);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/auth/update-me', () => {
    it('should return 200 with updated user', async () => {
      const user = await createUser();
      const token = signAccessToken(user._id);

      const res = await request(app)
        .patch('/api/v1/auth/update-me')
        .set('Cookie', [`accessToken=${token}`])
        .send({ username: 'updatedname' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.username).toBe('updatedname');
    });
  });

  describe('PATCH /api/v1/auth/change-password', () => {
    it('should return 200 on success', async () => {
      const user = await createUser();
      const token = signAccessToken(user._id);

      const res = await request(app)
        .patch('/api/v1/auth/change-password')
        .set('Cookie', [`accessToken=${token}`])
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'Newpass1!' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200', async () => {
      await createUser();

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should return 200 with valid token', async () => {
      const user = await createUser();
      const rawToken = 'valid-token-that-is-long-enough-for-validation';
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + 60000);
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'Resetpass1!' });

      expect(res.status).toBe(200);
    });

    it('should return 400 with invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token-that-is-long-enough', newPassword: 'Resetpass1!' });

      expect(res.status).toBe(400);
    });
  });
});
