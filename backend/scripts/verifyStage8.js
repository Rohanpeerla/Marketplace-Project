const http = require('http');
const crypto = require('crypto');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const redis = require('../src/config/redis');
const config = require('../src/config/env');
const { generateTestSignature } = require('../src/config/razorpay');

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function api(method, endpoint, token = null, body = null) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  return { status: res.status, data };
}

async function runStage8Tests() {
  console.log('====================================================');
  console.log('🧪 Starting MarketHub Stage 8: Razorpay Payment Test Suite');
  console.log('====================================================\n');

  try {
    // ---------------- 0. Authentication & Actors ----------------
    console.log('--- 0. Authenticating & Setting Up Test Actors ---');
    const cust1Res = await api('POST', '/api/auth/login', null, {
      email: 'john.doe@example.com',
      password: 'Password123!',
    });
    const customer1Token = cust1Res.data.token;
    const customer1Id = cust1Res.data.user.id;

    // Register Customer 2
    const cust2Email = `cust2_${Date.now()}@example.com`;
    const cust2Reg = await api('POST', '/api/auth/register', null, {
      name: 'Customer Two',
      email: cust2Email,
      password: 'Password123!',
      role: 'customer',
    });
    const customer2Token = cust2Reg.data.token;
    const customer2Id = cust2Reg.data.user.id;

    // Vendor Login
    const v1Res = await api('POST', '/api/auth/login', null, {
      email: 'techcraft@markethub.com',
      password: 'Password123!',
    });
    const vendor1Token = v1Res.data.token;
    const vendor1Id = v1Res.data.user.vendor.id;

    // Vendor 2 Login
    const v2Res = await api('POST', '/api/auth/login', null, {
      email: 'aurasound@markethub.com',
      password: 'Password123!',
    });
    const vendor2Token = v2Res.data.token;
    const vendor2Id = v2Res.data.user.vendor.id;

    // Admin Login
    const adminRes = await api('POST', '/api/auth/login', null, {
      email: 'admin@markethub.com',
      password: 'Password123!',
    });
    const adminToken = adminRes.data.token;

    assert(customer1Token && customer2Token, 'Customer tokens acquired (Customer 1 & 2)');
    assert(vendor1Token && vendor2Token, 'Vendor tokens acquired (Vendor 1 & 2)');
    assert(adminToken, 'Admin token acquired');

    // Create active products for test orders
    const prod1Res = await api('POST', '/api/products', vendor1Token, {
      name: `Rzp Product V1 ${Date.now()}`,
      description: 'Test product for Razorpay',
      price: 150.0,
      stock: 20,
      status: 'active',
    });
    const prodV1 = prod1Res.data.product;

    const prod2Res = await api('POST', '/api/products', vendor2Token, {
      name: `Rzp Product V2 ${Date.now()}`,
      description: 'Test product 2 for Razorpay',
      price: 250.0,
      stock: 20,
      status: 'active',
    });
    const prodV2 = prod2Res.data.product;

    assert(prodV1 && prodV2, 'Test products created for Vendor 1 & 2');

    // ---------------- 1. Authentication & Role Guards ----------------
    console.log('\n--- 1. Payment API Role & Authentication Guards ---');
    const unauthOrder = await api('POST', '/api/payments/create-order', null, {
      orderIds: ['d3b07384-d113-40e9-b5f7-66a7b7a5a871'],
    });
    assert(unauthOrder.status === 401, 'Unauthenticated payment order rejected with 401 Unauthorized');

    const vendorPayment = await api('POST', '/api/payments/create-order', vendor1Token, {
      orderIds: ['d3b07384-d113-40e9-b5f7-66a7b7a5a871'],
    });
    assert(vendorPayment.status === 403, 'Vendor cannot initiate customer payment (403 Forbidden)');

    const adminPayment = await api('POST', '/api/payments/create-order', adminToken, {
      orderIds: ['d3b07384-d113-40e9-b5f7-66a7b7a5a871'],
    });
    assert(adminPayment.status === 403, 'Admin cannot initiate customer payment (403 Forbidden)');

    const missingOrderIds = await api('POST', '/api/payments/create-order', customer1Token, {});
    assert(missingOrderIds.status === 400, 'Missing orderIds rejected with 400 Bad Request');

    const nonExistentOrder = await api('POST', '/api/payments/create-order', customer1Token, {
      orderIds: ['a0000000-0000-0000-0000-000000000000'],
    });
    assert(nonExistentOrder.status === 404, 'Non-existent orderId rejected with 404 Not Found');

    // ---------------- 2. Single-Vendor Razorpay Payment Order Creation ----------------
    console.log('\n--- 2. Single-Vendor Razorpay Payment Order Creation ---');
    // Customer 1 places order for prodV1 (qty: 2 => total: 300.00)
    await api('DELETE', '/api/cart', customer1Token);
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 2 });
    const checkout1 = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '101 Silicon Valley Way',
      city: 'San Jose',
      state: 'CA',
      postalCode: '95126',
    });
    assert(checkout1.status === 201, 'Customer 1 checkout creates order');
    const order1 = checkout1.data.orders[0];
    assert(order1 && order1.total === 300.0, 'Order 1 total calculated at $300.00');

    // Create Razorpay payment order
    const startCreateBench = Date.now();
    const createRes1 = await api('POST', '/api/payments/create-order', customer1Token, {
      orderIds: [order1.id],
    });
    const createMs = Date.now() - startCreateBench;

    assert(createRes1.status === 201, 'POST /api/payments/create-order returns 201 Created');
    assert(createRes1.data.success === true, 'Response contains success: true');
    assert(typeof createRes1.data.razorpayOrderId === 'string' && createRes1.data.razorpayOrderId.startsWith('order_'), 'razorpayOrderId format valid (order_...)');
    assert(createRes1.data.amount === 30000, `Amount in paise calculated correctly (300.00 * 100 = ${createRes1.data.amount} paise)`);
    assert(createRes1.data.currency === 'INR', 'Currency is INR');
    assert(!!createRes1.data.keyId, 'Returns public keyId for frontend Razorpay checkout');
    assert(!createRes1.data.keySecret && !createRes1.data.razorpayKeySecret, 'CRITICAL: Secret key NEVER exposed in response');

    const rzpOrderId1 = createRes1.data.razorpayOrderId;

    // Verify payments table record in PostgreSQL
    const { rows: payRows1 } = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1',
      [order1.id]
    );
    assert(payRows1.length === 1, 'Payment record inserted into PostgreSQL payments table');
    assert(payRows1[0].razorpay_order_id === rzpOrderId1, 'Payment record stores razorpay_order_id');
    assert(payRows1[0].status === 'created' || payRows1[0].status === 'pending', 'Payment record status is created/pending');
    assert(Number(payRows1[0].amount) === 300.0, 'Payment record stores exact database order total');

    // ---------------- 3. Server-Side Amount Calculation (Tamper Protection) ----------------
    console.log('\n--- 3. Client Amount Tamper Protection ---');
    // Create new order
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 1 });
    const checkoutTamper = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '101 Silicon Valley Way',
    });
    const orderTamper = checkoutTamper.data.orders[0];

    // Client attempts to send fake amount: 1 paisa ($0.01) instead of $150
    const tamperRes = await api('POST', '/api/payments/create-order', customer1Token, {
      orderIds: [orderTamper.id],
      amount: 1, // Malicious client attempt
    });
    assert(tamperRes.status === 201, 'Create payment succeeds');
    assert(tamperRes.data.amount === 15000, 'Tampered amount safely ignored; backend calculated 15000 paise from database');

    // ---------------- 4. Multi-Vendor Order Payment (Unified Platform Payment) ----------------
    console.log('\n--- 4. Multi-Vendor Order Payment (Unified Platform Payment) ---');
    // Customer 1 adds prodV1 ($150) and prodV2 ($250)
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 1 });
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV2.id, quantity: 1 });
    const multiCheckout = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '101 Silicon Valley Way',
    });
    assert(multiCheckout.data.orders.length === 2, 'Multi-vendor checkout creates 2 vendor orders');
    const multiOrder1 = multiCheckout.data.orders[0];
    const multiOrder2 = multiCheckout.data.orders[1];
    const expectedMultiTotal = multiOrder1.total + multiOrder2.total; // 150 + 250 = 400

    const multiPayRes = await api('POST', '/api/payments/create-order', customer1Token, {
      orderIds: [multiOrder1.id, multiOrder2.id],
    });
    assert(multiPayRes.status === 201, 'Multi-vendor payment order created (201 Created)');
    assert(multiPayRes.data.amount === expectedMultiTotal * 100, `Unified total is $${expectedMultiTotal} (${multiPayRes.data.amount} paise)`);

    const multiRzpOrderId = multiPayRes.data.razorpayOrderId;
    const { rows: multiPayRows } = await pool.query(
      'SELECT * FROM payments WHERE razorpay_order_id = $1',
      [multiRzpOrderId]
    );
    assert(multiPayRows.length === 2, 'Both vendor orders associated with the single platform Razorpay order');
    assert(
      multiPayRows.some((r) => r.order_id === multiOrder1.id) &&
      multiPayRows.some((r) => r.order_id === multiOrder2.id),
      'Each vendor order has its dedicated payment entry sharing the razorpay_order_id'
    );

    // ---------------- 5. Customer Ownership & Isolation ----------------
    console.log('\n--- 5. Customer Ownership & Isolation ---');
    const crossCustCreate = await api('POST', '/api/payments/create-order', customer2Token, {
      orderIds: [order1.id],
    });
    assert(crossCustCreate.status === 403, 'Customer 2 attempting to create payment for Customer 1 order rejected with 403');

    const crossCustVerify = await api('POST', '/api/payments/verify', customer2Token, {
      razorpay_order_id: rzpOrderId1,
      razorpay_payment_id: 'pay_test123',
      razorpay_signature: 'fake_sig',
    });
    assert(crossCustVerify.status === 403, 'Customer 2 attempting to verify Customer 1 payment rejected with 403');

    // ---------------- 6. Payment Eligibility Checks ----------------
    console.log('\n--- 6. Payment Eligibility Checks ---');
    // Cancel an order and verify payment order is blocked
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 1 });
    const checkoutToCancel = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '101 Silicon Valley Way',
    });
    const orderToCancel = checkoutToCancel.data.orders[0];
    await api('PUT', `/api/orders/${orderToCancel.id}/cancel`, customer1Token);

    const cancelledPayRes = await api('POST', '/api/payments/create-order', customer1Token, {
      orderIds: [orderToCancel.id],
    });
    assert(cancelledPayRes.status === 409, 'Payment order on cancelled order rejected with 409 Conflict');

    // ---------------- 7. Cryptographic Signature Verification ----------------
    console.log('\n--- 7. Cryptographic Signature Verification (POST /api/payments/verify) ---');
    const mockPaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;

    // Test missing signature
    const missingSigRes = await api('POST', '/api/payments/verify', customer1Token, {
      razorpay_order_id: rzpOrderId1,
      razorpay_payment_id: mockPaymentId,
    });
    assert(missingSigRes.status === 400, 'Missing signature rejected with 400 Bad Request');

    // Test forged/invalid signature
    const invalidSigRes = await api('POST', '/api/payments/verify', customer1Token, {
      razorpay_order_id: rzpOrderId1,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: 'tampered_or_invalid_signature_hash',
    });
    assert(invalidSigRes.status === 400, 'Tampered/invalid signature rejected with 400 Bad Request');

    // Verify status was marked failed in DB for invalid signature attempt
    const { rows: failedPayRows } = await pool.query(
      'SELECT status FROM payments WHERE razorpay_order_id = $1',
      [rzpOrderId1]
    );
    assert(failedPayRows[0].status === 'failed', 'Tampered signature marked payment status as failed in PostgreSQL');

    // Now test authentic signature verification
    const validSignature = generateTestSignature(rzpOrderId1, mockPaymentId);
    const startVerifyBench = Date.now();
    const verifySuccessRes = await api('POST', '/api/payments/verify', customer1Token, {
      razorpay_order_id: rzpOrderId1,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature,
    });
    const verifyMs = Date.now() - startVerifyBench;

    assert(verifySuccessRes.status === 200, 'Authentic signature verification returns 200 OK');
    assert(verifySuccessRes.data.success === true, 'Verification response contains success: true');
    assert(verifySuccessRes.data.status === 'paid', 'Verification response confirms status: paid');

    // Verify PostgreSQL payments and orders state
    const { rows: verifiedPay } = await pool.query(
      'SELECT * FROM payments WHERE razorpay_order_id = $1',
      [rzpOrderId1]
    );
    assert(verifiedPay[0].status === 'paid', 'PostgreSQL payments table status updated to "paid"');
    assert(verifiedPay[0].razorpay_payment_id === mockPaymentId, 'PostgreSQL payments table stores razorpay_payment_id');
    assert(verifiedPay[0].razorpay_signature === validSignature, 'PostgreSQL payments table stores razorpay_signature');

    const { rows: verifiedOrder } = await pool.query(
      'SELECT payment_status, order_status FROM orders WHERE id = $1',
      [order1.id]
    );
    assert(verifiedOrder[0].payment_status === 'paid', 'PostgreSQL orders table payment_status updated to "paid"');
    assert(verifiedOrder[0].order_status === 'confirmed', 'PostgreSQL orders table order_status advanced to "confirmed"');

    // ---------------- 8. Multi-Vendor Payment Signature Verification ----------------
    console.log('\n--- 8. Multi-Vendor Payment Signature Verification ---');
    const multiMockPaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const multiValidSignature = generateTestSignature(multiRzpOrderId, multiMockPaymentId);

    const multiVerifyRes = await api('POST', '/api/payments/verify', customer1Token, {
      razorpay_order_id: multiRzpOrderId,
      razorpay_payment_id: multiMockPaymentId,
      razorpay_signature: multiValidSignature,
    });
    assert(multiVerifyRes.status === 200, 'Multi-vendor payment verification returns 200 OK');

    const { rows: multiOrdersAfter } = await pool.query(
      'SELECT id, payment_status, order_status FROM orders WHERE id = ANY($1::uuid[])',
      [[multiOrder1.id, multiOrder2.id]]
    );
    assert(
      multiOrdersAfter.every((o) => o.payment_status === 'paid'),
      'Both multi-vendor orders atomically updated to payment_status = "paid"'
    );
    assert(
      multiOrdersAfter.every((o) => o.order_status === 'confirmed'),
      'Both multi-vendor orders advanced to order_status = "confirmed"'
    );

    // ---------------- 9. Payment Failure / Cancellation Endpoint ----------------
    console.log('\n--- 9. Payment Failure / Cancellation Handling (POST /api/payments/fail) ---');
    await api('POST', '/api/cart/items', customer1Token, { productId: prodV1.id, quantity: 1 });
    const failCheckout = await api('POST', '/api/orders/checkout', customer1Token, {
      shippingAddress: '101 Silicon Valley Way',
    });
    const orderToFail = failCheckout.data.orders[0];
    const failOrderCreate = await api('POST', '/api/payments/create-order', customer1Token, {
      orderIds: [orderToFail.id],
    });
    const failRzpOrderId = failOrderCreate.data.razorpayOrderId;

    const failReportRes = await api('POST', '/api/payments/fail', customer1Token, {
      razorpay_order_id: failRzpOrderId,
      payment_id: 'pay_failed_dismissed',
    });
    assert(failReportRes.status === 200, 'POST /api/payments/fail returns 200 OK');
    assert(failReportRes.data.status === 'failed', 'Report confirms payment marked as failed');

    const { rows: failedOrderRows } = await pool.query(
      'SELECT payment_status, order_status FROM orders WHERE id = $1',
      [orderToFail.id]
    );
    assert(failedOrderRows[0].payment_status === 'failed', 'Order payment_status marked as failed');
    assert(failedOrderRows[0].order_status === 'pending', 'Order preserved in pending state for payment retry');

    // ---------------- 10. Payment Inspection Endpoints ----------------
    console.log('\n--- 10. Payment Record Inspection & Authorization ---');
    // Customer 1 inspects own order payment
    const cust1Inspect = await api('GET', `/api/payments/order/${order1.id}`, customer1Token);
    assert(cust1Inspect.status === 200, 'Customer 1 can inspect their own order payment details (200 OK)');
    assert(cust1Inspect.data.paymentStatus === 'paid', 'Inspection returns correct paymentStatus: paid');

    // Customer 2 inspects Customer 1 order payment -> 403
    const cust2Inspect = await api('GET', `/api/payments/order/${order1.id}`, customer2Token);
    assert(cust2Inspect.status === 403, 'Customer 2 inspecting Customer 1 order payment rejected with 403 Forbidden');

    // Vendor 1 inspects order1 (sold by Vendor 1) -> 200
    const vendor1Inspect = await api('GET', `/api/payments/order/${order1.id}`, vendor1Token);
    assert(vendor1Inspect.status === 200, 'Vendor 1 can inspect payment for their own order (200 OK)');

    // Vendor 2 inspects order1 (sold by Vendor 1) -> 403
    const vendor2Inspect = await api('GET', `/api/payments/order/${order1.id}`, vendor2Token);
    assert(vendor2Inspect.status === 403, 'Vendor 2 inspecting Vendor 1 order payment rejected with 403 Forbidden');

    // Admin inspects order1 -> 200
    const adminInspect = await api('GET', `/api/payments/order/${order1.id}`, adminToken);
    assert(adminInspect.status === 200, 'Admin can inspect payment for any order (200 OK)');

    // Public config endpoint
    const configRes = await api('GET', '/api/payments/config');
    assert(configRes.status === 200, 'GET /api/payments/config returns 200 OK');
    assert(configRes.data.mode === 'test', 'Configuration mode confirms "test"');
    assert(typeof configRes.data.keyId === 'string', 'Public keyId provided');
    assert(!configRes.data.keySecret, 'Secret key is absent from public config');

    // ---------------- 11. Latency & Performance Benchmarks ----------------
    console.log('\n--- 11. Latency & Performance Benchmarks ---');
    assert(createMs < 500, `Payment order creation latency: ${createMs}ms (< 500ms target)`);
    assert(verifyMs < 300, `Payment verification latency: ${verifyMs}ms (< 300ms target)`);

    // ---------------- 12. Regression Integrity Check ----------------
    console.log('\n--- 12. Regression Integrity Check (Stages 1-7) ---');
    const healthDb = await api('GET', '/api/health/db');
    assert(healthDb.status === 200 && healthDb.data.database === 'connected', 'Database health intact');

    const healthRedis = await api('GET', '/api/health/redis');
    assert(healthRedis.status === 200 && healthRedis.data.redis === 'connected', 'Redis health intact');

    const healthSearch = await api('GET', '/api/health/search');
    assert(healthSearch.status === 200 && healthSearch.data.search === 'connected', 'Search health intact');

    const searchRes = await api('GET', '/api/search/products?q=Rzp');
    assert(searchRes.status === 200, 'Elasticsearch search continues working');

    const cartRes = await api('GET', '/api/cart', customer1Token);
    assert(cartRes.status === 200, 'Redis shopping cart continues working');

  } catch (err) {
    console.error('Unexpected error in Stage 8 test suite:', err);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`Stage 8 Test Results: Total Passed: ${passed}, Total Failed: ${failed}`);
    console.log('====================================================\n');

    if (server) {
      server.close();
    }
    await pool.end();
    if (redis && redis.quit) {
      await redis.quit().catch(() => {});
    }

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Start ephemeral server and run tests
server = http.createServer(app);
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test server running at ${baseUrl}`);
  runStage8Tests();
});
