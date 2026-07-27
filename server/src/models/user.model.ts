import pool from "../config/db";

// TypeScript interface
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "admin" | "student";
  status: "active" | "banned";
  email_verified: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const userModel = {
  async findByEmail(email: string): Promise<User | null> {
    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  },

  async findById(id: number): Promise<User | null> {
    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  },

  async create(
    name: string,
    email: string,
    password: string,
    role: "admin" | "student" = "student",
    status: "active" | "banned" = "active",
    emailVerificationToken: string | null = null
  ): Promise<User> {
    const expiresAt = emailVerificationToken 
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      : null;

    const [result]: any = await pool.query(
      `INSERT INTO users (name, email, password, role, status, email_verified, email_verification_token, email_verification_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password, role, status, false, emailVerificationToken, expiresAt]
    );

    return {
      id: result.insertId,
      name,
      email,
      password,
      role,
      status,
      email_verified: false,
      email_verification_token: emailVerificationToken,
      email_verification_expires: expiresAt,
      password_reset_token: null,
      password_reset_expires: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  },

  async setPasswordResetToken(email: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      `UPDATE users 
       SET password_reset_token = ?, password_reset_expires = ?
       WHERE email = ?`,
      [token, expiresAt, email]
    );
  },

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM users 
       WHERE password_reset_token = ? 
       AND password_reset_expires > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET password = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE password_reset_token = ? AND password_reset_expires > NOW()`,
      [newPassword, token]
    );
  },

  async setEmailVerificationToken(email: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await pool.query(
      `UPDATE users 
       SET email_verification_token = ?, email_verification_expires = ?
       WHERE email = ?`,
      [token, expiresAt, email]
    );
  },

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM users 
       WHERE email_verification_token = ? 
       AND email_verification_expires > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  },

  async verifyEmail(token: string): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL, updated_at = NOW()
       WHERE email_verification_token = ? AND email_verification_expires > NOW()`,
      [token]
    );
  },

  // Get paginated list of students
  async getStudentsPaginated(page: number = 1, limit: number = 10, search?: string): Promise<{ students: any[], total: number, totalPages: number }> {
    const offset = (page - 1) * limit;
    
    // Build where clause for search
    let whereClause = "WHERE role = 'student'";
    const params: any[] = [];
    
    if (search) {
      whereClause += " AND (name LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Get total count
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // Get paginated results
    const [rows] = await pool.query(
      `SELECT id, name, email, role, status, email_verified, created_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    return {
      students: rows as any[],
      total,
      totalPages: Math.ceil(total / limit),
    };
  },
};