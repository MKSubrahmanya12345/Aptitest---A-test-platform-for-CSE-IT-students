import pool from '../config/db';

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const [rows]: any = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
      [table, column]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function migrate() {
  try {
    console.log('Running email verification migration...');

    // Add columns one by one with existence checks
    const columns = [
      { name: 'email_verified', def: 'BOOLEAN DEFAULT FALSE' },
      { name: 'email_verification_token', def: 'VARCHAR(255) NULL' },
      { name: 'email_verification_expires', def: 'DATETIME NULL' },
      { name: 'password_reset_token', def: 'VARCHAR(255) NULL' },
      { name: 'password_reset_expires', def: 'DATETIME NULL' },
      { name: 'updated_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    ];

    for (const col of columns) {
      const exists = await columnExists('users', col.name);
      if (!exists) {
        await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`ℹ️ Column already exists: ${col.name}`);
      }
    }

    console.log('✅ Migration completed successfully');

    // Update existing users to have email_verified = true (for backward compatibility)
    const updateExistingQuery = `
      UPDATE users 
      SET email_verified = TRUE 
      WHERE email_verified IS NULL OR email_verified = FALSE;
    `;
    
    await pool.query(updateExistingQuery);
    console.log('✅ Existing users updated with verified email status');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
