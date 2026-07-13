import apiClient from '@/lib/api';

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

  // Obtener quizzes populares (simulado - podría venir del backend)
  getPopularQuizzes: async (limit = 10) => {
    try {
      const quizzes = await apiClient.get('/quizzes');
      // Simular popularidad basado en número de participantes
      const popularQuizzes = quizzes
        .sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0))
        .slice(0, limit);
      return { success: true, data: popularQuizzes };
    } catch (error) {
      console.error('Error fetching popular quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener quizzes recientes
  getRecentQuizzes: async (limit = 10) => {
    try {
      const quizzes = await apiClient.get('/quizzes');
      const recentQuizzes = quizzes.slice(0, limit);
      return { success: true, data: recentQuizzes };
    } catch (error) {
      console.error('Error fetching recent quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Crear un nuevo quiz
  createQuiz: async (quizData) => {
    try {
      const quiz = await apiClient.post('/quiz-creation', quizData);
      return { success: true, data: quiz };
    } catch (error) {
      console.error('Error creating quiz:', error);
      return { success: false, error: error.message };
    }
  },

  // Publicar un quiz
  publishQuiz: async (quizId) => {
    try {
      const result = await apiClient.post(`/quiz-creation/${quizId}/publish`);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error publishing quiz:', error);
      return { success: false, error: error.message };
    }
  },
};

export default quizService;
