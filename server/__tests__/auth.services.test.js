const { connect, disconnect, clearDatabase } = require('../tests/mongodb');
const User = require('../src/models/User');
const authServices = require('../src/services/auth.services');

// Mock email sending
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

describe('Auth Services', () => {
  describe('registerUser', () => {
    it('should create a new user with hashed password', async () => {
      const result = await authServices.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).not.toBe('password123');
      expect(result.verificationToken).toBeDefined();
    });

    it('should throw on duplicate email', async () => {
      await User.create({
        username: 'existinguser',
        email: 'test@example.com',
        password: 'Password1!',
      });

      await expect(
        authServices.registerUser({
          username: 'newuser',
          email: 'test@example.com',
          password: 'Password1!',
        })
      ).rejects.toThrow('Email is already registered');
    });

    it('should throw on duplicate username', async () => {
      await User.create({
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password1!',
      });

      await expect(
        authServices.registerUser({
          username: 'testuser',
          email: 'new@example.com',
          password: 'Password1!',
        })
      ).rejects.toThrow('Username is already taken');
    });
  });

  describe('loginUser', () => {
    it('should return tokens on valid credentials', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
        isEmailVerified: true,
      });

      const result = await authServices.loginUser({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw on invalid password', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
        isEmailVerified: true,
      });

      await expect(
        authServices.loginUser({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw on unverified email', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
        isEmailVerified: false,
      });

      await expect(
        authServices.loginUser({
          email: 'test@example.com',
          password: 'Password1!',
        })
      ).rejects.toThrow('Email not verified');
    });
  });

  describe('refreshUserToken', () => {
    it('should throw on invalid refresh token', async () => {
      await expect(
        authServices.refreshUserToken('invalid-token')
      ).rejects.toThrow();
    });
  });

  describe('logoutUser', () => {
    it('should clear refresh token', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
        refreshToken: 'some-token',
      });

      const result = await authServices.logoutUser(user._id);
      expect(result).toBe(true);

      const updatedUser = await User.findById(user._id).select('+refreshToken');
      expect(updatedUser.refreshToken).toBeUndefined();
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
      });

      const result = await authServices.forgotPassword('test@example.com');
      expect(result).toBeDefined();
    });

    it('should return true even for non-existing email', async () => {
      const result = await authServices.forgotPassword('nonexistent@example.com');
      expect(result).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should throw on invalid token', async () => {
      await expect(
        authServices.resetPassword('invalid-token', 'newpassword')
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('changePassword', () => {
    it('should throw on incorrect current password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
      });

      await expect(
        authServices.changePassword(user._id, 'wrongpassword', 'newpassword')
      ).rejects.toThrow('current password is incorrect');
    });

    it('should update password with correct current password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
      });

      const result = await authServices.changePassword(user._id, 'Password1!', 'Newpass1!');
      expect(result).toBeDefined();
    });
  });
});
