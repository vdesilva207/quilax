import apiClient from '@/lib/api';

export const searchService = {
  search: async (query, type = 'all') => {
    try {
      const data = await apiClient.get(`/search?q=${encodeURIComponent(query)}&type=${type}`);
      const results = data?.results || data?.data?.results || data;
      return { success: true, data: results };
    } catch (error) {
      console.error('Search error:', error);
      return { success: false, error: error.message };
    }
  },

  getCategories: async () => {
    try {
      const data = await apiClient.get('/search/categories');
      return { success: true, data: data.categories || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default searchService;
