import apiClient from '@/lib/api';
import i18n from '@/i18n';

export const quizRunService = {
  enrollQuiz: async (quizId) => {
    try {
      const data = await apiClient.post(`/quiz-play/enroll/${quizId}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  joinQuiz: async (runId) => {
    try {
      const data = await apiClient.post(`/quiz-play/${runId}/join`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getRunState: async (runId, options = {}) => {
    try {
      const data = await apiClient.get(`/quiz-run/${runId}/state`, {
        timeoutMs: 10000,
        ...options,
      });
      return { success: true, data: data.run || data };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
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

  getRanking: async (runId, { limit = 5 } = {}) => {
    try {
      const data = await apiClient.get(
        `/quiz-play/${runId}/ranking?limit=${Math.min(100, Math.max(1, limit))}`
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getResults: async (runId, { limit = 10 } = {}) => {
    try {
      const data = await apiClient.get(
        `/quiz-play/${runId}/results?limit=${Math.min(100, Math.max(1, limit))}`
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, status: error.status };
    }
  },

  resolveActiveRunId: async (quizId) => {
    const info = await quizRunService.getQuizInfo(quizId);
    if (!info.success) return info;
    let activeRun = info.data?.activeRun;
    if (!activeRun?.id) {
      // Playtest / dev: crear partida al pulsar jugar
      try {
        const ensured = await apiClient.post(`/quiz-play/ensure-run/${quizId}`);
        activeRun = ensured?.run || null;
      } catch (error) {
        return {
          success: false,
          error: error.message || i18n.t('quizDetail.noActiveRun'),
        };
      }
    }
    if (!activeRun?.id) {
      return { success: false, error: i18n.t('quizDetail.noActiveRun') };
    }
    return { success: true, runId: activeRun.id, data: activeRun };
  },
};

export default quizRunService;
