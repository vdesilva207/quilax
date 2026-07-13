import apiClient from '@/lib/api';

export const messageService = {
  // Obtener bandeja de entrada
  getInbox: async () => {
    try {
      const response = await apiClient.get('/messages');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching inbox:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener conversación con un usuario específico
  getConversation: async (userId) => {
    try {
      const response = await apiClient.get(`/messages/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return { success: false, error: error.message };
    }
  },

  // Enviar mensaje
  sendMessage: async (recipientId, content) => {
    try {
      const response = await apiClient.post('/messages', { recipientId, content });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  // Marcar conversación como leída
  markAsRead: async (userId) => {
    try {
      const response = await apiClient.post(`/messages/${userId}/read`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { success: false, error: error.message };
    }
  },

  // Bloquear usuario
  blockUser: async (userId) => {
    try {
      const response = await apiClient.post(`/messages/${userId}/block`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }
  },
};

export default messageService;
