import pool from "../config/db";

// TypeScript interface
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "admin" | "student";
  status: "active" | "banned";
  created_at: Date;
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

  async create(
    name: string,
    email: string,
    password: string,
    role: "admin" | "student" = "student",
    status: "active" | "banned" = "active"
  ): Promise<User> {
    const [result]: any = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, password, role, status]
    );

    return {
      id: result.insertId,
      name,
      email,
      password,
      role,
      status,
      created_at: new Date(),
    };
  },
};