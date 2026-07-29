import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/db';
import { userModel } from '../models/user.model';
import { reviewModel } from '../models/review.model';
import { stringifyJson } from '../utils/jsonHelpers';

export const reviewController = {
  // GET /api/review-pending
  async getPending(req: AuthenticatedRequest, res: Response) {
    try {
      const { category, type, page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 10, 50); // Max 50 per page
      const offset = (pageNum - 1) * limitNum;

      const { questions, total } = await reviewModel.getPendingPaginated(
        { category: category as string, type: type as string },
        { page: pageNum, limit: limitNum, offset }
      );

      return res.json({
        questions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      });
    } catch (error: any) {
      console.error("Error in getPending:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch pending questions" });
    }
  },

  // PUT /api/review-pending/:id
  async updatePending(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        category,
        subcategory,
        difficulty,
        detected_question_type,
        question_text,
        passage,
        data_block,
        options,
        correct_answer,
        grading_config,
        solution
      } = req.body;

      await reviewModel.updatePending(Number(id), {
        category,
        subcategory,
        difficulty,
        detected_question_type,
        question_text,
        passage,
        data_block: stringifyJson(data_block),
        options: stringifyJson(options),
        correct_answer: stringifyJson(correct_answer),
        grading_config: stringifyJson(grading_config),
        solution
      });

      return res.json({ message: "Question updated successfully" });
    } catch (error: any) {
      console.error("Error in updatePending:", error);
      return res.status(500).json({ message: error.message || "Failed to update question" });
    }
  },

  // POST /api/review-pending/:id/approve
  async approvePending(req: AuthenticatedRequest, res: Response) {
    let connection: any;
    try {
      const { id } = req.params;

      // Get a connection from the pool for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check if they also sent updated question details (save & approve flow)
        if (req.body && Object.keys(req.body).length > 0) {
          const {
            category,
            subcategory,
            difficulty,
            detected_question_type,
            question_text,
            passage,
            data_block,
            options,
            correct_answer,
            grading_config,
            solution,
            source_file,
            source_question_no
          } = req.body;

          const qType = detected_question_type;
          const diffVal = (difficulty || 'basic').toLowerCase().includes('advance') ? 'advanced' : (difficulty || 'basic').toLowerCase();

          // 1. Update the pending question first with status check (prevents duplicate approvals)
          const affectedRows = await reviewModel.approvePending(Number(id), {
            category,
            subcategory,
            difficulty,
            detected_question_type,
            question_text,
            passage,
            data_block: stringifyJson(data_block),
            options: stringifyJson(options),
            correct_answer: stringifyJson(correct_answer),
            grading_config: stringifyJson(grading_config),
            solution
          }, connection);

          // Check if update actually happened (affectedRows === 0 means already approved/rejected or not found)
          if (affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({ message: "Question is not in pending status or does not exist" });
          }

          // 2. Insert into live questions
          await reviewModel.insertQuestion({
            category,
            subcategory,
            difficulty: diffVal,
            question_type: qType,
            question_text,
            passage,
            data_block: stringifyJson(data_block),
            options: stringifyJson(options),
            correct_answer: stringifyJson(correct_answer),
            grading_config: stringifyJson(grading_config),
            solution,
            source_file,
            source_question_no
          }, connection);

          await connection.commit();
          connection.release();
          return res.json({ message: "Question saved and approved successfully" });
        } else {
          // Simple approve flow: read from review table and insert into live table
          const q = await reviewModel.getPendingByIdWithStatus(Number(id), 'pending', connection);

          if (!q) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Pending question not found or already processed" });
          }

          const qType = q.final_question_type || q.detected_question_type;
          const diffVal = (q.difficulty || 'basic').toLowerCase().includes('advance') ? 'advanced' : (q.difficulty || 'basic').toLowerCase();

          // Insert into questions table
          await reviewModel.insertQuestion({
            category: q.category,
            subcategory: q.subcategory,
            difficulty: diffVal,
            question_type: qType,
            question_text: q.question_text,
            passage: q.passage,
            data_block: stringifyJson(q.data_block),
            options: stringifyJson(q.options),
            correct_answer: stringifyJson(q.correct_answer),
            grading_config: stringifyJson(q.grading_config),
            solution: q.solution,
            source_file: q.source_file,
            source_question_no: q.source_question_no
          }, connection);

          // Update status with check to prevent race conditions
          const affectedRows = await reviewModel.setPendingStatus(Number(id), 'approved', connection);

          if (affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({ message: "Question already processed" });
          }

          await connection.commit();
          connection.release();
          return res.json({ message: "Question approved successfully" });
        }
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error: any) {
      console.error("Error in approvePending:", error);
      return res.status(500).json({ message: error.message || "Failed to approve question" });
    }
  },

  // POST /api/review-pending/:id/reject
  async rejectPending(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const affectedRows = await reviewModel.setPendingStatus(Number(id), 'rejected');

      if (affectedRows === 0) {
        return res.status(409).json({ message: "Question is not in pending status or does not exist" });
      }

      return res.json({ message: "Question rejected successfully" });
    } catch (error: any) {
      console.error("Error in rejectPending:", error);
      return res.status(500).json({ message: error.message || "Failed to reject question" });
    }
  },

  // GET /api/questions
  async getQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const { category, type, page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 10, 50);
      const offset = (pageNum - 1) * limitNum;

      const { questions, total } = await reviewModel.getQuestionsPaginated(
        { category: category as string, type: type as string },
        { page: pageNum, limit: limitNum, offset }
      );

      return res.json({
        questions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      });
    } catch (error: any) {
      console.error("Error in getQuestions:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch approved questions" });
    }
  },



  // POST /api/questions/create - Admin creates new question directly (goes to pending for review)
  async createQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        category,
        subcategory,
        difficulty,
        type,
        question_text,
        passage,
        data_block,
        options,
        correct_answer,
        grading_config,
        solution
      } = req.body;

      // Validation
      if (!question_text || !category || !type) {
        return res.status(400).json({ message: "question_text, category, and type are required" });
      }

      const insertId = await reviewModel.createPendingQuestion({
        category,
        subcategory,
        difficulty: difficulty || 'Basic',
        detected_question_type: type,
        final_question_type: type,
        question_text,
        passage: passage || null,
        data_block: stringifyJson(data_block),
        options: stringifyJson(options),
        correct_answer: stringifyJson(correct_answer),
        grading_config: stringifyJson(grading_config),
        solution: solution || null
      });

      return res.status(201).json({
        id: insertId,
        ...req.body,
        status: 'pending',
        created_by_admin: true,
        message: 'Question created successfully and sent to review'
      });
    } catch (error: any) {
      console.error("Error in createQuestion:", error);
      return res.status(500).json({ message: error.message || "Failed to create question" });
    }
  },

  // PUT /api/questions/:id - Update approved question
  async updateApproved(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        category,
        subcategory,
        difficulty,
        question_type,
        question_text,
        passage,
        data_block,
        options,
        correct_answer,
        grading_config,
        solution
      } = req.body;

      // Validation
      if (!question_text || !category || !question_type) {
        return res.status(400).json({ message: "question_text, category, and question_type are required" });
      }

      const affectedRows = await reviewModel.updateQuestion(Number(id), {
        category,
        subcategory,
        difficulty,
        question_type,
        question_text,
        passage,
        data_block: stringifyJson(data_block),
        options: stringifyJson(options),
        correct_answer: stringifyJson(correct_answer),
        grading_config: stringifyJson(grading_config),
        solution
      });

      if (affectedRows === 0) {
        return res.status(404).json({ message: "Question not found" });
      }

      return res.json({ message: "Question updated successfully" });
    } catch (error: any) {
      console.error("Error in updateApproved:", error);
      return res.status(500).json({ message: error.message || "Failed to update question" });
    }
  },

  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await reviewModel.getStats();
      return res.json(stats);
    } catch (error: any) {
      console.error("Error in getStats:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch statistics" });
    }
  },

  // GET /api/questions/categories - Get unique categories and subcategories from DB
  async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const categories = await reviewModel.getCategories();
      return res.json({ categories });
    } catch (error: any) {
      console.error("Error in getCategories:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch categories" });
    }
  }
};



export const getStudentById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query("SELECT id, name, email, role, status, created_at FROM users WHERE id = ? AND role = 'student'", [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.json(rows[0]);
  } catch (error: any) {
    console.error("Error in getStudentById:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch student details" });
  }
};

export const getStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    const result = await userModel.getStudentsPaginated(
      pageNum,
      limitNum,
      search as string
    );

    return res.json({
      students: result.students,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error: any) {
    console.error("Error in getStudents:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch students" });
  }
};

// ??$$$
export const updateStudentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'banned') {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const [result]: any = await pool.query(
      "UPDATE users SET status = ? WHERE id = ? AND role = 'student'",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json({ message: `Student status updated to ${status} successfully` });
  } catch (error: any) {
    console.error("Error in updateStudentStatus:", error);
    return res.status(500).json({ message: error.message || "Failed to update student status" });
  }
};

// ??$$$
export const getStudentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      `SELECT id, category, subcategory, difficulty, total_questions, duration_seconds, started_at, submitted_at, status, is_reattempt, original_session_id, score, total_marks, correct_count, wrong_count, skipped_count
       FROM test_sessions
       WHERE user_id = ?
       ORDER BY started_at DESC`,
      [id]
    );
    return res.json(rows);
  } catch (error: any) {
    console.error("Error in getStudentHistory:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch student history" });
  }
};