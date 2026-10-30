const { pool, query } = require('../config/db');

/**
 * Cart persistence model (PostgreSQL = source of truth).
 * Reuses existing `carts` and `cart_items` tables from schema.sql.
 */

/** Get existing cart id for user or null. */
const findCartIdByUser = async (userId, client = null) => {
  const runner = client || { query };
  const { rows } = await runner.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  return rows[0] ? rows[0].id : null;
};

/** Get or create the user's cart inside a transaction client. */
const getOrCreateCartId = async (client, userId) => {
  const { rows } = await client.query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [userId]
  );
  return rows[0].id;
};

/**
 * Lock and read a product row (FOR SHARE prevents concurrent deletion while validating).
 */
const findProductForCart = async (client, productId) => {
  const { rows } = await client.query(
    `SELECT id, name, price::FLOAT AS price, stock, status FROM products WHERE id = $1 FOR SHARE`,
    [productId]
  );
  return rows[0] || null;
};

/** Current quantity of product in cart (0 if absent). Locks the row if present. */
const getItemQuantity = async (client, cartId, productId) => {
  const { rows } = await client.query(
    'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 FOR UPDATE',
    [cartId, productId]
  );
  return rows[0] ? rows[0].quantity : 0;
};

/** Upsert absolute quantity for a product. */
const setItemQuantity = async (client, cartId, productId, quantity) => {
  await client.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [cartId, productId, quantity]
  );
};

const removeItem = async (cartId, productId) => {
  const { rowCount } = await query(
    'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, productId]
  );
  return rowCount > 0;
};

const clearItems = async (cartId) => {
  await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
};

/**
 * Read full cart line items joined with CURRENT product, vendor and primary image data.
 * Price always comes from products table, never from client input.
 */
const findItemsByUser = async (userId) => {
  const { rows } = await query(
    `SELECT ci.product_id, ci.quantity, ci.created_at,
            p.name, p.price::FLOAT AS price, p.stock, p.status,
            v.id AS vendor_id, v.business_name AS vendor_name,
            (SELECT pi.image_url FROM product_images pi
              WHERE pi.product_id = p.id
              ORDER BY pi.is_primary DESC, pi.created_at ASC LIMIT 1) AS image
     FROM carts c
     JOIN cart_items ci ON ci.cart_id = c.id
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE c.user_id = $1
     ORDER BY ci.created_at ASC`,
    [userId]
  );
  return rows;
};

/** Run fn(client) inside a PostgreSQL transaction. */
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

module.exports = {
  findCartIdByUser,
  getOrCreateCartId,
  findProductForCart,
  getItemQuantity,
  setItemQuantity,
  removeItem,
  clearItems,
  findItemsByUser,
  withTransaction,
};

