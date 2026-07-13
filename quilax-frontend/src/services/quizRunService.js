import apiClient from '@/lib/api';

export const quizRunService = {
  joinQuiz: async (runId) => {
    try {
      const data = await apiClient.post(`/quiz-play/${runId}/join`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getRunState: async (runId) => {
    try {
      const data = await apiClient.get(`/quiz-run/${runId}/state`);
      return { success: true, data: data.run || data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getQuizInfo: async (quizId) => {
    try {
      const data = await apiClient.get(`/quiz-info/${quizId}`);
      return { success: true, data: data.quiz || data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  canJoin: async (quizId) => {
    try {
      const data = await apiClient.get(`/quiz-info/${quizId}/can-join`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getPlayState: async (runId) => {
    try {
      const data = await apiClient.get(`/quiz-play/${runId}/state`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  submitAnswer: async (runId, payload) => {
    try {
      const data = await apiClient.post(`/quiz-run/${runId}/answer`, payload);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  resolveActiveRunId: async (quizId) => {
    const info = await quizRunService.getQuizInfo(quizId);
    if (!info.success) return info;
    const activeRun = info.data?.activeRun;
    if (!activeRun?.id) {
      return { success: false, error: 'No hay una partida activa para este quiz' };
    }
    return { success: true, runId: activeRun.id, data: activeRun };
  },
};

export default quizRunService;
