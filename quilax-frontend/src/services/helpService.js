import apiClient from '@/lib/api';

export const helpService = {
  // Obtener artículos de ayuda públicos
  getArticles: async (category) => {
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : '';
      const response = await apiClient.get(`/help/articles${query}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching help articles:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener detalle de un artículo
  getArticle: async (id) => {
    try {
      const response = await apiClient.get(`/help/articles/${id}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching help article:', error);
      return { success: false, error: error.message };
    }
  },
};

export default helpService;
