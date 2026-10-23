const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

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
