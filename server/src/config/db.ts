import mysql from 'mysql2/promise';
import 'dotenv/config';

// The user mentioned they have AIVEN_SERVICE_URL.
// On Vercel, you should store this as an environment variable named DATABASE_URL.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Aiven requires SSL connections. The connection string from Aiven
// should already include the necessary SSL parameters (like `ssl-mode=REQUIRED`).
// For mysql2/promise, we can create a pool directly from this URI.
const pool = mysql.createPool({
  uri: connectionString,
  waitForConnections: true,
  // A connection limit is important for serverless environments to prevent overwhelming the database.
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;