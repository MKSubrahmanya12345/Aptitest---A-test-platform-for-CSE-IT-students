import bcrypt from "bcryptjs";
import pool from "./db";

async function seedDatabase() {
  // It's better to get a single connection for a script
  const connection = await pool.getConnection();
  try {
    console.log("🌱 Seeding database...");

    const adminEmail = "admin@aptitest.com";
    let adminId: number;

    // Check if admin user already exists to make the script re-runnable
    const [existingUsers]: any = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [adminEmail]
    );

    if (existingUsers.length > 0) {
      console.log("Admin user already exists. Skipping.");
      adminId = existingUsers[0].id;
    } else {
      const password = await bcrypt.hash("admin123", 10);
      const [result]: any = await connection.query(
        `INSERT INTO users(name, email, password, role)
         VALUES(?, ?, ?, ?)`,
        ["Admin", adminEmail, password, "admin"]
      );
      adminId = result.insertId;
      console.log("✅ Admin user created successfully.");
    }

    // Seed default test templates
    console.log("📝 Seeding test templates...");
    await seedTestTemplates(connection, adminId);

    console.log("✅ Seeding complete.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end(); // This closes all connections in the pool, allowing the script to exit.
  }
}

async function seedTestTemplates(connection: any, adminId: number) {
  const templates = [
    {
      name: "Easy Practice - 30 Qs",
      description: "Perfect for quick basic revision. Covers easy level questions across chosen streams.",
      difficulty: "easy",
      count: 30,
      duration_seconds: 1800, // 30 minutes
      is_paid: false,
      price_paise: null,
    },
    {
      name: "Easy Practice - 60 Qs",
      description: "Full length foundation practice. Ideal for building solid speed and accuracy.",
      difficulty: "easy",
      count: 60,
      duration_seconds: 3600, // 60 minutes
      is_paid: false,
      price_paise: null,
    },
    {
      name: "Hard Practice - 30 Qs",
      description: "Challenging intermediate and advanced tasks designed to test logical limits.",
      difficulty: "hard",
      count: 30,
      duration_seconds: 1800, // 30 minutes
      is_paid: false,
      price_paise: null,
    },
    {
      name: "Hard Practice - 60 Qs",
      description: "Complete advanced simulation. Designed to stress test your skill stamina.",
      difficulty: "hard",
      count: 60,
      duration_seconds: 3600, // 60 minutes
      is_paid: true,
      price_paise: 5000, // ₹50
    },
  ];

  for (const template of templates) {
    // Check if template already exists
    const [existing]: any = await connection.query(
      "SELECT id FROM test_templates WHERE name = ?",
      [template.name]
    );

    if (existing.length > 0) {
      console.log(`  ⏭️  Template "${template.name}" already exists. Skipping.`);
      continue;
    }

    await connection.query(
      `INSERT INTO test_templates (
        name, description, difficulty, count, duration_seconds,
        categories, question_types, subcategories,
        is_paid, price_paise, currency, is_active, allow_reattempt, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template.name,
        template.description,
        template.difficulty,
        template.count,
        template.duration_seconds,
        null, // categories - all
        null, // question_types - all
        null, // subcategories - all
        template.is_paid,
        template.price_paise,
        "inr",
        true, // is_active
        true, // allow_reattempt
        adminId,
      ]
    );
    console.log(`  ✅ Created template: ${template.name} ${template.is_paid ? '(₹' + (template.price_paise! / 100) + ')' : '(FREE)'}`);
  }
}

seedDatabase();