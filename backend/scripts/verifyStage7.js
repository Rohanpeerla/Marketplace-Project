#!/usr/bin/env node

/**
 * Stage 7 Verification Suite: Checkout + Order Management
 * Verifies multi-vendor checkout, inventory deduction, rollback on error,
 * Redis cart invalidation, order history/details, cancellation with inventory restoration,
 * vendor/admin isolation, and valid status transitions.
 */

const app = require('../src/app');
const { pool } = require('../src/config/db');
const redis = require('../src/config/redis');
const { esClient } = require('../src/config/elasticsearch');

async function runStage7Tests() {
  console.log('====================================================');
  console.log('🧪 Starting MarketHub Stage 7: Checkout + Orders Test Suite');
  console.log('====================================================\n');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`Ephemeral test server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;
  const perf = {};

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details}`);
      failed++;
    }
  }

  const api = async (method, path, token, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const login = async (email, password) => {
    const res = await api('POST', '/api/auth/login', null, { email, password });
    return res.data;
  };

  const TEMP_CUST2 = 'stage7.cust2@test.com';
  const createdProductIds = [];
  let customer1Token, customer1Id;
  let customer2Token, customer2Id;
  let vendor1Token, vendor1Id, vendor1UserId;
  let vendor2Token, vendor2Id, vendor2UserId;
  let adminToken;

  try {
    // ---------------- Setup ----------------
    console.log('\n--- 0. Authenticating & Setting Up Test Actors ---');
    const cust1 = await login('john.doe@example.com', 'Password123!');
    customer1Token = cust1.token;
    customer1Id = cust1.user.id;

    // Register customer 2 for cross-user isolation tests
    await pool.query('DELETE FROM users WHERE email = $1', [TEMP_CUST2]);
    const regCust2 = await api('POST', '/api/auth/register', null, {
      name: 'Customer Two',
      email: TEMP_CUST2,
      password: 'Password123!',
      role: 'customer',
    });
    customer2Token = regCust2.data.token;
    customer2Id = regCust2.data.user.id;

    // Vendor 1: TechCraft
    const v1Login = await login('techcraft@markethub.com', 'Password123!');
    vendor1Token = v1Login.token;
    vendor1UserId = v1Login.user.id;
    vendor1Id = v1Login.user.vendor.id;

    // Vendor 2: Aura Sound
    const v2Login = await login('aurasound@markethub.com', 'Password123!');
    vendor2Token = v2Login.token;
    vendor2UserId = v2Login.user.id;
    vendor2Id = v2Login.user.vendor.id;

    // Admin
    const adminLogin = await login('admin@markethub.com', 'Password123!');
    adminToken = adminLogin.token;

    assert(!!customer1Token && !!customer2Token, 'Customer tokens acquired (Customer 1 & Customer 2)');
    assert(!!vendor1Token && !!vendor2Token, 'Vendor tokens acquired (TechCraft & AuraSound)');
    assert(!!adminToken, 'Admin token acquired');

    // Create test products for deterministic stock testing
    // Product 1 (Vendor 1, TechCraft, stock: 10, price: 49.99)
    const p1Res = await api('POST', '/api/products', vendor1Token, {
      name: 'Stage7 Keyboard V1',
      description: 'Mechanical keyboard for checkout testing',
      price: 49.99,
      stock: 10,
    });
    const prodV1 = p1Res.data.product;
    createdProductIds.push(prodV1.id);

    // Product 2 (Vendor 2, AuraSound, stock: 5, price: 89.50)
    const p2Res = await api('POST', '/api/products', vendor2Token, {
      name: 'Stage7 Studio Mic V2',
      description: 'Studio condenser microphone for multi-vendor checkout',
      price: 89.50,
      stock: 5,
    });
    const prodV2 = p2Res.data.product;
    createdProductIds.push(prodV2.id);

    assert(!!prodV1?.id && !!prodV2?.id, 'Test products created for Vendor 1 & Vendor 2');

    // ---------------- 1. Role Guard & Validation on Checkout ----------------
    console.log('\n--- 1. Checkout Authentication & Role Guards ---');
    
    // 1a. Unauthenticated checkout rejected
    const unauthRes = await api('POST', '/api/orders/checkout', null, {
      shippingAddress: '123 Test St, Boston, MA',
    });
    assert(unauthRes.status === 401, 'Unauthenticated checkout rejected with 401 Unauthorized');

    // 1b. Vendor role cannot checkout
    const vendorCheckoutRes = await api('POST', '/api/orders/checkout', vendor1Token, {
      shippingAddress: '123 Vendor Way',
    });
    assert(vendorCheckoutRes.status === 403, 'Vendor cannot checkout (403 Forbidden)');

    // 1c. Admin role cannot checkout
    const adminCheckoutRes = await api('POST', '/api/orders/checkout', adminToken, {
      shippingAddress: '123 Admin Way',
    });
    assert(adminCheckoutRes.status === 403, 'Admin cannot checkout (403 Forbidden)');

    // 1d. Empty cart checkout rejected
    await api('DELETE', '/api/cart', customer1Token);
    const emptyCheckoutRes = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '123 Market St, San Francisco, CA',
    });
    assert(emptyCheckoutRes.status === 400 && /empty/i.test(emptyCheckoutRes.data.message), 'Empty cart checkout rejected with 400 Bad Request');

    // 1e. Missing shipping address rejected
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 1 });
    const missingAddrRes = await api('POST', '/api/orders/checkout', customer1Token, {});
    assert(missingAddrRes.status === 400 && /shipping address/i.test(missingAddrRes.data.message), 'Missing shipping address rejected with 400 Bad Request');

    // ---------------- 2. Single-Vendor Checkout & Stock Deduction ----------------
    console.log('\n--- 2. Single-Vendor Checkout & Inventory Deduction ---');
    
    // Customer 1 has prodV1 (quantity: 2) in cart
    await api('PUT', `/api/cart/items/${prodV1.id}`, customer1Token, { quantity: 2 });
    
    const startCheckoutBench = Date.now();
    const singleCheckoutRes = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62704',
      phone: '555-0199',
    });
    perf.checkoutMs = Date.now() - startCheckoutBench;

    assert(singleCheckoutRes.status === 201, 'POST /api/orders/checkout - 201 Created');
    assert(singleCheckoutRes.data.success === true, 'Checkout response contains success: true');
    assert(Array.isArray(singleCheckoutRes.data.orders) && singleCheckoutRes.data.orders.length === 1, 'Single-vendor cart creates exactly 1 order');

    const singleOrder = singleCheckoutRes.data.orders[0];
    assert(singleOrder.vendorId === vendor1Id, 'Order is associated with correct vendor');
    assert(Number(singleOrder.total) === 49.99 * 2, `Order total calculated correctly on server ($${singleOrder.total})`);
    assert(singleOrder.status === 'pending', 'Initial order status is "pending"');

    // Check stock deduction in PostgreSQL
    const { rows: stockAfter1 } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV1.id]);
    assert(stockAfter1[0].stock === 8, `Product stock deducted from 10 to 8 (purchased 2)`);

    // Check cart cleared in PostgreSQL and Redis
    const { rows: cartRowsAfter1 } = await pool.query(
      'SELECT ci.* FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1',
      [customer1Id]
    );
    assert(cartRowsAfter1.length === 0, 'Customer cart cleared in PostgreSQL after successful checkout');

    const redisCartAfter1 = await redis.getJSON(`cart:${customer1Id}`);
    assert(!redisCartAfter1, 'Redis cart cache invalidated after successful checkout');

    // ---------------- 3. Multi-Vendor Checkout ----------------
    console.log('\n--- 3. Multi-Vendor Checkout (1 Order Per Vendor) ---');
    
    // Customer 1 adds prodV1 (Vendor 1, qty: 3, price: 49.99) and prodV2 (Vendor 2, qty: 2, price: 89.50)
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 3 });
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV2.id, quantity: 2 });

    const multiCheckoutRes = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '100 Market Hub Plaza, Suite 400',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      phone: '206-555-0142',
    });

    assert(multiCheckoutRes.status === 201, 'Multi-vendor checkout returns 201 Created');
    assert(multiCheckoutRes.data.orders.length === 2, 'Multi-vendor cart creates exactly 2 distinct vendor orders');

    const orderV1 = multiCheckoutRes.data.orders.find((o) => o.vendorId === vendor1Id);
    const orderV2 = multiCheckoutRes.data.orders.find((o) => o.vendorId === vendor2Id);

    assert(!!orderV1 && !!orderV2, 'Orders correctly partitioned across Vendor 1 and Vendor 2');
    assert(Number(orderV1.total) === Math.round(49.99 * 3 * 100) / 100, `Vendor 1 order total correct ($${orderV1.total})`);
    assert(Number(orderV2.total) === Math.round(89.50 * 2 * 100) / 100, `Vendor 2 order total correct ($${orderV2.total})`);

    // Verify stock deduction for both vendors
    const { rows: stockAfterMultiV1 } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV1.id]);
    const { rows: stockAfterMultiV2 } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV2.id]);
    assert(stockAfterMultiV1[0].stock === 5, 'Vendor 1 product stock decremented: 8 - 3 = 5');
    assert(stockAfterMultiV2[0].stock === 3, 'Vendor 2 product stock decremented: 5 - 2 = 3');

    // ---------------- 4. Historical Pricing Integrity ----------------
    console.log('\n--- 4. Purchase-Time Historical Price Integrity ---');
    
    // Change current product price in PostgreSQL
    await pool.query('UPDATE products SET price = 999.99 WHERE id = $1', [prodV1.id]);

    // Check that historical order items still retain the purchase price of 49.99
    const orderDetailsRes = await api('GET', `/api/orders/${orderV1.id}`, customer1Token);
    assert(orderDetailsRes.status === 200, 'GET /api/orders/:id returns 200 OK');
    const purchasedItem = orderDetailsRes.data.order.items.find((i) => i.productId === prodV1.id);
    assert(
      Number(purchasedItem.price) === 49.99,
      `Historical purchase-time price preserved at $49.99 (even though current price is now $999.99)`
    );

    // Revert product price
    await pool.query('UPDATE products SET price = 49.99 WHERE id = $1', [prodV1.id]);

    // ---------------- 5. Stock Validation & Rollback on Error ----------------
    console.log('\n--- 5. Inventory Protection & Atomic Rollback ---');
    
    // prodV2 currently has stock = 3. Customer 1 adds quantity = 4 (insufficient stock)
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 1 });
    // Manually force an overstock item into cart_items to test backend checkout validation resilience
    const { rows: c1Cart } = await pool.query('SELECT id FROM carts WHERE user_id = $1', [customer1Id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, 4) ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = 4', [c1Cart[0].id, prodV2.id]);

    const overstockRes = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '999 Fail Safe Rd',
    });
    assert(overstockRes.status === 409, 'Overstock checkout rejected with 409 Conflict');
    assert(/insufficient stock/i.test(overstockRes.data.message), 'Error indicates insufficient stock for the product');

    // Verify atomic rollback: prodV1 stock must NOT have decreased, cart must remain intact
    const { rows: stockAfterFailV1 } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV1.id]);
    assert(stockAfterFailV1[0].stock === 5, 'Failed checkout rolled back: prodV1 stock untouched (5)');

    const { rows: cartAfterFail } = await pool.query('SELECT COUNT(*)::INT AS count FROM cart_items WHERE cart_id = $1', [c1Cart[0].id]);
    assert(cartAfterFail[0].count === 2, 'Failed checkout rolled back: customer cart preserved intact');

    // Clean up customer 1 cart
    await api('DELETE', '/api/cart', customer1Token);

    // ---------------- 6. Customer Order History & Isolation ----------------
    console.log('\n--- 6. Customer Order History & Isolation ---');
    
    const startHistoryBench = Date.now();
    const cust1OrdersRes = await api('GET', '/api/orders', customer1Token);
    perf.historyMs = Date.now() - startHistoryBench;

    assert(cust1OrdersRes.status === 200, 'GET /api/orders returns 200 OK');
    assert(cust1OrdersRes.data.orders.length >= 3, `Customer 1 sees their placed orders (${cust1OrdersRes.data.orders.length})`);
    assert(
      cust1OrdersRes.data.orders.every((o) => o.user_id === customer1Id),
      'Customer 1 order history contains ONLY orders belonging to Customer 1'
    );

    // Customer 2 views their order history
    const cust2OrdersRes = await api('GET', '/api/orders', customer2Token);
    assert(cust2OrdersRes.status === 200 && cust2OrdersRes.data.orders.length === 0, 'Customer 2 sees 0 orders (proper customer isolation)');

    // Customer 2 attempts to view Customer 1 order details
    const crossOrderViewRes = await api('GET', `/api/orders/${orderV1.id}`, customer2Token);
    assert(crossOrderViewRes.status === 403, 'Customer 2 viewing Customer 1 order rejected with 403 Forbidden');

    // Customer 2 attempts to cancel Customer 1 order
    const crossOrderCancelRes = await api('PUT', `/api/orders/${orderV1.id}/cancel`, customer2Token);
    assert(crossOrderCancelRes.status === 403, 'Customer 2 cancelling Customer 1 order rejected with 403 Forbidden');

    // ---------------- 7. Order Cancellation & Stock Restoration ----------------
    console.log('\n--- 7. Order Cancellation & Inventory Restoration ---');
    
    // Check stock of prodV2 before cancellation (currently 3)
    const { rows: stockBeforeCancel } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV2.id]);
    assert(stockBeforeCancel[0].stock === 3, 'Current prodV2 stock is 3');

    // Cancel orderV2 (contains 2 of prodV2)
    const cancelRes = await api('PUT', `/api/orders/${orderV2.id}/cancel`, customer1Token);
    assert(cancelRes.status === 200, 'PUT /api/orders/:id/cancel returns 200 OK');
    assert(cancelRes.data.order.order_status === 'cancelled', 'Order status updated to "cancelled"');

    // Verify stock restored in PostgreSQL: 3 + 2 = 5
    const { rows: stockAfterCancel } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV2.id]);
    assert(stockAfterCancel[0].stock === 5, 'Inventory restored: prodV2 stock increased back to 5');

    // Duplicate cancellation attempt rejected
    const dupCancelRes = await api('PUT', `/api/orders/${orderV2.id}/cancel`, customer1Token);
    assert(dupCancelRes.status === 409, 'Duplicate cancellation attempt rejected with 409 Conflict');

    // Verify duplicate cancellation did NOT double-restore stock
    const { rows: stockAfterDupCancel } = await pool.query('SELECT stock FROM products WHERE id = $1', [prodV2.id]);
    assert(stockAfterDupCancel[0].stock === 5, 'Duplicate cancellation did not restore stock twice (remains 5)');

    // ---------------- 8. Vendor Order Management & Isolation ----------------
    console.log('\n--- 8. Vendor Order Management & Isolation ---');
    
    // Vendor 1 views their orders
    const v1OrdersRes = await api('GET', '/api/vendor/orders', vendor1Token);
    assert(v1OrdersRes.status === 200, 'GET /api/vendor/orders returns 200 OK');
    assert(
      v1OrdersRes.data.orders.every((o) => o.vendor_id === vendor1Id),
      'Vendor 1 sees ONLY orders belonging to Vendor 1'
    );

    // Vendor 2 views their orders
    const v2OrdersRes = await api('GET', '/api/vendor/orders', vendor2Token);
    assert(v2OrdersRes.status === 200, 'GET /api/vendor/orders returns 200 OK for Vendor 2');
    assert(
      v2OrdersRes.data.orders.every((o) => o.vendor_id === vendor2Id),
      'Vendor 2 sees ONLY orders belonging to Vendor 2'
    );

    // Vendor 2 attempts to view Vendor 1's order
    const crossVendorViewRes = await api('GET', `/api/vendor/orders/${orderV1.id}`, vendor2Token);
    assert(crossVendorViewRes.status === 403, 'Vendor 2 viewing Vendor 1 order rejected with 403 Forbidden');

    // Vendor 2 attempts to update Vendor 1's order status
    const crossVendorUpdateRes = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor2Token, {
      status: 'shipped',
    });
    assert(crossVendorUpdateRes.status === 403, 'Vendor 2 updating Vendor 1 order rejected with 403 Forbidden');

    // ---------------- 9. Vendor Status Lifecycle Transitions ----------------
    console.log('\n--- 9. Order Status Transitions & Verification ---');
    
    // orderV1 is currently 'pending'. Allowed next: 'confirmed', 'processing', 'cancelled'.
    // Test invalid transition jump: pending -> delivered (rejected)
    const invalidJumpRes = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor1Token, {
      status: 'delivered',
    });
    assert(invalidJumpRes.status === 400, 'Invalid status jump (pending -> delivered) rejected with 400 Bad Request');

    // Valid transition: pending -> confirmed
    const step1 = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor1Token, { status: 'confirmed' });
    assert(step1.status === 200 && step1.data.order.order_status === 'confirmed', 'Vendor updates: pending -> confirmed (200 OK)');

    // Valid transition: confirmed -> processing
    const step2 = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor1Token, { status: 'processing' });
    assert(step2.status === 200 && step2.data.order.order_status === 'processing', 'Vendor updates: confirmed -> processing (200 OK)');

    // Now that order is in 'processing', customer can NO LONGER cancel it
    const lateCancelRes = await api('PUT', `/api/orders/${orderV1.id}/cancel`, customer1Token);
    assert(lateCancelRes.status === 409, 'Customer cannot cancel order in "processing" status (409 Conflict)');

    // Valid transition: processing -> shipped
    const step3 = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor1Token, { status: 'shipped' });
    assert(step3.status === 200 && step3.data.order.order_status === 'shipped', 'Vendor updates: processing -> shipped (200 OK)');

    // Valid transition: shipped -> delivered
    const step4 = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor1Token, { status: 'delivered' });
    assert(step4.status === 200 && step4.data.order.order_status === 'delivered', 'Vendor updates: shipped -> delivered (200 OK)');

    // Terminal state: delivered -> anything (rejected)
    const afterDeliveredRes = await api('PUT', `/api/vendor/orders/${orderV1.id}/status`, vendor1Token, { status: 'pending' });
    assert(afterDeliveredRes.status === 400, 'Terminal status "delivered" permits no further transitions (400 Bad Request)');

    // ---------------- 10. Admin Order Management ----------------
    console.log('\n--- 10. Admin Order Management ---');
    
    // Customer cannot view admin orders endpoint
    const custAdminRes = await api('GET', '/api/admin/orders', customer1Token);
    assert(custAdminRes.status === 403, 'Customer accessing /api/admin/orders rejected with 403 Forbidden');

    // Vendor cannot view admin orders endpoint
    const vendorAdminRes = await api('GET', '/api/admin/orders', vendor1Token);
    assert(vendorAdminRes.status === 403, 'Vendor accessing /api/admin/orders rejected with 403 Forbidden');

    // Admin views all orders across the marketplace
    const adminOrdersRes = await api('GET', '/api/admin/orders', adminToken);
    assert(adminOrdersRes.status === 200, 'GET /api/admin/orders returns 200 OK for Admin');
    assert(adminOrdersRes.data.orders.length >= 3, 'Admin sees all marketplace orders across all vendors');

    // Admin views single order details
    const startDetailBench = Date.now();
    const adminOrderDetailRes = await api('GET', `/api/admin/orders/${orderV1.id}`, adminToken);
    perf.detailMs = Date.now() - startDetailBench;

    assert(adminOrderDetailRes.status === 200, 'GET /api/admin/orders/:id returns 200 OK with full order details');
    assert(
      !!adminOrderDetailRes.data.order.customer_name && !!adminOrderDetailRes.data.order.vendor_name,
      'Admin order detail contains customer name and vendor name'
    );

    // ---------------- 11. Performance Benchmarks ----------------
    console.log('\n--- 11. Latency & Performance Benchmarks ---');
    assert(perf.checkoutMs < 500, `Checkout latency: ${perf.checkoutMs}ms (< 500ms target)`);
    assert(perf.historyMs < 200, `Order history latency: ${perf.historyMs}ms (< 200ms target)`);
    assert(perf.detailMs < 200, `Order detail latency: ${perf.detailMs}ms (< 200ms target)`);

    // ---------------- 12. Regression Integrity (Stages 1-6) ----------------
    console.log('\n--- 12. Regression Integrity Check ---');
    const healthDb = await api('GET', '/api/health/db');
    assert(healthDb.status === 200 && healthDb.data.database === 'connected', 'Database health intact');

    const healthRedis = await api('GET', '/api/health/redis');
    assert(healthRedis.status === 200 && healthRedis.data.redis === 'connected', 'Redis health intact');

    const healthSearch = await api('GET', '/api/health/search');
    assert(healthSearch.status === 200 && healthSearch.data.search === 'connected', 'Search health intact');

    const searchRes = await api('GET', '/api/search/products?q=keyboard');
    assert(searchRes.status === 200, 'Elasticsearch search continues working');

    const cartRes = await api('GET', '/api/cart', customer1Token);
    assert(cartRes.status === 200, 'Redis shopping cart continues working');

  } catch (err) {
    console.error('Unexpected error in Stage 7 test suite:', err);
    failed++;
  } finally {
    // Teardown temporary test records
    try {
      if (customer2Id) {
        await pool.query('DELETE FROM users WHERE id = $1', [customer2Id]);
      }
      for (const pid of createdProductIds) {
        await pool.query('DELETE FROM order_items WHERE product_id = $1', [pid]);
        await pool.query('DELETE FROM products WHERE id = $1', [pid]);
      }
      if (customer1Id) {
        await redis.del(`cart:${customer1Id}`);
      }
    } catch (_) {}
    server.close();
    await redis.disconnect();
    await pool.end();
    await esClient.close().catch(() => {});
  }

  console.log('\n====================================================');
  console.log(`Stage 7 Test Results: Total Passed: ${passed}, Total Failed: ${failed}`);
  console.log('====================================================\n');

  if (perf.checkoutMs !== undefined) {
    console.log('--- Measured Local Performance ---');
    console.log(`  Checkout API response time:     ${perf.checkoutMs} ms`);
    console.log(`  Order history response time:    ${perf.historyMs} ms`);
    console.log(`  Order detail response time:     ${perf.detailMs} ms\n`);
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStage7Tests();

