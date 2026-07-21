import bcrypt from "bcryptjs";
import pool from "./db";

async function seedDatabase() {
  // It's better to get a single connection for a script
  const connection = await pool.getConnection();
  try {
    console.log("🌱 Seeding database...");

    const adminEmail = "admin@aptitest.com";

    // Check if admin user already exists to make the script re-runnable
    const [existingUsers]: any = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [adminEmail]
    );

    if (existingUsers.length > 0) {
      console.log("Admin user already exists. Skipping.");
    } else {
      const password = await bcrypt.hash("admin123", 10);
      await connection.query(
        `INSERT INTO users(name, email, password, role)
         VALUES(?, ?, ?, ?)`,
        ["Admin", adminEmail, password, "admin"]
      );
      console.log("✅ Admin user created successfully.");
    }

    console.log("Seeding complete.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end(); // This closes all connections in the pool, allowing the script to exit.
  }
}

seedDatabase();