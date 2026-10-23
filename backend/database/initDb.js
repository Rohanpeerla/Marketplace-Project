const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../src/config/env');
const { pool } = require('../src/config/db');

/**
 * Ensures markethub_db database exists on the PostgreSQL server.
 */
async function ensureDatabaseExists() {
  try {
    const url = new URL(config.databaseUrl);
    const targetDb = url.pathname.replace(/^\//, '');

    if (!targetDb || targetDb === 'postgres') return;

    // Connect to default 'postgres' database to verify/create target database
    url.pathname = '/postgres';
    const rootClient = new Client({ connectionString: url.toString() });

    await rootClient.connect();
    const checkRes = await rootClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (checkRes.rowCount === 0) {
      console.log(`[DB Init] Database "${targetDb}" does not exist. Creating...`);
      // Database names cannot be parameterized in CREATE DATABASE
      await rootClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[DB Init] Database "${targetDb}" created successfully.`);
    } else {
      console.log(`[DB Init] Database "${targetDb}" verified.`);
    }

    await rootClient.end();
  } catch (err) {
    // If root connection fails (e.g. restricted permissions or bad credentials),
    // let main pool connection report the specific connection issue.
  }
}

/**
 * Initializes the MarketHub database schema by executing schema.sql.
 * Safe script: Does not drop the database; uses IF NOT EXISTS clauses.
 */
async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error(`[DB Init] Error: schema.sql not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('====================================================');
  console.log('📦 MarketHub: Initializing PostgreSQL Database Schema');
  console.log('====================================================');

  // Step 1: Ensure markethub_db database exists
  await ensureDatabaseExists();

  // Step 2: Apply schema to markethub_db
  let client;
  try {
    client = await pool.connect();
    console.log('[DB Init] Applying schema definitions...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[DB Init] Schema executed successfully.');

    // Verify created tables
    const tableCheckQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const res = await client.query(tableCheckQuery);
    const tableNames = res.rows.map(r => r.table_name);

    console.log(`[DB Init] Verified tables (${tableNames.length} total):`);
    tableNames.forEach((tbl, idx) => {
      console.log(`   ${idx + 1}. ${tbl}`);
    });

    console.log('====================================================');
    console.log('✅ Database initialization completed successfully.');
    console.log('====================================================');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('\n❌ [DB Init Notice]: Could not complete database initialization.');
    const errorMsg = error.message || (error.errors ? error.errors.map(e => e.message).join('; ') : 'Connection refused');
    console.error(`   Reason: ${errorMsg}`);
    console.error('   Tip: Ensure PostgreSQL service is started and DATABASE_URL in backend/.env is configured.\n');
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
