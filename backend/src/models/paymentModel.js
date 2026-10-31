const { pool } = require('../config/db');

/**
 * Executes a callback within a managed PostgreSQL database transaction.
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Upsert a payment record for an order.
 * Since order_id is UNIQUE in payments, handles both new creation and retry updates.
 */
const upsertPayment = async (clientOrPool, paymentData) => {
  const db = clientOrPool || pool;
  const {
    orderId,
    amount,
    currency = 'INR',
    status = 'pending',
    razorpayOrderId = null,
    paymentProvider = 'razorpay',
  } = paymentData;

  const sql = `
    INSERT INTO payments (
      order_id,
      amount,
      currency,
      status,
      razorpay_order_id,
      payment_provider,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    ON CONFLICT (order_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      razorpay_order_id = EXCLUDED.razorpay_order_id,
      payment_provider = EXCLUDED.payment_provider,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, order_id, amount::FLOAT AS amount, currency, status,
              razorpay_order_id, payment_provider, created_at, updated_at;
  `;

  const { rows } = await db.query(sql, [
    orderId,
    amount,
    currency,
    status,
    razorpayOrderId,
    paymentProvider,
  ]);

  return rows[0];
};

/**
 * Find all payment records associated with a specific Razorpay Order ID.
 */
const findPaymentsByRazorpayOrderId = async (razorpayOrderId, clientOrPool) => {
  const db = clientOrPool || pool;
  const sql = `
    SELECT p.id, p.order_id, p.amount::FLOAT AS amount, p.currency, p.status,
           p.razorpay_order_id, p.razorpay_payment_id, p.payment_id, p.created_at, p.updated_at,
           o.user_id, o.vendor_id, o.total_amount::FLOAT AS order_total, o.order_status, o.payment_status AS order_payment_status
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.razorpay_order_id = $1;
  `;
  const { rows } = await db.query(sql, [razorpayOrderId]);
  return rows;
};

/**
 * Find payment record by internal Order UUID.
 */
const findPaymentByOrderId = async (orderId, clientOrPool) => {
  const db = clientOrPool || pool;
  const sql = `
    SELECT p.id, p.order_id, p.amount::FLOAT AS amount, p.currency, p.status,
           p.payment_provider, p.payment_id, p.razorpay_order_id, p.razorpay_payment_id,
           p.razorpay_signature, p.created_at, p.updated_at
    FROM payments p
    WHERE p.order_id = $1;
  `;
  const { rows } = await db.query(sql, [orderId]);
  return rows[0] || null;
};

/**
 * Find payment record by internal Payment UUID.
 */
const findPaymentById = async (id, clientOrPool) => {
  const db = clientOrPool || pool;
  const sql = `
    SELECT p.id, p.order_id, p.amount::FLOAT AS amount, p.currency, p.status,
           p.payment_provider, p.payment_id, p.razorpay_order_id, p.razorpay_payment_id,
           p.created_at, p.updated_at,
           o.user_id, o.vendor_id, o.shipping_address
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.id = $1;
  `;
  const { rows } = await db.query(sql, [id]);
  return rows[0] || null;
};

/**
 * Mark all payment records for a razorpay_order_id as 'paid'.
 */
const markPaymentsPaid = async (client, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const sql = `
    UPDATE payments
    SET status = 'paid',
        payment_id = $2,
        razorpay_payment_id = $2,
        razorpay_signature = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE razorpay_order_id = $1
    RETURNING id, order_id, amount::FLOAT AS amount, status, razorpay_order_id, razorpay_payment_id;
  `;
  const { rows } = await client.query(sql, [razorpayOrderId, razorpayPaymentId, razorpaySignature]);
  return rows;
};

/**
 * Mark payments for a razorpay_order_id as 'failed'.
 */
const markPaymentsFailed = async (client, { razorpayOrderId, paymentId = null }) => {
  const sql = `
    UPDATE payments
    SET status = 'failed',
        payment_id = COALESCE($2, payment_id),
        razorpay_payment_id = COALESCE($2, razorpay_payment_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE razorpay_order_id = $1
    RETURNING id, order_id, amount::FLOAT AS amount, status;
  `;
  const { rows } = await client.query(sql, [razorpayOrderId, paymentId]);
  return rows;
};

/**
 * Update orders payment_status and optionally order_status.
 */
const updateOrdersAfterPayment = async (client, orderIds, paymentStatus, orderStatus = null) => {
  if (!orderIds || orderIds.length === 0) return [];

  let sql = `
    UPDATE orders
    SET payment_status = $1,
        updated_at = CURRENT_TIMESTAMP
  `;
  const params = [paymentStatus];

  if (orderStatus) {
    sql += `, order_status = CASE 
                WHEN order_status = 'pending' THEN $2
                ELSE order_status 
              END`;
    params.push(orderStatus);
    sql += ` WHERE id = ANY($3::uuid[]) RETURNING id, user_id, vendor_id, total_amount, order_status, payment_status;`;
    params.push(orderIds);
  } else {
    sql += ` WHERE id = ANY($2::uuid[]) RETURNING id, user_id, vendor_id, total_amount, order_status, payment_status;`;
    params.push(orderIds);
  }

  const { rows } = await client.query(sql, params);
  return rows;
};

module.exports = {
  withTransaction,
  upsertPayment,
  findPaymentsByRazorpayOrderId,
  findPaymentByOrderId,
  findPaymentById,
  markPaymentsPaid,
  markPaymentsFailed,
  updateOrdersAfterPayment,
};

