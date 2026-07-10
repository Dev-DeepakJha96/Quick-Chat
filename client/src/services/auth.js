import api from './api';

export const authService = {
  async register(userData) {
    // userData contains { name, username, email, password, confirmPassword }
    // Note: The backend registerSchema validates these.
    return api.post('/auth/register', userData);
  },

  async verifyEmail(token) {
    return api.post('/auth/verify-email', { token });
  },

  async login(credentials) {
    // credentials contains { email, password }
    return api.post('/auth/login', credentials);
  },

  async getMe() {
    return api.get('/auth/me');
  },

  async updateMe(profileData) {
    // profileData contains fields to update like bio, username, avatarColor
    return api.patch('/auth/update-me', profileData);
  },

  async changePassword(passwordData) {
    // passwordData contains { currentPassword, newPassword }
    return api.patch('/auth/change-password', passwordData);
  },

  async logout() {
    return api.post('/auth/logout');
  },
};

export default authService;
