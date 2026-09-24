/**
 * EiToh Database Connection Manager
 * Powered by mysql2/promise with connection pooling
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eitoh_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

/**
 * Executes a parameterized query
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<[Array, Object]>}
 */
async function query(sql, params = []) {
  const p = getPool();
  return await p.query(sql, params);
}

/**
 * Acquires a raw connection from the pool (for transactions)
 */
async function getConnection() {
  const p = getPool();
  return await p.getConnection();
}

/**
 * Health check ping
 */
async function testConnection() {
  try {
    const [rows] = await query('SELECT 1 + 1 AS result');
    return rows[0].result === 2;
  } catch (err) {
    console.error('MySQL connection health check failed:', err.message);
    return false;
  }
}

module.exports = {
  getPool,
  query,
  getConnection,
  testConnection,
  poolConfig
};
