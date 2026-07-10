import api from './api';

export const chatService = {
  // Conversations
  async getConversations(limit = 50, skip = 0) {
    return api.get('/conversations', { params: { limit, skip } });
  },

  async createConversation(participantId) {
    return api.post('/conversations', { participantId });
  },

  async getConversation(conversationId) {
    return api.get(`/conversations/${conversationId}`);
  },

  async deleteConversation(conversationId) {
    return api.delete(`/conversations/${conversationId}`);
  },

  async getUnreadCount() {
    return api.get('/conversations/unread-count');
  },

  // Messages
  async getMessages(conversationId, limit = 50, before = null) {
    return api.get(`/messages/${conversationId}`, { params: { limit, before } });
  },

  async sendMessage(conversationId, text, replyTo = null) {
    console.log('--- FRONTEND AXIOS REQUEST: sendMessage ---');
    console.log('conversationId:', conversationId);
    console.log('text:', text);
    console.log('replyTo:', replyTo);
    console.log('-------------------------------------------');
    
    const payload = { conversationId, text };
    if (replyTo) {
      payload.replyTo = replyTo;
    }
    
    return api.post('/messages', payload);
  },

  async editMessage(messageId, text) {
    return api.patch(`/messages/${messageId}`, { text });
  },

  async deleteMessage(messageId) {
    return api.delete(`/messages/${messageId}`);
  },

  async clearChat(conversationId) {
    return api.post(`/messages/clear/${conversationId}`);
  },

  async markAsRead(conversationId) {
    return api.post('/messages/mark-read', { conversationId });
  },

  async getUnreadCountForChat(conversationId) {
    return api.get(`/messages/unread/${conversationId}`);
  },

  // Reactions
  async addReaction(messageId, emoji) {
    return api.post(`/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(messageId, emoji) {
    return api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  },

  // Searches
  async searchUsers(query) {
    return api.get('/users/search', { params: { q: query } });
  },

  async searchMessages(query) {
    return api.get('/messages/search', { params: { q: query } });
  },

  // File upload
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default chatService;
