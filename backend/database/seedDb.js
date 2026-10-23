const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

/**
 * Seeds the MarketHub database with initial development data from seed.sql.
 * Safe and idempotent: Uses ON CONFLICT clauses to avoid duplicate key errors.
 */
async function seedDatabase() {
  const seedPath = path.join(__dirname, 'seed.sql');

  if (!fs.existsSync(seedPath)) {
    console.error(`[DB Seed] Error: seed.sql not found at ${seedPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(seedPath, 'utf8');

  console.log('====================================================');
  console.log('🌱 MarketHub: Seeding PostgreSQL Database');
  console.log('====================================================');

  let client;
  try {
    client = await pool.connect();
    console.log('[DB Seed] Applying seed records...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[DB Seed] Seed SQL executed successfully.');

    // Count seeded records
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) AS count FROM users'),
      client.query('SELECT COUNT(*) AS count FROM vendors'),
      client.query('SELECT COUNT(*) AS count FROM categories'),
      client.query('SELECT COUNT(*) AS count FROM products'),
      client.query('SELECT COUNT(*) AS count FROM product_images'),
      client.query('SELECT COUNT(*) AS count FROM coupons'),
    ]);

    console.log('[DB Seed] Current database record summary:');
    console.log(`   - Users:          ${counts[0].rows[0].count}`);
    console.log(`   - Vendors:        ${counts[1].rows[0].count}`);
    console.log(`   - Categories:     ${counts[2].rows[0].count}`);
    console.log(`   - Products:       ${counts[3].rows[0].count}`);
    console.log(`   - Product Images: ${counts[4].rows[0].count}`);
    console.log(`   - Coupons:        ${counts[5].rows[0].count}`);

    console.log('====================================================');
    console.log('✅ Database seeded successfully.');
    console.log('====================================================');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('\n❌ [DB Seed Notice]: Could not complete database seeding.');
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
  seedDatabase();
}

module.exports = seedDatabase;
