import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/db';
import { userModel } from '../models/user.model';

export const reviewController = {
  // GET /api/review-pending
  async getPending(req: AuthenticatedRequest, res: Response) {
    try {
      const { category, type, page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 10, 50); // Max 50 per page
      const offset = (pageNum - 1) * limitNum;
      
      let whereClause = "WHERE status = 'pending'";
      const params: any[] = [];

      if (category) {
        whereClause += " AND category = ?";
        params.push(category);
      }
      if (type) {
        whereClause += " AND (detected_question_type = ? OR final_question_type = ?)";
        params.push(type, type);
      }

      // Get total count
      const [countResult]: any = await pool.query(
        `SELECT COUNT(*) as total FROM review_pending_questions ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // Get paginated results
      const query = `SELECT * FROM review_pending_questions ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`;
      const [rows] = await pool.query(query, [...params, limitNum, offset]);
      
      return res.json({
        questions: rows,
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

      const query = `
        UPDATE review_pending_questions SET
          category = ?,
          subcategory = ?,
          difficulty = ?,
          final_question_type = ?,
          question_text = ?,
          passage = ?,
          data_block = ?,
          options = ?,
          correct_answer = ?,
          grading_config = ?,
          solution = ?
        WHERE id = ?
      `;

      const values = [
        category,
        subcategory,
        difficulty,
        detected_question_type, // set final_question_type to this value
        question_text,
        passage,
        typeof data_block === 'object' && data_block !== null ? JSON.stringify(data_block) : data_block,
        typeof options === 'object' && options !== null ? JSON.stringify(options) : options,
        typeof correct_answer === 'object' && correct_answer !== null ? JSON.stringify(correct_answer) : correct_answer,
        typeof grading_config === 'object' && grading_config !== null ? JSON.stringify(grading_config) : grading_config,
        solution,
        id
      ];

      await pool.query(query, values);
      return res.json({ message: "Question updated successfully" });
    } catch (error: any) {
      console.error("Error in updatePending:", error);
      return res.status(500).json({ message: error.message || "Failed to update question" });
    }
  },

  // POST /api/review-pending/:id/approve
  async approvePending(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

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

        // 1. Insert into live questions
        const insertQuery = `
          INSERT INTO questions (
            category, subcategory, difficulty, question_type,
            question_text, passage, data_block, options,
            correct_answer, grading_config, solution,
            source_file, source_question_no, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `;

        const qType = detected_question_type;
        const diffVal = (difficulty || 'basic').toLowerCase().includes('advance') ? 'advanced' : (difficulty || 'basic').toLowerCase();

        const insertValues = [
          category,
          subcategory,
          diffVal,
          qType,
          question_text,
          passage,
          typeof data_block === 'object' && data_block !== null ? JSON.stringify(data_block) : data_block,
          typeof options === 'object' && options !== null ? JSON.stringify(options) : options,
          typeof correct_answer === 'object' && correct_answer !== null ? JSON.stringify(correct_answer) : correct_answer,
          typeof grading_config === 'object' && grading_config !== null ? JSON.stringify(grading_config) : grading_config,
          solution,
          source_file,
          source_question_no
        ];

        await pool.query(insertQuery, insertValues);

        // 2. Update status in review_pending_questions
        const updateQuery = `
          UPDATE review_pending_questions SET
            category = ?,
            subcategory = ?,
            difficulty = ?,
            final_question_type = ?,
            question_text = ?,
            passage = ?,
            data_block = ?,
            options = ?,
            correct_answer = ?,
            grading_config = ?,
            solution = ?,
            status = 'approved'
          WHERE id = ?
        `;

        const updateValues = [
          category,
          subcategory,
          difficulty,
          detected_question_type,
          question_text,
          passage,
          typeof data_block === 'object' && data_block !== null ? JSON.stringify(data_block) : data_block,
          typeof options === 'object' && options !== null ? JSON.stringify(options) : options,
          typeof correct_answer === 'object' && correct_answer !== null ? JSON.stringify(correct_answer) : correct_answer,
          typeof grading_config === 'object' && grading_config !== null ? JSON.stringify(grading_config) : grading_config,
          solution,
          id
        ];

        await pool.query(updateQuery, updateValues);
        return res.json({ message: "Question saved and approved successfully" });
      } else {
        // Simple approve flow: read from review table and insert into live table
        const [pendingRows]: any = await pool.query("SELECT * FROM review_pending_questions WHERE id = ?", [id]);
        if (!pendingRows || pendingRows.length === 0) {
          return res.status(404).json({ message: "Pending question not found" });
        }

        const q = pendingRows[0];
        const insertQuery = `
          INSERT INTO questions (
            category, subcategory, difficulty, question_type,
            question_text, passage, data_block, options,
            correct_answer, grading_config, solution,
            source_file, source_question_no, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `;

        const qType = q.final_question_type || q.detected_question_type;
        const diffVal = (q.difficulty || 'basic').toLowerCase().includes('advance') ? 'advanced' : (q.difficulty || 'basic').toLowerCase();

        const insertValues = [
          q.category,
          q.subcategory,
          diffVal,
          qType,
          q.question_text,
          q.passage,
          typeof q.data_block === 'object' && q.data_block !== null ? JSON.stringify(q.data_block) : q.data_block,
          typeof q.options === 'object' && q.options !== null ? JSON.stringify(q.options) : q.options,
          typeof q.correct_answer === 'object' && q.correct_answer !== null ? JSON.stringify(q.correct_answer) : q.correct_answer,
          typeof q.grading_config === 'object' && q.grading_config !== null ? JSON.stringify(q.grading_config) : q.grading_config,
          q.solution,
          q.source_file,
          q.source_question_no
        ];

        await pool.query(insertQuery, insertValues);

        await pool.query("UPDATE review_pending_questions SET status = 'approved' WHERE id = ?", [id]);
        return res.json({ message: "Question approved successfully" });
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
      await pool.query("UPDATE review_pending_questions SET status = 'rejected' WHERE id = ?", [id]);
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
      
      let whereClause = "WHERE status = 'active'";
      const params: any[] = [];

      if (category) {
        whereClause += " AND category = ?";
        params.push(category);
      }
      if (type) {
        whereClause += " AND question_type = ?";
        params.push(type);
      }

      // Get total count
      const [countResult]: any = await pool.query(
        `SELECT COUNT(*) as total FROM questions ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // Get paginated results
      const query = `SELECT * FROM questions ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`;
      const [rows] = await pool.query(query, [...params, limitNum, offset]);
      
      return res.json({
        questions: rows,
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

      // Insert into review_pending_questions (marked as admin-created)
      const insertQuery = `
        INSERT INTO review_pending_questions (
          category, subcategory, difficulty, detected_question_type, final_question_type,
          question_text, passage, data_block, options, correct_answer, grading_config,
          solution, status, parser_confidence, source_file, source_question_no, warnings,
          created_by_admin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        category,
        subcategory || null,
        difficulty || 'Basic',
        type,
        type,
        question_text,
        passage || null,
        typeof data_block === 'object' && data_block !== null ? JSON.stringify(data_block) : data_block || null,
        typeof options === 'object' && options !== null ? JSON.stringify(options) : options || null,
        typeof correct_answer === 'object' && correct_answer !== null ? JSON.stringify(correct_answer) : correct_answer,
        typeof grading_config === 'object' && grading_config !== null ? JSON.stringify(grading_config) : grading_config,
        solution || null,
        'pending', // Start in pending (admin can then approve their own)
        1.0, // High confidence since admin created it
        'admin-created', // Mark source as admin
        null,
        JSON.stringify([]), // No warnings for admin-created
        true // Mark as created by admin
      ];

      const [result]: any = await pool.query(insertQuery, values);

      return res.status(201).json({
        id: result.insertId,
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

      const query = `
        UPDATE questions SET
          category = ?,
          subcategory = ?,
          difficulty = ?,
          question_type = ?,
          question_text = ?,
          passage = ?,
          data_block = ?,
          options = ?,
          correct_answer = ?,
          grading_config = ?,
          solution = ?,
          updated_at = NOW()
        WHERE id = ?
      `;

      const values = [
        category,
        subcategory || null,
        difficulty || 'basic',
        question_type,
        question_text,
        passage || null,
        typeof data_block === 'object' && data_block !== null ? JSON.stringify(data_block) : data_block || null,
        typeof options === 'object' && options !== null ? JSON.stringify(options) : options || null,
        typeof correct_answer === 'object' && correct_answer !== null ? JSON.stringify(correct_answer) : correct_answer,
        typeof grading_config === 'object' && grading_config !== null ? JSON.stringify(grading_config) : grading_config,
        solution || null,
        id
      ];

      const [result]: any = await pool.query(query, values);

      if (result.affectedRows === 0) {
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
      // 1. Get counts
      const [pendingCountRows]: any = await pool.query("SELECT COUNT(*) as count FROM review_pending_questions WHERE status = 'pending'");
      const [approvedCountRows]: any = await pool.query("SELECT COUNT(*) as count FROM questions WHERE status = 'active'");
      const [studentCountRows]: any = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");

      // 2. Get category distribution for approved questions
      const [categoryRows]: any = await pool.query("SELECT category, COUNT(*) as count FROM questions WHERE status = 'active' GROUP BY category");

      // 3. Get test attempt ingestion & daily trends (C for admin)
      const [dailyTrendRows]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(submitted_at, '%Y-%m-%d') as date, 
          COUNT(id) as count
        FROM test_sessions
        WHERE status = 'completed' AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE_FORMAT(submitted_at, '%Y-%m-%d')
        ORDER BY date ASC
      `);

      return res.json({
        pendingCount: pendingCountRows[0]?.count || 0,
        approvedCount: approvedCountRows[0]?.count || 0,
        studentCount: studentCountRows[0]?.count || 0,
        categories: categoryRows || [],
        dailyTrends: dailyTrendRows || []
      });
    } catch (error: any) {
      console.error("Error in getStats:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch statistics" });
    }
  },

  // GET /api/questions/categories - Get unique categories and subcategories from DB
  async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      // Get unique categories from both approved questions and pending questions
      const [approvedCategories]: any = await pool.query(
        `SELECT DISTINCT category FROM questions WHERE status = 'active' AND category IS NOT NULL ORDER BY category`
      );
      
      const [pendingCategories]: any = await pool.query(
        `SELECT DISTINCT category FROM review_pending_questions WHERE category IS NOT NULL ORDER BY category`
      );

      // Merge and deduplicate categories
      const allCategories = new Set([
        ...approvedCategories.map((r: any) => r.category),
        ...pendingCategories.map((r: any) => r.category)
      ]);

      // Get subcategories for each category
      const categoryMap: Record<string, Set<string>> = {};
      
      for (const category of allCategories) {
        if (!category) continue;
        categoryMap[category] = new Set();
        
        // Get subcategories from approved questions
        const [approvedSubs]: any = await pool.query(
          `SELECT DISTINCT subcategory FROM questions 
           WHERE category = ? AND subcategory IS NOT NULL AND status = 'active' 
           ORDER BY subcategory`,
          [category]
        );
        approvedSubs.forEach((r: any) => { if (r.subcategory) categoryMap[category].add(r.subcategory); });
        
        // Get subcategories from pending questions
        const [pendingSubs]: any = await pool.query(
          `SELECT DISTINCT subcategory FROM review_pending_questions 
           WHERE category = ? AND subcategory IS NOT NULL 
           ORDER BY subcategory`,
          [category]
        );
        pendingSubs.forEach((r: any) => { if (r.subcategory) categoryMap[category].add(r.subcategory); });
      }

      // Convert to array format
      const result = Array.from(allCategories)
        .filter(c => c) // Remove null/empty
        .map(category => ({
          id: category,
          label: category,
          subcategories: Array.from(categoryMap[category] || [])
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      return res.json({ categories: result });
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