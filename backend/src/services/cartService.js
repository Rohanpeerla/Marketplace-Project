const cartModel = require('../models/cartModel');
const redis = require('../config/redis');
const config = require('../config/env');
const { AppError } = require('../utils/appError');

/**
 * Cart business logic.
 * - PostgreSQL is the source of truth (carts / cart_items).
 * - Redis caches the fully built cart under `cart:{userId}` (cache-aside, TTL).
 * - Every successful mutation rebuilds the cart from PostgreSQL and refreshes Redis,
 *   so no stale cart is served after a write.
 * - Redis failures are logged inside the redis service and never fail a cart request.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cartKey = (userId) => `cart:${userId}`;

const round2 = (n) => Math.round(n * 100) / 100;

const assertProductId = (productId) => {
  if (!productId || typeof productId !== 'string' || !UUID_RE.test(productId)) {
    throw new AppError('A valid productId is required', 400);
  }
};

/** Quantity must be a positive integer (rejects 0, negatives, decimals, strings like "2abc"). */
const parseQuantity = (quantity) => {
  const n = typeof quantity === 'string' && /^\d+$/.test(quantity.trim()) ? Number(quantity) : quantity;
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('Quantity must be a positive integer', 400);
  }
  return n;
};

/** Build cart response from PostgreSQL rows using current product prices. */
const buildCartFromDb = async (userId) => {
  const rows = await cartModel.findItemsByUser(userId);

  const items = rows.map((r) => {
    const isAvailable = r.status === 'active' && r.stock >= r.quantity;
    return {
      productId: r.product_id,
      name: r.name,
      price: r.price,
      quantity: r.quantity,
      subtotal: round2(r.price * r.quantity),
      stock: r.stock,
      status: r.status,
      isAvailable,
      image: r.image || null,
      vendor: r.vendor_name || null,
      vendorId: r.vendor_id || null,
    };
  });

  // Group summary for multi-vendor display (single cart, not split)
  const vendorMap = new Map();
  for (const item of items) {
    const key = item.vendorId || 'unknown';
    if (!vendorMap.has(key)) {
      vendorMap.set(key, { vendorId: item.vendorId, vendor: item.vendor, itemCount: 0, subtotal: 0 });
    }
    const v = vendorMap.get(key);
    v.itemCount += item.quantity;
    v.subtotal = round2(v.subtotal + item.subtotal);
  }

  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    uniqueItems: items.length,
    subtotal: round2(items.reduce((sum, i) => sum + i.subtotal, 0)),
    vendors: Array.from(vendorMap.values()),
  };
};

/** Rebuild from PostgreSQL and write-through to Redis. */
const refreshCache = async (userId) => {
  const cart = await buildCartFromDb(userId);
  await redis.setJSON(cartKey(userId), cart, config.cartCacheTtlSeconds);
  return cart;
};

/**
 * GET cart with cache-aside.
 * @returns {Promise<{cart: Object, source: 'cache'|'database'}>}
 */
const getCart = async (userId) => {
  const cached = await redis.getJSON(cartKey(userId));
  if (cached) {
    return { cart: cached, source: 'cache' };
  }
  const cart = await refreshCache(userId);
  return { cart, source: 'database' };
};

/** Validate product availability for the requested final quantity. */
const validateProduct = (product, finalQuantity, currentQuantity = 0) => {
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  if (product.status !== 'active') {
    throw new AppError('This product is not available for purchase', 400);
  }
  if (finalQuantity > product.stock) {
    const remaining = Math.max(product.stock - currentQuantity, 0);
    throw new AppError(
      `Insufficient stock for "${product.name}". Available: ${product.stock}, in your cart: ${currentQuantity}, you can add up to ${remaining} more.`,
      409
    );
  }
};

/** Add product to cart; if already present, quantities are summed. */
const addItem = async (userId, productId, quantity) => {
  assertProductId(productId);
  const qty = parseQuantity(quantity);

  await cartModel.withTransaction(async (client) => {
    const product = await cartModel.findProductForCart(client, productId);
    if (!product) throw new AppError('Product not found', 404);

    const cartId = await cartModel.getOrCreateCartId(client, userId);
    const current = await cartModel.getItemQuantity(client, cartId, productId);
    validateProduct(product, current + qty, current);
    await cartModel.setItemQuantity(client, cartId, productId, current + qty);
  });

  return refreshCache(userId);
};

/** Set absolute quantity for an item already in the cart. */
const updateItem = async (userId, productId, quantity) => {
  assertProductId(productId);
  const qty = parseQuantity(quantity);

  await cartModel.withTransaction(async (client) => {
    const product = await cartModel.findProductForCart(client, productId);
    if (!product) throw new AppError('Product not found', 404);

    const cartId = await cartModel.getOrCreateCartId(client, userId);
    const current = await cartModel.getItemQuantity(client, cartId, productId);
    if (current === 0) {
      throw new AppError('Product is not in your cart', 404);
    }
    if (product.status !== 'active') {
      throw new AppError('This product is not available for purchase', 400);
    }
    if (qty > product.stock) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`,
        409
      );
    }
    await cartModel.setItemQuantity(client, cartId, productId, qty);
  });

  return refreshCache(userId);
};

/** Remove an item; removing a missing item is a no-op that still returns the cart. */
const removeItem = async (userId, productId) => {
  assertProductId(productId);
  const cartId = await cartModel.findCartIdByUser(userId);
  if (cartId) {
    await cartModel.removeItem(cartId, productId);
  }
  return refreshCache(userId);
};

/** Clear all items from PostgreSQL and Redis. */
const clearCart = async (userId) => {
  const cartId = await cartModel.findCartIdByUser(userId);
  if (cartId) {
    await cartModel.clearItems(cartId);
  }
  await redis.del(cartKey(userId));
  return { items: [], itemCount: 0, uniqueItems: 0, subtotal: 0, vendors: [] };
};

module.exports = {
  cartKey,
  buildCartFromDb,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};

