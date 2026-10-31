/**
 * Stage 9 Database Migration
 * - Adds start_date, usage_limit, used_count to coupons
 * - Adds invoice_number, coupon_id, coupon_code to orders
 * - Adds order_id to reviews
 * - Backfills invoice_number for existing orders
 * - Seeds sample coupons
 */
const { pool } = require('../src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[Migration Stage 9] Starting migration...');

    // 1. Coupons table additions
    await client.query(`
      ALTER TABLE coupons 
      ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('[Migration Stage 9] Altered coupons table.');

    // 2. Orders table additions
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
    `);
    console.log('[Migration Stage 9] Altered orders table.');

    // 3. Reviews table additions
    await client.query(`
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
    `);
    console.log('[Migration Stage 9] Altered reviews table.');

    // 4. Backfill invoice_number for existing orders without one
    const ordersRes = await client.query(`
      SELECT id, created_at FROM orders WHERE invoice_number IS NULL
    `);
    for (const order of ordersRes.rows) {
      const year = new Date(order.created_at).getFullYear();
      const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      const invNum = `INV-${year}-${shortId}`;
      await client.query(
        `UPDATE orders SET invoice_number = $1 WHERE id = $2`,
        [invNum, order.id]
      );
    }
    console.log(`[Migration Stage 9] Backfilled ${ordersRes.rows.length} existing orders with invoice_number.`);

    // 5. Seed sample coupons if not existing
    const sampleCoupons = [
      {
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        minimum_order_amount: 100,
        maximum_discount_amount: 50,
        usage_limit: 100,
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
      },
      {
        code: 'FLAT50',
        discount_type: 'fixed',
        discount_value: 50,
        minimum_order_amount: 200,
        maximum_discount_amount: 50,
        usage_limit: 50,
        expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
      },
      {
        code: 'EXPIRED20',
        discount_type: 'percentage',
        discount_value: 20,
        minimum_order_amount: 50,
        maximum_discount_amount: 100,
        usage_limit: 10,
        expiry_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
      }
    ];

    for (const c of sampleCoupons) {
      await client.query(`
        INSERT INTO coupons (code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, usage_limit, expiry_date, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO NOTHING;
      `, [c.code, c.discount_type, c.discount_value, c.minimum_order_amount, c.maximum_discount_amount, c.usage_limit, c.expiry_date, c.active]);
    }
    console.log('[Migration Stage 9] Sample coupons seeded.');

    await client.query('COMMIT');
    console.log('[Migration Stage 9] Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Stage 9] Error during migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
