import api from "./api";

export const testApiService = {
  // Start a new test attempt
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
  async getHistory() {
    const res = await api.get("/test/history");
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
  async getLeaderboard(type) {
    const res = await api.get("/leaderboard", { params: { type } });
    return res.data;
  },

  // ??$$$
  async markQuestionViewed(sessionId, questionId) {
    const res = await api.post("/test/view-question", {
      session_id: sessionId,
      question_id: questionId,
    });
    return res.data;
  }
};
