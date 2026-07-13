import apiClient from '@/lib/api';

export const settingsService = {
  // Actualizar perfil de usuario
  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put('/auth/profile', userData);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Cambiar contraseña
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await apiClient.post('/auth/change-password', { 
        currentPassword, 
        newPassword 
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar configuración de notificaciones
  updateNotificationSettings: async (settings) => {
    try {
      const response = await apiClient.put('/auth/notification-settings', settings);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar configuración de privacidad
  updatePrivacySettings: async (settings) => {
    try {
      const response = await apiClient.put('/auth/privacy-settings', settings);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return { success: false, error: error.message };
    }
  },

  // Eliminar cuenta
  deleteAccount: async () => {
    try {
      const response = await apiClient.delete('/auth/account');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { success: false, error: error.message };
    }
  },

  // Cerrar sesión
  logout: async () => {
    try {
      const response = await apiClient.post('/auth/logout');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error logging out:', error);
      return { success: false, error: error.message };
    }
  },
};

export default settingsService;
