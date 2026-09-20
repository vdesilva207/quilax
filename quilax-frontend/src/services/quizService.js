import apiClient from '@/lib/api';

function sanitizeQuizError(error) {
  const message = String(error?.message || '').trim();
  if (
    /\/var\/folders\//i.test(message) ||
    /useractivityd/i.test(message) ||
    /shared-pasteboard/i.test(message) ||
    /\.rtfd\b/i.test(message) ||
    /^file:\/\//i.test(message)
  ) {
    return 'Hay una imagen inválida. Elimínala y vuelve a añadirla desde la galería (JPG/PNG).';
  }
  return message || 'Error';
}

export const quizService = {
  // Obtener todos los quizzes públicos
  getPublicQuizzes: async () => {
    try {
      const quizzes = await apiClient.get('/quizzes');
      return { success: true, data: quizzes };
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener un quiz por id
  getQuizById: async (quizId) => {
    try {
      const quiz = await apiClient.get(`/quizzes/${quizId}`);
      return { success: true, data: quiz };
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener quizzes populares (endpoint acotado)
  getPopularQuizzes: async (limit = 10) => {
    try {
      const data = await apiClient.get(`/home/hottest?limit=${limit}`);
      const list = data?.quizzes || data?.hottest || data || [];
      return { success: true, data: Array.isArray(list) ? list.slice(0, limit) : [] };
    } catch (error) {
      console.error('Error fetching popular quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener quizzes recientes (home, no dump de /quizzes)
  getRecentQuizzes: async (limit = 10) => {
    try {
      const data = await apiClient.get('/home');
      const list =
        data?.upcomingQuizzes ||
        data?.recentQuizzes ||
        data?.quizzes ||
        [];
      return {
        success: true,
        data: Array.isArray(list) ? list.slice(0, limit) : [],
      };
    } catch (error) {
      console.error('Error fetching recent quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Crear un nuevo quiz (borrador)
  createQuiz: async (quizData) => {
    try {
      const quiz = await apiClient.post('/quiz-creation', quizData, { timeoutMs: 60000 });
      return { success: true, data: quiz };
    } catch (error) {
      console.error('Error creating quiz:', error);
      return { success: false, error: sanitizeQuizError(error) };
    }
  },

  // Actualizar un quiz en borrador
  updateQuiz: async (quizId, data) => {
    try {
      const quiz = await apiClient.put(`/quiz-creation/${quizId}`, data, { timeoutMs: 60000 });
      return { success: true, data: quiz };
    } catch (error) {
      console.error('Error updating quiz:', error);
      return { success: false, error: sanitizeQuizError(error) };
    }
  },

  // Publicar un quiz (enviar a revisión)
  publishQuiz: async (quizId, scheduledAt) => {
    try {
      const result = await apiClient.post(`/quiz-creation/${quizId}/publish`, { scheduledAt });
      return { success: true, data: result };
    } catch (error) {
      console.error('Error publishing quiz:', error);
      return { success: false, error: sanitizeQuizError(error) };
    }
  },
};

export default quizService;
