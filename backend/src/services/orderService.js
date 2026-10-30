const orderModel = require('../models/orderModel');
const { vendorModel } = require('../models');
const redis = require('../config/redis');
const searchService = require('./searchService');
const { AppError } = require('../utils/appError');

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const cartKey = (userId) => `cart:${userId}`;

/**
 * Valid order status transitions.
 * Prevents arbitrary status jumps (e.g. delivered -> pending).
 */
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'processing', 'cancelled'],
  placed: ['confirmed', 'processing', 'packed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Statuses from which a customer is permitted to cancel their order.
 */
const CANCELLABLE_STATUSES = ['pending', 'placed', 'confirmed'];

/**
 * Process multi-vendor checkout as an atomic PostgreSQL transaction.
 * 1. Validates and formats shipping information.
 * 2. Locks cart and products for update (preventing overselling).
 * 3. Verifies stock, active status, and takes authoritative prices from PostgreSQL.
 * 4. Groups items by vendor and creates one order per vendor.
 * 5. Deducts inventory atomically.
 * 6. Clears customer cart in PostgreSQL and invalidates Redis cache.
 * 7. Synchronizes updated stock to Elasticsearch.
 */
const checkout = async (userId, shippingData = {}) => {
  const {
    shippingAddress,
    address,
    city,
    state,
    postalCode,
    phone,
  } = shippingData;

  // Format shipping address string
  const resolvedAddress = shippingAddress || address;
  if (!resolvedAddress || typeof resolvedAddress !== 'string' || !resolvedAddress.trim()) {
    throw new AppError('Shipping address is required for checkout', 400);
  }

  const addressParts = [resolvedAddress.trim()];
  if (city && typeof city === 'string' && city.trim()) addressParts.push(city.trim());
  if (state && typeof state === 'string' && state.trim()) addressParts.push(state.trim());
  if (postalCode && typeof postalCode === 'string' && postalCode.trim()) addressParts.push(`Postal: ${postalCode.trim()}`);
  if (phone && typeof phone === 'string' && phone.trim()) addressParts.push(`Phone: ${phone.trim()}`);
  const fullShippingAddress = addressParts.join(', ');

  const result = await orderModel.withTransaction(async (client) => {
    // 1. Retrieve cart items for the customer
    const cartSql = `
      SELECT ci.product_id, ci.quantity, c.id AS cart_id
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      WHERE c.user_id = $1;
    `;
    const { rows: cartRows } = await client.query(cartSql, [userId]);

    if (!cartRows || cartRows.length === 0) {
      throw new AppError('Your cart is empty', 400);
    }

    const cartId = cartRows[0].cart_id;

    // 2. Sort product IDs to prevent deadlock when locking multiple rows
    const sortedCart = [...cartRows].sort((a, b) => a.product_id.localeCompare(b.product_id));

    // 3. Lock products and validate stock and prices server-side
    const validatedItems = [];
    for (const item of sortedCart) {
      const prodSql = `
        SELECT p.id, p.vendor_id, p.name, p.price::FLOAT AS price, p.stock, p.status,
               v.business_name AS vendor_name
        FROM products p
        LEFT JOIN vendors v ON v.id = p.vendor_id
        WHERE p.id = $1
        FOR UPDATE OF p;
      `;
      const { rows: prodRows } = await client.query(prodSql, [item.product_id]);
      const product = prodRows[0];

      if (!product) {
        throw new AppError(`Product not found: ${item.product_id}`, 404);
      }
      if (product.status !== 'active') {
        throw new AppError(`Product "${product.name}" is no longer active for purchase`, 400);
      }
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for product: ${product.name}`, 409);
      }

      validatedItems.push({
        productId: product.id,
        vendorId: product.vendor_id,
        vendorName: product.vendor_name || 'Independent Merchant',
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: round2(product.price * item.quantity),
      });
    }

    // 4. Group items by vendor (multi-vendor cart partition)
    const vendorGroups = new Map();
    for (const item of validatedItems) {
      if (!vendorGroups.has(item.vendorId)) {
        vendorGroups.set(item.vendorId, {
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          items: [],
          totalAmount: 0,
        });
      }
      const group = vendorGroups.get(item.vendorId);
      group.items.push(item);
      group.totalAmount = round2(group.totalAmount + item.subtotal);
    }

    // 5. Create one order per vendor and deduct stock
    const createdOrders = [];
    for (const group of vendorGroups.values()) {
      const orderInsertSql = `
        INSERT INTO orders (user_id, vendor_id, total_amount, shipping_address, order_status, payment_status)
        VALUES ($1, $2, $3, $4, 'pending', 'pending')
        RETURNING id, user_id, vendor_id, total_amount::FLOAT AS total_amount, order_status, payment_status, created_at;
      `;
      const { rows: orderRows } = await client.query(orderInsertSql, [
        userId,
        group.vendorId,
        group.totalAmount,
        fullShippingAddress,
      ]);
      const newOrder = orderRows[0];

      // Insert line items
      const createdItems = [];
      for (const item of group.items) {
        const itemSql = `
          INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, order_id, product_id, vendor_id, quantity, price::FLOAT AS price, subtotal::FLOAT AS subtotal;
        `;
        const { rows: itemRows } = await client.query(itemSql, [
          newOrder.id,
          item.productId,
          group.vendorId,
          item.quantity,
          item.price,
          item.subtotal,
        ]);
        createdItems.push({
          ...itemRows[0],
          productName: item.name,
        });

        // Deduct inventory
        await orderModel.deductProductStock(client, item.productId, item.quantity);
      }

      createdOrders.push({
        id: newOrder.id,
        vendorId: newOrder.vendor_id,
        vendorName: group.vendorName,
        total: newOrder.total_amount,
        status: newOrder.order_status,
        createdAt: newOrder.created_at,
        itemCount: createdItems.reduce((acc, i) => acc + i.quantity, 0),
        items: createdItems,
      });
    }

    // 6. Clear customer cart items in PostgreSQL
    await client.query('DELETE FROM cart_items WHERE cart_id = $1;', [cartId]);

    return {
      orders: createdOrders,
      touchedProductIds: validatedItems.map((i) => i.productId),
    };
  });

  // Post-commit step 1: Invalidate Redis cart cache (soft-fail if Redis is down)
  try {
    await redis.del(cartKey(userId));
  } catch (err) {
    console.warn(`[Redis Cart Invalidation] Could not delete cart for user ${userId}:`, err.message);
  }

  // Post-commit step 2: Synchronize updated product stock to Elasticsearch asynchronously
  Promise.all(
    result.touchedProductIds.map((pid) =>
      searchService.indexProduct(pid).catch((err) => {
        console.warn(`[Elasticsearch Stock Sync] Could not reindex product ${pid}:`, err.message);
      })
    )
  ).catch(() => {});

  return {
    success: true,
    message: 'Order placed successfully',
    orders: result.orders,
  };
};

/**
 * Customer Order History.
 */
const getCustomerOrders = async (userId, queryOptions) => {
  return orderModel.findOrdersByCustomer(userId, queryOptions);
};

/**
 * Customer Order Details (strictly checks customer ownership).
 */
const getCustomerOrderById = async (userId, orderId) => {
  const order = await orderModel.findOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.user_id !== userId) {
    throw new AppError('You are not authorized to view this order', 403);
  }
  return order;
};

/**
 * Customer Order Cancellation & Inventory Restoration.
 */
const cancelOrder = async (userId, orderId) => {
  const result = await orderModel.withTransaction(async (client) => {
    // 1. Lock order row
    const lockSql = `SELECT * FROM orders WHERE id = $1 FOR UPDATE;`;
    const { rows: orderRows } = await client.query(lockSql, [orderId]);
    const order = orderRows[0];

    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.user_id !== userId) {
      throw new AppError('You are not authorized to cancel this order', 403);
    }
    if (order.order_status === 'cancelled') {
      throw new AppError('Order is already cancelled', 409);
    }
    if (!CANCELLABLE_STATUSES.includes(order.order_status)) {
      throw new AppError(`Cannot cancel order in "${order.order_status}" status. Only pending or confirmed orders can be cancelled.`, 409);
    }

    // 2. Lock order items and restore inventory
    const items = await orderModel.getOrderItemsForRestock(client, orderId);
    for (const item of items) {
      await orderModel.restockProduct(client, item.product_id, item.quantity);
    }

    // 3. Update order status
    await orderModel.updateOrderStatus(orderId, 'cancelled', client);

    return {
      orderId,
      restockedProductIds: items.map((i) => i.product_id),
    };
  });

  // Post-commit: Sync restored stock to Elasticsearch asynchronously
  Promise.all(
    result.restockedProductIds.map((pid) =>
      searchService.indexProduct(pid).catch((err) => {
        console.warn(`[Elasticsearch Restock Sync] Could not reindex product ${pid}:`, err.message);
      })
    )
  ).catch(() => {});

  return orderModel.findOrderById(orderId);
};

/**
 * Vendor Orders List (isolated to authenticated vendor).
 */
const getVendorOrders = async (user, queryOptions) => {
  const vendor = await vendorModel.findByUserId(user.id);
  if (!vendor) {
    throw new AppError('Vendor profile not found for this account', 404);
  }
  return orderModel.findOrdersByVendor(vendor.id, queryOptions);
};

/**
 * Vendor Order Details.
 */
const getVendorOrderById = async (user, orderId) => {
  const vendor = await vendorModel.findByUserId(user.id);
  if (!vendor) {
    throw new AppError('Vendor profile not found for this account', 404);
  }
  const order = await orderModel.findOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.vendor_id !== vendor.id) {
    throw new AppError('You are not authorized to view this order', 403);
  }
  return order;
};

/**
 * Vendor Order Status Update.
 */
const updateVendorOrderStatus = async (user, orderId, newStatus) => {
  if (!newStatus || typeof newStatus !== 'string') {
    throw new AppError('Target status is required', 400);
  }
  const targetStatus = newStatus.trim().toLowerCase();

  const vendor = await vendorModel.findByUserId(user.id);
  if (!vendor) {
    throw new AppError('Vendor profile not found for this account', 404);
  }

  const result = await orderModel.withTransaction(async (client) => {
    const lockSql = `SELECT * FROM orders WHERE id = $1 FOR UPDATE;`;
    const { rows: orderRows } = await client.query(lockSql, [orderId]);
    const order = orderRows[0];

    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.vendor_id !== vendor.id) {
      throw new AppError('You are not authorized to modify this order', 403);
    }

    const currentStatus = order.order_status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed next statuses: [${allowed.join(', ')}]`,
        400
      );
    }

    // If cancelled by vendor, restore stock
    let restockedProductIds = [];
    if (targetStatus === 'cancelled' && currentStatus !== 'cancelled') {
      const items = await orderModel.getOrderItemsForRestock(client, orderId);
      for (const item of items) {
        await orderModel.restockProduct(client, item.product_id, item.quantity);
      }
      restockedProductIds = items.map((i) => i.product_id);
    }

    await orderModel.updateOrderStatus(orderId, targetStatus, client);

    return { restockedProductIds };
  });

  // Post-commit stock sync if cancelled
  for (const pid of result.restockedProductIds) {
    try {
      await searchService.indexProduct(pid);
    } catch (_) {}
  }

  return orderModel.findOrderById(orderId);
};

/**
 * Admin: Get all orders across the marketplace.
 */
const getAdminOrders = async (queryOptions) => {
  return orderModel.findAllOrdersAdmin(queryOptions);
};

/**
 * Admin: Get order details.
 */
const getAdminOrderById = async (orderId) => {
  const order = await orderModel.findOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  return order;
};

module.exports = {
  VALID_TRANSITIONS,
  CANCELLABLE_STATUSES,
  checkout,
  getCustomerOrders,
  getCustomerOrderById,
  cancelOrder,
  getVendorOrders,
  getVendorOrderById,
  updateVendorOrderStatus,
  getAdminOrders,
  getAdminOrderById,
};
