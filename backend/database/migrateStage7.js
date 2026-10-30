const { pool } = require('../src/config/db');

const migrateStage7 = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add vendor_id to orders if not exists (for 1 order per vendor multi-vendor checkout)
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
    `);

    // 2. Allow stage 7 statuses while maintaining backward compatibility with placed/packed
    await client.query(`
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
    `);

    await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_order_status_check 
      CHECK (order_status IN ('pending', 'confirmed', 'processing', 'placed', 'packed', 'shipped', 'delivered', 'cancelled'));
    `);

    await client.query(`
      ALTER TABLE orders ALTER COLUMN order_status SET DEFAULT 'pending';
    `);

    await client.query('COMMIT');
    console.log('[Migration] Stage 7 orders schema updated successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrateStage7();

