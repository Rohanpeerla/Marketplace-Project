const { Pool } = require('pg');
const config = require('./env');

/**
 * PostgreSQL connection pool configuration.
 * Prepared for MarketHub database operations.
 */
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle database client', err.message);
});

/**
 * Execute SQL queries through connection pool.
 * @param {string} text - SQL query string
 * @param {Array} params - Parameterized query values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Verify database connectivity during server startup.
 * Non-blocking: Server can still boot even if local PostgreSQL is not yet running.
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

module.exports = {
  pool,
  query,
  testConnection,
};
