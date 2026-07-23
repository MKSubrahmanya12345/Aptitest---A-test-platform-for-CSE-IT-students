import mysql from 'mysql2/promise';
import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

let pool: mysql.Pool;

if (isProduction) {
  // Production: Use Aiven database from DATABASE_URL
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  pool = mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  // Development: Use local MySQL
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aptitest',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  pool = mysql.createPool(config);
}

export default pool;