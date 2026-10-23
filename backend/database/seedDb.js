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

    // Count seeded records sequentially
    const usersCount = (await client.query('SELECT COUNT(*) AS count FROM users')).rows[0].count;
    const vendorsCount = (await client.query('SELECT COUNT(*) AS count FROM vendors')).rows[0].count;
    const categoriesCount = (await client.query('SELECT COUNT(*) AS count FROM categories')).rows[0].count;
    const productsCount = (await client.query('SELECT COUNT(*) AS count FROM products')).rows[0].count;
    const imagesCount = (await client.query('SELECT COUNT(*) AS count FROM product_images')).rows[0].count;
    const couponsCount = (await client.query('SELECT COUNT(*) AS count FROM coupons')).rows[0].count;

    console.log('[DB Seed] Current database record summary:');
    console.log(`   - Users:          ${usersCount}`);
    console.log(`   - Vendors:        ${vendorsCount}`);
    console.log(`   - Categories:     ${categoriesCount}`);
    console.log(`   - Products:       ${productsCount}`);
    console.log(`   - Product Images: ${imagesCount}`);
    console.log(`   - Coupons:        ${couponsCount}`);

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
