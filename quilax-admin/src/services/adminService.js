import apiClient from '@/lib/api';

export const adminService = {
  // Login de admin (usa el mismo endpoint de auth pero con credenciales de admin)
  login: async (email, password, twoFactorCode) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password, twoFactorCode });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error admin login:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return { success: true, data: response.dashboard ?? response };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener quizzes pendientes de aprobación
  getPendingQuizzes: async () => {
    try {
      const response = await apiClient.get('/admin/quizzes/pending');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching pending quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Aprobar quiz
  approveQuiz: async (quizId) => {
    try {
      const response = await apiClient.post(`/admin/quizzes/${quizId}/approve`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error approving quiz:', error);
      return { success: false, error: error.message };
    }
  },

  // Rechazar quiz
  rejectQuiz: async (quizId, reason) => {
    try {
      const response = await apiClient.post(`/admin/quizzes/${quizId}/reject`, { reason });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener usuarios
  getUsers: async (page = 1, limit = 50) => {
    try {
      const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message };
    }
  },

  // Banear usuario
  banUser: async (userId, reason) => {
    try {
      const response = await apiClient.post(`/admin/users/${userId}/ban`, { reason });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error banning user:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener tickets de soporte
  getSupportTickets: async (status = 'OPEN') => {
    try {
      const response = await apiClient.get(`/admin/support-tickets?status=${status}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return { success: false, error: error.message };
    }
  },
};

export default adminService;
