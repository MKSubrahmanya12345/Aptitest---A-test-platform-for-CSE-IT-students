import api from '../api';

export const paymentService = {
  async checkStatus(testType) {
    const token = localStorage.getItem('token');
    const params = testType ? `?testType=${testType}` : '';
    const res = await api.get(`/payment/status${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async createIntent(idempotencyKey, testType, templateId) {
    const token = localStorage.getItem('token');
    const body = { idempotencyKey };
    if (testType) body.testType = testType;
    if (templateId) body.templateId = templateId;
    
    const res = await api.post(
      '/payment/create-intent',
      body,
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
