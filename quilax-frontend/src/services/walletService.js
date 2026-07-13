import apiClient from '@/lib/api';

export const walletService = {
  getAvailablePackages: async () => {
    try {
      const data = await apiClient.get('/payments/packages');
      return { success: true, data: data.packages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  createPaymentIntent: async (credits) => {
    try {
      const data = await apiClient.post('/payments/create-intent', { credits });
      return { success: true, data: data.paymentIntent };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getPaymentHistory: async () => {
    try {
      const data = await apiClient.get('/payments/history');
      return { success: true, data: data.payments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  requestWithdrawal: async (amount) => {
    try {
      const data = await apiClient.post('/withdraws/request', { amount });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default walletService;
