import apiClient from '@/lib/api';

export const userService = {
  // Obtener perfil del usuario actual
  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return { success: true, data: response.user };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar perfil del usuario
  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put('/profile/me', userData);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener seguidores
  getFollowers: async (userId) => {
    try {
      const response = await apiClient.get(`/social/followers/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching followers:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener seguidos
  getFollowing: async (userId) => {
    try {
      const response = await apiClient.get(`/social/following/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching following:', error);
      return { success: false, error: error.message };
    }
  },

  // Seguir usuario
  followUser: async (userId) => {
    try {
      const response = await apiClient.post(`/social/follow/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error following user:', error);
      return { success: false, error: error.message };
    }
  },

  // Dejar de seguir usuario
  unfollowUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/social/follow/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return { success: false, error: error.message };
    }
  },

  getFollowStatus: async (userId) => {
    try {
      const response = await apiClient.get(`/social/follow-status/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching follow status:', error);
      return { success: false, error: error.message };
    }
  },

  // Bloquear usuario
  blockUser: async (userId) => {
    try {
      const response = await apiClient.post(`/social/block/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }
  },

  // Desbloquear usuario
  unblockUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/social/block/${userId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener usuarios bloqueados
  getBlockedUsers: async () => {
    try {
      const response = await apiClient.get('/social/blocked');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener vista pública de un perfil (limitada por privacidad)
  getPublicProfileShare: async (userId) => {
    try {
      const response = await apiClient.get(`/profile/${userId}/share`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default userService;
