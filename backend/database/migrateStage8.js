const { pool } = require('../src/config/db');

async function migrateStage8() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Stage 8 Database Migration ---');
    await client.query('BEGIN');

    // 1. Add razorpay columns to payments table if they don't exist
    await client.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255),
        ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
    `);

    // 2. Add index on razorpay_order_id for fast verification lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
    `);

    // 3. Update status check constraint on payments to include 'created'
    await client.query(`
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
      ALTER TABLE payments ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refunded'));
    `);

    await client.query('COMMIT');
    console.log('✅ Stage 8 Database Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Stage 8 Database Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateStage8().catch(() => process.exit(1));
