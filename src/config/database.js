const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

/**
 * Tests database connectivity by leasing and releasing a connection.
 */
const testConnection = async () => {
  const connection = await pool.getConnection();
  connection.release();
  return true;
};

module.exports = {
  pool,
  testConnection,
  dbConfig
};
