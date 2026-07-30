import api from "./api";

export const testApiService = {
  // Start a new test attempt
  // config: { categories, difficulty, count, duration_seconds, template_id }
  async startTest(config) {
    const res = await api.post("/test/start", config);
    return res.data;
  },

  // Save/Upsert an answer for a specific question in a session
  async saveAnswer(sessionId, questionId, answer) {
    const res = await api.post("/test/answer", {
      session_id: sessionId,
      question_id: questionId,
      answer,
    });
    return res.data;
  },

  // Submit test session for final grading
  async submitTest(sessionId) {
    const res = await api.post("/test/submit", { session_id: sessionId });
    return res.data;
  },

  // Get details and graded results for a completed session
  async getSessionDetail(sessionId) {
    const res = await api.get(`/test/session/${sessionId}`);
    return res.data;
  },

  // Get user's past attempt history
  async getHistory(page = 1, limit = 10) {
    const res = await api.get("/test/history", {
      params: { page, limit }
    });
    return res.data;
  },

  // Create a reattempt from a completed session
  async reattempt(sessionId) {
    const res = await api.post(`/test/reattempt/${sessionId}`);
    return res.data;
  },

  // Get global leaderboard rank list (by test type)
  /* old code
  async getLeaderboard(type) {
    const res = await api.get("/leaderboard", { params: { type } });
    return res.data;
  }
  */
  // ??$$$
  async getLeaderboard(type, page = 1, limit = 20) {
    const res = await api.get("/leaderboard", {
      params: { type, page, limit }
    });
    return res.data;
  },

  // ??$$$
  async markQuestionViewed(sessionId, questionId) {
    const res = await api.post("/test/view-question", {
      session_id: sessionId,
      question_id: questionId,
    });
    return res.data;
  },

  // Get category performance breakdown from DB
  async getCategoryPerformance() {
    const res = await api.get("/test/category-performance");
    return res.data;
  },

  // Get comprehensive dashboard stats
  async getDashboardStats() {
    const res = await api.get("/test/dashboard-stats");
    return res.data;
  },

  // Get solved questions with filters
  async getSolvedQuestions(category = 'all', subcategory = 'all', page = 1, limit = 20) {
    const params = { page, limit };
    if (category && category !== 'all') params.category = category;
    if (subcategory && subcategory !== 'all') params.subcategory = subcategory;
    const res = await api.get("/test/solved-questions", { params });
    return res.data;
  },

  // Get filter options (categories and subcategories)
  async getQuestionFilterOptions() {
    const res = await api.get("/test/filter-options");
    return res.data;
  }
};
