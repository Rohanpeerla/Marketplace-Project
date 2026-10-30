const { query, pool } = require('../config/db');

/**
 * Order persistence model.
 * Interacts directly with PostgreSQL `orders` and `order_items` tables.
 */

/** Helper for 2-decimal arithmetic rounding */
const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Run callback within an isolated PostgreSQL client transaction.
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Find customer orders with pagination, vendor info, and item count.
 */
const findOrdersByCustomer = async (userId, { page = 1, limit = 10 } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const countSql = `SELECT COUNT(*)::INT AS total FROM orders WHERE user_id = $1`;
  const countRes = await query(countSql, [userId]);
  const total = countRes.rows[0].total;

  const sql = `
    SELECT o.id, o.user_id, o.vendor_id, o.total_amount::FLOAT AS total_amount,
           o.payment_status, o.order_status, o.shipping_address,
           o.created_at, o.updated_at,
           v.business_name AS vendor_name,
           (SELECT COUNT(*)::INT FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
    LEFT JOIN vendors v ON v.id = o.vendor_id
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const { rows } = await query(sql, [userId, safeLimit, offset]);

  return {
    orders: rows,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Find single order with full details including line items, product info and vendor info.
 */
const findOrderById = async (orderId, client = null) => {
  const runner = client || { query };
  const sql = `
    SELECT o.id, o.user_id, o.vendor_id, o.total_amount::FLOAT AS total_amount,
           o.discount_amount::FLOAT AS discount_amount,
           o.platform_commission::FLOAT AS platform_commission,
           o.payment_status, o.order_status, o.shipping_address,
           o.created_at, o.updated_at,
           u.name AS customer_name, u.email AS customer_email,
           v.business_name AS vendor_name, v.business_email AS vendor_email,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'productId', oi.product_id,
                 'productName', p.name,
                 'vendorId', oi.vendor_id,
                 'quantity', oi.quantity,
                 'price', oi.price::FLOAT,
                 'subtotal', oi.subtotal::FLOAT,
                 'image', (
                   SELECT pi.image_url FROM product_images pi 
                   WHERE pi.product_id = oi.product_id 
                   ORDER BY pi.is_primary DESC, pi.created_at ASC LIMIT 1
                 )
               ) ORDER BY oi.created_at ASC
             ) FILTER (WHERE oi.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN vendors v ON v.id = o.vendor_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.id = $1
    GROUP BY o.id, u.id, v.id;
  `;
  const { rows } = await runner.query(sql, [orderId]);
  return rows[0] || null;
};

/**
 * Find orders for a vendor.
 */
const findOrdersByVendor = async (vendorId, { page = 1, limit = 10, status } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const params = [vendorId];
  let where = 'WHERE o.vendor_id = $1';
  let paramIdx = 2;

  if (status && status !== 'all') {
    where += ` AND o.order_status = $${paramIdx++}`;
    params.push(status);
  }

  const countSql = `SELECT COUNT(*)::INT AS total FROM orders o ${where}`;
  const countRes = await query(countSql, params);
  const total = countRes.rows[0].total;

  const dataParams = [...params, safeLimit, offset];
  const sql = `
    SELECT o.id, o.user_id, o.vendor_id, o.total_amount::FLOAT AS total_amount,
           o.payment_status, o.order_status, o.shipping_address,
           o.created_at, o.updated_at,
           u.name AS customer_name, u.email AS customer_email,
           (SELECT COUNT(*)::INT FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  const { rows } = await query(sql, dataParams);

  return {
    orders: rows,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Find all platform orders for Admin.
 */
const findAllOrdersAdmin = async ({ page = 1, limit = 15, status, vendorId, customerId } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
  const offset = (safePage - 1) * safeLimit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (status && status !== 'all') {
    conditions.push(`o.order_status = $${paramIdx++}`);
    params.push(status);
  }
  if (vendorId) {
    conditions.push(`o.vendor_id = $${paramIdx++}`);
    params.push(vendorId);
  }
  if (customerId) {
    conditions.push(`o.user_id = $${paramIdx++}`);
    params.push(customerId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::INT AS total FROM orders o ${whereClause}`;
  const countRes = await query(countSql, params);
  const total = countRes.rows[0].total;

  const dataParams = [...params, safeLimit, offset];
  const sql = `
    SELECT o.id, o.user_id, o.vendor_id, o.total_amount::FLOAT AS total_amount,
           o.payment_status, o.order_status, o.shipping_address,
           o.created_at, o.updated_at,
           u.name AS customer_name, u.email AS customer_email,
           v.business_name AS vendor_name,
           (SELECT COUNT(*)::INT FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN vendors v ON v.id = o.vendor_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  const { rows } = await query(sql, dataParams);

  return {
    orders: rows,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

/**
 * Update order status.
 */
const updateOrderStatus = async (orderId, newStatus, client = null) => {
  const runner = client || { query };
  const sql = `
    UPDATE orders 
    SET order_status = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, order_status, updated_at;
  `;
  const { rows } = await runner.query(sql, [newStatus, orderId]);
  return rows[0] || null;
};

/**
 * Lock and retrieve order items for restocking upon cancellation.
 */
const getOrderItemsForRestock = async (client, orderId) => {
  const sql = `
    SELECT product_id, quantity 
    FROM order_items 
    WHERE order_id = $1 
    FOR UPDATE;
  `;
  const { rows } = await client.query(sql, [orderId]);
  return rows;
};

/**
 * Restock product inventory (atomic increment).
 */
const restockProduct = async (client, productId, quantity) => {
  const sql = `
    UPDATE products 
    SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, stock;
  `;
  const { rows } = await client.query(sql, [quantity, productId]);
  return rows[0];
};

/**
 * Deduct product inventory (atomic decrement).
 */
const deductProductStock = async (client, productId, quantity) => {
  const sql = `
    UPDATE products 
    SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, stock;
  `;
  const { rows } = await client.query(sql, [quantity, productId]);
  return rows[0];
};

module.exports = {
  round2,
  withTransaction,
  findOrdersByCustomer,
  findOrderById,
  findOrdersByVendor,
  findAllOrdersAdmin,
  updateOrderStatus,
  getOrderItemsForRestock,
  restockProduct,
  deductProductStock,
};
