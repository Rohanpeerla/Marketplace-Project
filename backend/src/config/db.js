const { Pool } = require('pg');
const config = require('./env');

/**
 * PostgreSQL connection pool configuration.
 * Reads DATABASE_URL directly from validated environment configuration.
 */
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle database client', err.message);
});

/**
 * Execute parameterized SQL queries through connection pool.
 * @param {string} text - SQL query string
 * @param {Array} params - Parameterized query values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Verify database connectivity during server startup.
 * Non-blocking: Server continues to run even if PostgreSQL is pending local setup.
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time');
    client.release();
    console.log(`[PostgreSQL] Connected successfully to database at ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.warn(
      `[PostgreSQL] Notice: Could not connect to database (${error.message}). ` +
      `Ensure PostgreSQL is running and DATABASE_URL in backend/.env is configured when ready.`
    );
    return false;
  }
};

/**
 * Dedicated health check helper for GET /api/health/db.
 * Never leaks database credentials or internal connection strings.
 */
const checkHealth = async () => {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return {
      isConnected: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      isConnected: false,
      message: 'Database is unavailable. Please verify PostgreSQL connection.',
    };
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  checkHealth,
};
