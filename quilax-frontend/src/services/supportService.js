import apiClient from '@/lib/api';

export const supportService = {
  // Obtener mis tickets de soporte
  getMyTickets: async () => {
    try {
      const response = await apiClient.get('/support/tickets/my');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener detalle de un ticket
  getTicket: async (ticketId) => {
    try {
      const response = await apiClient.get(`/support/tickets/${ticketId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return { success: false, error: error.message };
    }
  },

  // Crear un ticket de soporte
  createTicket: async ({ category, subject, description, priority, force }) => {
    try {
      const response = await apiClient.post('/support/tickets', {
        category,
        subject,
        description,
        priority,
        force: !!force,
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return { success: false, error: error.message };
    }
  },

  // Enviar mensaje a un ticket existente
  sendTicketMessage: async (ticketId, content) => {
    try {
      const response = await apiClient.post(`/support/tickets/${ticketId}/messages`, { content });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error sending ticket message:', error);
      return { success: false, error: error.message };
    }
  },
};

export default supportService;
