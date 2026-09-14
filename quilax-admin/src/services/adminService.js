import apiClient from '@/lib/api';

export const adminService = {
  // ============================
  // AUTENTICACIÓN ADMIN (multi-paso)
  // ============================

  // Paso 1: comprobar que el email pertenece a un admin/worker
  // POST /admin-auth/check-admin { email } -> { success, isAdmin }
  checkAdmin: async (email) => {
    try {
      const response = await apiClient.post('/admin-auth/check-admin', { email });
      return { success: true, isAdmin: !!response.isAdmin };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Paso 2: verificar la contraseña secreta de acceso al panel
  // POST /admin-auth/verify-secret { secretPassword } -> { success, verified }
  verifySecret: async (secretPassword) => {
    try {
      const response = await apiClient.post('/admin-auth/verify-secret', { secretPassword });
      return { success: true, verified: !!response.verified };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Paso 3: login con email + contraseña personal
  // POST /admin-auth/login { email, password }
  // -> { success, requiresTwoFactor, userId, email, qrCode? }
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/admin-auth/login', { email, password });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Paso 4: verificar código TOTP (Google Authenticator)
  // POST /admin-auth/verify-2fa { userId, token } -> { success, verified, token }
  verifyTwoFactor: async (userId, token) => {
    try {
      const response = await apiClient.post('/admin-auth/verify-2fa', { userId, token });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ============================
  // DASHBOARD
  // ============================

  // Obtener dashboard stats (ADMIN)
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return { success: true, data: response.dashboard ?? response };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener dashboard stats limitado (ADMIN_WORKER)
  getWorkerDashboardStats: async () => {
    try {
      const response = await apiClient.get('/admin/worker/dashboard');
      return { success: true, data: response.metrics ?? response };
    } catch (error) {
      console.error('Error fetching worker dashboard stats:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================
  // QUIZZES
  // ============================

  // Obtener quizzes pendientes de aprobación
  getPendingQuizzes: async () => {
    try {
      const response = await apiClient.get('/admin/quizzes?status=PENDING_REVIEW');
      const list = Array.isArray(response) ? response : response?.quizzes ?? response?.data ?? [];
      return { success: true, data: list };
    } catch (error) {
      console.error('Error fetching pending quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // Detalle completo para revisión
  getQuizById: async (quizId) => {
    try {
      const response = await apiClient.get(`/admin/quizzes/${quizId}`);
      return { success: true, data: response?.quiz ?? response };
    } catch (error) {
      console.error('Error fetching quiz detail:', error);
      return { success: false, error: error.message };
    }
  },

  // Aprobar quiz (scheduledAt opcional; message opcional al creador)
  approveQuiz: async (quizId, scheduledAt, message) => {
    try {
      const body = {};
      if (scheduledAt) body.scheduledAt = scheduledAt;
      if (message) body.message = message;
      const response = await apiClient.post(`/admin/quizzes/${quizId}/approve`, body);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error approving quiz:', error);
      return { success: false, error: error.message };
    }
  },

  // Rechazar quiz (message opcional al creador)
  rejectQuiz: async (quizId, reason) => {
    try {
      const response = await apiClient.post(`/admin/quizzes/${quizId}/reject`, {
        message: reason || '',
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      return { success: false, error: error.message };
    }
  },

  // Mensaje al creador (p. ej. tras denegación por IA)
  notifyQuizCreator: async (quizId, message) => {
    try {
      const response = await apiClient.post(
        `/admin/quizzes/${quizId}/notify-creator`,
        { message }
      );
      return { success: true, data: response };
    } catch (error) {
      console.error('Error notifying quiz creator:', error);
      return { success: false, error: error.message };
    }
  },

  // Quizzes para ADMIN_WORKER (lectura)
  getWorkerQuizzes: async (status) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await apiClient.get(`/admin/worker/quizzes${query}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching worker quizzes:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================
  // USUARIOS
  // ============================

  // Obtener usuarios (con búsqueda opcional)
  getUsers: async (page = 1, limit = 50, search = '') => {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}${searchParam}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message };
    }
  },

  /** Historial de quizzes / premios (siempre visible para admin, aunque sea privado) */
  getUserHistory: async (userId) => {
    try {
      const response = await apiClient.get(`/admin/users/${userId}/history`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching user history:', error);
      return { success: false, error: error.message };
    }
  },

  getUserAnalytics: async (userId) => {
    try {
      const response = await apiClient.get(`/admin/users/${userId}/analytics`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return { success: false, error: error.message };
    }
  },

  // Banear usuario
  // opts: string reason (legacy) | { reason?, message?, category?, durationDays?, permanent? }
  banUser: async (userId, opts) => {
    try {
      const body =
        typeof opts === 'string'
          ? {
              reason: opts,
              message: opts,
              category: 'CONTENT',
              permanent: true,
            }
          : {
              reason: opts?.reason,
              message:
                opts?.message ||
                opts?.reason ||
                'Tu cuenta ha sido suspendida por incumplimiento de las normas de la comunidad.',
              category: opts?.category || 'CONTENT',
              durationDays: opts?.durationDays,
              permanent: opts?.permanent !== false && opts?.durationDays == null,
              removePostId: opts?.removePostId,
            };
      const response = await apiClient.post(`/admin/users/${userId}/ban`, body);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error banning user:', error);
      return { success: false, error: error.message };
    }
  },

  unbanUser: async (userId) => {
    try {
      const response = await apiClient.post(`/admin/users/${userId}/unban`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error unbanning user:', error);
      return { success: false, error: error.message };
    }
  },

  getPendingWithdrawals: async () => {
    try {
      const response = await apiClient.get('/admin/refunds?status=PENDING_REVIEW');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  processWithdrawal: async (withdrawId, action, reason) => {
    try {
      const response = await apiClient.post(`/admin/refunds/${withdrawId}/process`, {
        action,
        reason,
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getSiteContent: async (key) => {
    try {
      const response = await apiClient.get(`/admin/site-content/${key}`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  saveSiteContent: async (key, body) => {
    try {
      const response = await apiClient.put(`/admin/site-content/${key}`, { body });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getHelpArticles: async () => {
    try {
      const response = await apiClient.get('/help/articles?limit=100');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  createHelpArticle: async (payload) => {
    try {
      const response = await apiClient.post('/help/articles', payload);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateHelpArticle: async (id, payload) => {
    try {
      const response = await apiClient.put(`/help/articles/${id}`, payload);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteHelpArticle: async (id) => {
    try {
      const response = await apiClient.delete(`/help/articles/${id}`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Usuarios para ADMIN_WORKER (lectura, solo rol USER)
  getWorkerUsers: async (search = '') => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await apiClient.get(`/admin/worker/users${query}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching worker users:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================
  // SOPORTE
  // ============================

  // Obtener tickets de soporte
  // GET /admin/support (no /admin/support-tickets)
  getSupportTickets: async (status) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await apiClient.get(`/admin/support${query}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return { success: false, error: error.message };
    }
  },

  getSupportTicket: async (ticketId) => {
    try {
      const response = await apiClient.get(`/admin/support/${ticketId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      return { success: false, error: error.message };
    }
  },

  respondSupportTicket: async (ticketId, message) => {
    try {
      const response = await apiClient.post(`/admin/support/${ticketId}/respond`, { message });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error responding to support ticket:', error);
      return { success: false, error: error.message };
    }
  },

  closeSupportTicket: async (ticketId, resolution) => {
    try {
      const response = await apiClient.post(`/admin/support/${ticketId}/close`, { resolution });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error closing support ticket:', error);
      return { success: false, error: error.message };
    }
  },

  // Tickets de soporte para ADMIN_WORKER
  getWorkerSupportTickets: async (status) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await apiClient.get(`/admin/worker/support${query}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching worker support tickets:', error);
      return { success: false, error: error.message };
    }
  },
};

export default adminService;
