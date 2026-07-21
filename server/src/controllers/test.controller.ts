import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { testService } from "../services/test.service";
import pool from "../config/db"; 

export const testController = {
  // POST /api/test/start
  async start(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }


      // Check user status
      const [userRows]: any = await pool.query("SELECT status FROM users WHERE id = ?", [userId]);
      if (userRows[0]?.status === 'banned') {
        return res.status(403).json({ message: "Account is banned. You cannot attempt new tests." });
      }

      const { categories, difficulty, count, duration_seconds } = req.body;

      const result = await testService.startSession(
        userId,
        categories,
        difficulty,
        count ? parseInt(count) : undefined,
        duration_seconds ? parseInt(duration_seconds) : undefined
      );

      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Error in testController.start:", error);
      return res.status(500).json({ message: error.message || "Failed to start test session" });
    }
  },

  // POST /api/test/answer
  async answer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { session_id, question_id, answer } = req.body;

      if (!session_id || !question_id) {
        return res.status(400).json({ message: "session_id and question_id are required" });
      }

      const result = await testService.submitAnswer(
        userId,
        parseInt(session_id),
        parseInt(question_id),
        answer
      );

      return res.json(result);
    } catch (error: any) {
      console.error("Error in testController.answer:", error);
      // Reject with 403 as requested if session ownership, completion or expiration fails
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("completed or abandoned") ||
        error.message.includes("expired")
      ) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to submit answer" });
    }
  },


  // POST /api/test/view-question
  async viewQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { session_id, question_id } = req.body;

      if (!session_id || !question_id) {
        return res.status(400).json({ message: "session_id and question_id are required" });
      }

      const result = await testService.markQuestionAsViewed(
        userId,
        parseInt(session_id),
        parseInt(question_id)
      );

      return res.json(result);
    } catch (error: any) {
      console.error("Error in testController.viewQuestion:", error);
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to mark question as viewed" });
    }
  },

  // POST /api/test/submit
  async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { session_id } = req.body;
      if (!session_id) {
        return res.status(400).json({ message: "session_id is required" });
      }

      const result = await testService.submitSession(userId, parseInt(session_id));
      return res.json(result);
    } catch (error: any) {
      console.error("Error in testController.submit:", error);
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to submit test" });
    }
  },

  // GET /api/test/session/:id
  async getSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      /* old code
      const sessionId = parseInt(req.params.id);
      */
      // ??$$$
      const sessionId = parseInt(req.params.id as string);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      // ??$$$
      const result = await testService.getSessionDetail(userId, sessionId, req.user?.role === 'admin');
      return res.json(result);
    } catch (error: any) {
      console.error("Error in testController.getSession:", error);
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message.includes("still in progress")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to fetch session detail" });
    }
  },

  // GET /api/test/history
  async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const result = await testService.getHistory(userId);
      return res.json(result);
    } catch (error: any) {
      console.error("Error in testController.getHistory:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch history" });
    }
  },

  // POST /api/test/reattempt/:id
  async reattempt(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // ??$$$
      // Check user status
      const [userRows]: any = await pool.query("SELECT status FROM users WHERE id = ?", [userId]);
      if (userRows && userRows[0]?.status === 'banned') {
        return res.status(403).json({ message: "Account is banned. You cannot attempt new tests." });
      }

      /* old code
      const sessionId = parseInt(req.params.id);
      */
      // ??$$$
      const sessionId = parseInt(req.params.id as string);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const result = await testService.reattemptSession(userId, sessionId);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Error in testController.reattempt:", error);
      if (error.message.includes("access denied") || error.message.includes("Only completed")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Failed to start reattempt session" });
    }
  },
  // ??$$$
  // GET /api/leaderboard
  async getLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      const { type } = req.query;
      const result = await testService.getLeaderboard(type as string);

      // Ensure {user_id, name, rank, total_score, correct_count, total_questions, time_per_correct} are returned
      const sanitized = result.map((r: any) => ({
        user_id: r.user_id,
        name: r.name,
        rank: r.rnk,
        total_score: parseFloat(r.total_score || 0),
        correct_count: r.correct_count || 0,
        total_questions: r.total_questions || 0,
        time_per_correct: Math.round(parseFloat(r.time_per_correct || 0))
      }));
      return res.json(sanitized);
    } catch (error: any) {
      console.error("Error in testController.getLeaderboard:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch leaderboard" });
    }
  }
};
