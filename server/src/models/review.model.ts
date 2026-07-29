import pool from '../config/db';
import type { PoolConnection } from 'mysql2/promise';

export interface PendingQuestion {
  id: number;
  category: string;
  subcategory: string | null;
  difficulty: string;
  detected_question_type: string;
  final_question_type: string | null;
  question_text: string;
  passage: string | null;
  data_block: any;
  options: any;
  correct_answer: any;
  grading_config: any;
  solution: string | null;
  source_file: string | null;
  source_question_no: number | null;
  status: 'pending' | 'approved' | 'rejected';
  parser_confidence: number;
  warnings: string;
  created_by_admin: boolean;
  created_at: Date;
}

export interface Question {
  id: number;
  category: string;
  subcategory: string | null;
  difficulty: string;
  question_type: string;
  question_text: string;
  passage: string | null;
  data_block: any;
  options: any;
  correct_answer: any;
  grading_config: any;
  solution: string | null;
  source_file: string | null;
  source_question_no: number | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface FilterParams {
  category?: string;
  type?: string;
}

export const reviewModel = {
  // Get pending questions with pagination and filters
  async getPendingPaginated(
    filters: FilterParams,
    pagination: PaginationParams
  ): Promise<{ questions: PendingQuestion[]; total: number }> {
    let whereClause = "WHERE status = 'pending'";
    const params: any[] = [];

    if (filters.category) {
      whereClause += " AND category = ?";
      params.push(filters.category);
    }
    if (filters.type) {
      whereClause += " AND (detected_question_type = ? OR final_question_type = ?)";
      params.push(filters.type, filters.type);
    }

    // Get total count
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM review_pending_questions ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    const query = `SELECT * FROM review_pending_questions ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(query, [...params, pagination.limit, pagination.offset]);

    return { questions: rows as PendingQuestion[], total };
  },

  // Get approved questions with pagination and filters
  async getQuestionsPaginated(
    filters: FilterParams,
    pagination: PaginationParams
  ): Promise<{ questions: Question[]; total: number }> {
    let whereClause = "WHERE status = 'active'";
    const params: any[] = [];

    if (filters.category) {
      whereClause += " AND category = ?";
      params.push(filters.category);
    }
    if (filters.type) {
      whereClause += " AND question_type = ?";
      params.push(filters.type);
    }

    // Get total count
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM questions ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    const query = `SELECT * FROM questions ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(query, [...params, pagination.limit, pagination.offset]);

    return { questions: rows as Question[], total };
  },

  // Get pending question by id
  async getPendingById(id: number): Promise<PendingQuestion | null> {
    const [rows]: any = await pool.query(
      "SELECT * FROM review_pending_questions WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] as PendingQuestion : null;
  },

  // Get pending question by id with status check (for transaction operations)
  async getPendingByIdWithStatus(
    id: number,
    status: string,
    connection?: PoolConnection
  ): Promise<PendingQuestion | null> {
    const query = connection || pool;
    const [rows]: any = await query.query(
      "SELECT * FROM review_pending_questions WHERE id = ? AND status = ?",
      [id, status]
    );
    return rows.length > 0 ? rows[0] as PendingQuestion : null;
  },

  // Update pending question
  async updatePending(
    id: number,
    data: Partial<PendingQuestion>
  ): Promise<void> {
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
      data.category,
      data.subcategory,
      data.difficulty,
      data.final_question_type,
      data.question_text,
      data.passage,
      data.data_block,
      data.options,
      data.correct_answer,
      data.grading_config,
      data.solution,
      id
    ];

    await pool.query(query, values);
  },

  // Approve pending question (used in transaction)
  async approvePending(
    id: number,
    data: Partial<PendingQuestion>,
    connection: PoolConnection
  ): Promise<number> {
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
        solution = ?,
        status = 'approved'
      WHERE id = ? AND status = 'pending'
    `;

    const values = [
      data.category,
      data.subcategory,
      data.difficulty,
      data.final_question_type,
      data.question_text,
      data.passage,
      data.data_block,
      data.options,
      data.correct_answer,
      data.grading_config,
      data.solution,
      id
    ];

    const [result]: any = await connection.query(query, values);
    return result.affectedRows;
  },

  // Simple approve pending question (used in transaction for simple flow)
  async setPendingStatus(
    id: number,
    status: 'approved' | 'rejected',
    connection?: PoolConnection
  ): Promise<number> {
    const query = connection || pool;
    const [result]: any = await query.query(
      `UPDATE review_pending_questions SET status = ? WHERE id = ? AND status = 'pending'`,
      [status, id]
    );
    return result.affectedRows;
  },

  // Insert question into main questions table (used in transaction)
  async insertQuestion(
    data: Partial<Question>,
    connection: PoolConnection
  ): Promise<number> {
    const query = `
      INSERT INTO questions (
        category, subcategory, difficulty, question_type,
        question_text, passage, data_block, options,
        correct_answer, grading_config, solution,
        source_file, source_question_no, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    const values = [
      data.category,
      data.subcategory,
      data.difficulty,
      data.question_type,
      data.question_text,
      data.passage,
      data.data_block,
      data.options,
      data.correct_answer,
      data.grading_config,
      data.solution,
      data.source_file,
      data.source_question_no
    ];

    const [result]: any = await connection.query(query, values);
    return result.insertId;
  },

  // Create question directly (admin created)
  async createPendingQuestion(data: Partial<PendingQuestion>): Promise<number> {
    const query = `
      INSERT INTO review_pending_questions (
        category, subcategory, difficulty, detected_question_type, final_question_type,
        question_text, passage, data_block, options, correct_answer, grading_config,
        solution, status, parser_confidence, source_file, source_question_no, warnings,
        created_by_admin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.category,
      data.subcategory || null,
      data.difficulty || 'Basic',
      data.detected_question_type,
      data.final_question_type,
      data.question_text,
      data.passage || null,
      data.data_block || null,
      data.options || null,
      data.correct_answer,
      data.grading_config,
      data.solution || null,
      'pending',
      1.0,
      'admin-created',
      null,
      JSON.stringify([]),
      true
    ];

    const [result]: any = await pool.query(query, values);
    return result.insertId;
  },

  // Update approved question
  async updateQuestion(id: number, data: Partial<Question>): Promise<number> {
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
      data.category,
      data.subcategory || null,
      data.difficulty || 'basic',
      data.question_type,
      data.question_text,
      data.passage || null,
      data.data_block || null,
      data.options || null,
      data.correct_answer,
      data.grading_config,
      data.solution || null,
      id
    ];

    const [result]: any = await pool.query(query, values);
    return result.affectedRows;
  },

  // Get stats
  async getStats(): Promise<{
    pendingCount: number;
    approvedCount: number;
    studentCount: number;
    categories: any[];
    dailyTrends: any[];
  }> {
    // 1. Get counts
    const [pendingCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM review_pending_questions WHERE status = 'pending'"
    );
    const [approvedCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM questions WHERE status = 'active'"
    );
    const [studentCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
    );

    // 2. Get category distribution for approved questions
    const [categoryRows]: any = await pool.query(
      "SELECT category, COUNT(*) as count FROM questions WHERE status = 'active' GROUP BY category"
    );

    // 3. Get test attempt daily trends
    const [dailyTrendRows]: any = await pool.query(`
      SELECT 
        DATE_FORMAT(submitted_at, '%Y-%m-%d') as date, 
        COUNT(id) as count
      FROM test_sessions
      WHERE status = 'completed' AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(submitted_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    return {
      pendingCount: pendingCountRows[0]?.count || 0,
      approvedCount: approvedCountRows[0]?.count || 0,
      studentCount: studentCountRows[0]?.count || 0,
      categories: categoryRows || [],
      dailyTrends: dailyTrendRows || []
    };
  },

  // Get categories and subcategories
  async getCategories(): Promise<{ id: string; label: string; subcategories: string[] }[]> {
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

    // Initialize category map
    const categoryMap: Record<string, Set<string>> = {};
    for (const category of allCategories) {
      if (category) {
        categoryMap[category] = new Set();
      }
    }

    // Get all subcategories from approved questions in one query
    const [approvedSubs]: any = await pool.query(
      `SELECT DISTINCT category, subcategory FROM questions 
       WHERE category IS NOT NULL AND subcategory IS NOT NULL AND status = 'active'`
    );
    approvedSubs.forEach((r: any) => {
      if (r.category && r.subcategory && categoryMap[r.category]) {
        categoryMap[r.category].add(r.subcategory);
      }
    });

    // Get all subcategories from pending questions in one query
    const [pendingSubs]: any = await pool.query(
      `SELECT DISTINCT category, subcategory FROM review_pending_questions 
       WHERE category IS NOT NULL AND subcategory IS NOT NULL`
    );
    pendingSubs.forEach((r: any) => {
      if (r.category && r.subcategory && categoryMap[r.category]) {
        categoryMap[r.category].add(r.subcategory);
      }
    });

    // Convert to array format
    return Array.from(allCategories)
      .filter(c => c)
      .map(category => ({
        id: category,
        label: category,
        subcategories: Array.from(categoryMap[category] || []).sort()
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
};
