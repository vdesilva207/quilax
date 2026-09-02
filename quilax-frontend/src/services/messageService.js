import apiClient from '@/lib/api';
import i18n from '@/i18n';

export const messageService = {
  getInbox: async () => {
    try {
      const response = await apiClient.get('/messages');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getNotifications: async () => {
    try {
      const response = await apiClient.get('/notifications');
      const list = Array.isArray(response)
        ? response
        : response?.notifications || response?.data || [];
      return { success: true, data: list };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getConversation: async (userId) => {
    try {
      const response = await apiClient.get(`/messages/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  sendMessage: async (toUserId, content) => {
    try {
      const response = await apiClient.post('/messages', { toUserId, content });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markAsRead: async (userId) => {
    try {
      const response = await apiClient.post(`/messages/${userId}/read`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markNotificationRead: async (id) => {
    try {
      const response = await apiClient.post(`/notifications/${id}/read`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  blockUser: async (userId) => {
    try {
      const response = await apiClient.post(`/messages/${userId}/block`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getAdminPanelStatus: async () => {
    try {
      const response = await apiClient.get('/messages/admin-panel/status');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getAdminPanelThread: async () => {
    try {
      const response = await apiClient.get('/messages/admin-panel/thread');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  sendAdminPanelMessage: async (message, subject) => {
    try {
      const response = await apiClient.post('/messages/admin-panel', {
        message,
        subject: subject || i18n.t('messages.adminDefaultSubject'),
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default messageService;
