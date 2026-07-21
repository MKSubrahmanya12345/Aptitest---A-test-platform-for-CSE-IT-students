import api from './api';

export const reviewService = {
  async getPending(filters = {}) {
    const response = await api.get('/review-pending', { params: filters });
    return response.data;
  },

  async updatePending(id, data) {
    const response = await api.put(`/review-pending/${id}`, data);
    return response.data;
  },

  async approve(id, data = {}) {
    const response = await api.post(`/review-pending/${id}/approve`, data);
    return response.data;
  },

  async reject(id) {
    const response = await api.post(`/review-pending/${id}/reject`);
    return response.data;
  },

  async getQuestions(filters = {}) {
    const response = await api.get('/questions', { params: filters });
    return response.data;
  },

  /* old code
  async getStats() {
    const response = await api.get('/stats');
    return response.data;
  }
  */

  // ??$$$
  async getStats() {
    const response = await api.get('/stats');
    return response.data;
  },

  // ??$$$
  async getStudents() {
    const response = await api.get('/view-students');
    return response.data;
  },

  // ??$$$
  async getStudentById(id) {
    const response = await api.get(`/view-students/${id}`);
    return response.data;
  },

  // ??$$$
  async updateStudentStatus(id, status) {
    const response = await api.put(`/view-students/${id}/status`, { status });
    return response.data;
  },

  // ??$$$
  async getStudentHistory(id) {
    const response = await api.get(`/view-students/${id}/history`);
    return response.data;
  }
};
