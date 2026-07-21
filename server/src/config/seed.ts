import bcrypt from "bcryptjs";
import pool from "./db";

const password = await bcrypt.hash("admin123", 10);

await pool.query(
  `INSERT INTO users(name,email,password,role)
   VALUES(?,?,?,?)`,
  ["Admin", "admin@aptitest.com", password, "admin"]
);

console.log("Admin created");
process.exit();