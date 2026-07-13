import apiClient from '@/lib/api';

export const matchesService = {
  getRecentMatches: async () => {
    try {
      const data = await apiClient.get('/home');
      return {
        success: true,
        data: data?.data?.recentActivity || data?.recentActivity || [],
      };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },

  getSeasonRanking: async () => {
    try {
      const data = await apiClient.get('/home');
      return {
        success: true,
        data: data?.data?.seasonRanking || data?.seasonRanking || [],
      };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
};

export default matchesService;
