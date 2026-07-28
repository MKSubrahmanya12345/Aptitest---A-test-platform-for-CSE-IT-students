import pool from "../config/db";

// Helper to safely parse JSON fields that might be strings or already parsed
function safeJsonParse(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value; // Already parsed or not a string
  try {
    return JSON.parse(value);
  } catch {
    // If not valid JSON, wrap it in an array
    return [value];
  }
}

export interface TestTemplate {
  id?: number;
  name: string;
  description?: string;
  difficulty: string;
  count: number;
  duration_seconds: number;
  categories?: string[] | null;
  question_types?: string[] | null;
  subcategories?: string[] | null;
  is_paid: boolean;
  price_paise?: number | null;
  currency: string;
  is_active: boolean;
  allow_reattempt: boolean;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface TestTemplateFilters {
  is_active?: boolean;
  is_paid?: boolean;
  difficulty?: string;
}

export const testTemplateService = {
  // Get all templates with optional filtering
  async getAllTemplates(filters?: TestTemplateFilters): Promise<TestTemplate[]> {
    let query = `SELECT * FROM test_templates WHERE 1=1`;
    const params: any[] = [];

    if (filters?.is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(filters.is_active);
    }

    if (filters?.is_paid !== undefined) {
      query += ` AND is_paid = ?`;
      params.push(filters.is_paid);
    }

    if (filters?.difficulty) {
      query += ` AND difficulty = ?`;
      params.push(filters.difficulty);
    }

    query += ` ORDER BY created_at DESC`;

    try {
      const [rows]: any = await pool.query(query, params);
      
      return rows.map((row: any) => ({
        ...row,
        categories: safeJsonParse(row.categories),
        question_types: safeJsonParse(row.question_types),
        subcategories: safeJsonParse(row.subcategories),
      }));
    } catch (err: any) {
      // If table doesn't exist, return empty array
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.warn('test_templates table does not exist yet. Run migrations.');
        return [];
      }
      throw err;
    }
  },

  // Get a single template by ID
  async getTemplateById(id: number): Promise<TestTemplate | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM test_templates WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row,
      categories: safeJsonParse(row.categories),
      question_types: safeJsonParse(row.question_types),
      subcategories: safeJsonParse(row.subcategories),
    };
  },

  // Get template by name (for payment lookups)
  async getTemplateByName(name: string): Promise<TestTemplate | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM test_templates WHERE name = ? AND is_active = TRUE`,
      [name]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row,
      categories: safeJsonParse(row.categories),
      question_types: safeJsonParse(row.question_types),
      subcategories: safeJsonParse(row.subcategories),
    };
  },

  // Create a new template
  async createTemplate(template: TestTemplate): Promise<number> {
    const [result]: any = await pool.query(
      `INSERT INTO test_templates (
        name, description, difficulty, count, duration_seconds,
        categories, question_types, subcategories, is_paid, price_paise,
        currency, is_active, allow_reattempt, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template.name,
        template.description,
        template.difficulty,
        template.count,
        template.duration_seconds,
        template.categories ? JSON.stringify(template.categories) : null,
        template.question_types ? JSON.stringify(template.question_types) : null,
        template.subcategories ? JSON.stringify(template.subcategories) : null,
        template.is_paid,
        template.price_paise,
        template.currency || 'inr',
        template.is_active,
        template.allow_reattempt,
        template.created_by,
      ]
    );

    return result.insertId;
  },

  // Update an existing template
  async updateTemplate(id: number, template: Partial<TestTemplate>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (template.name !== undefined) {
      updates.push("name = ?");
      values.push(template.name);
    }
    if (template.description !== undefined) {
      updates.push("description = ?");
      values.push(template.description);
    }
    if (template.difficulty !== undefined) {
      updates.push("difficulty = ?");
      values.push(template.difficulty);
    }
    if (template.count !== undefined) {
      updates.push("count = ?");
      values.push(template.count);
    }
    if (template.duration_seconds !== undefined) {
      updates.push("duration_seconds = ?");
      values.push(template.duration_seconds);
    }
    if (template.categories !== undefined) {
      updates.push("categories = ?");
      values.push(template.categories ? JSON.stringify(template.categories) : null);
    }
    if (template.question_types !== undefined) {
      updates.push("question_types = ?");
      values.push(template.question_types ? JSON.stringify(template.question_types) : null);
    }
    if (template.subcategories !== undefined) {
      updates.push("subcategories = ?");
      values.push(template.subcategories ? JSON.stringify(template.subcategories) : null);
    }
    if (template.is_paid !== undefined) {
      updates.push("is_paid = ?");
      values.push(template.is_paid);
    }
    if (template.price_paise !== undefined) {
      updates.push("price_paise = ?");
      values.push(template.price_paise);
    }
    if (template.currency !== undefined) {
      updates.push("currency = ?");
      values.push(template.currency);
    }
    if (template.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(template.is_active);
    }
    if (template.allow_reattempt !== undefined) {
      updates.push("allow_reattempt = ?");
      values.push(template.allow_reattempt);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const query = `UPDATE test_templates SET ${updates.join(", ")} WHERE id = ?`;
    
    const [result]: any = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Delete a template
  async deleteTemplate(id: number): Promise<boolean> {
    const [result]: any = await pool.query(
      `DELETE FROM test_templates WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  },

  // Check if user has paid for a specific template
  async hasUserPaidForTemplate(userId: number, templateId: number): Promise<boolean> {
    const [rows]: any = await pool.query(
      `SELECT id FROM payments WHERE user_id = ? AND test_type = ? AND status = 'succeeded' LIMIT 1`,
      [userId, `template_${templateId}`]
    );
    return rows.length > 0;
  },
};
