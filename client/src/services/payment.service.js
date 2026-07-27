import api from '../api';

export const paymentService = {
  async checkStatus() {
    const token = localStorage.getItem('token');
    const res = await api.get('/payment/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async createIntent(idempotencyKey) {
    const token = localStorage.getItem('token');
    const res = await api.post(
      '/payment/create-intent',
      { idempotencyKey },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },

  async confirmPayment(paymentIntentId) {
    const token = localStorage.getItem('token');
    const res = await api.post(
      '/payment/confirm',
      { paymentIntentId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
};
