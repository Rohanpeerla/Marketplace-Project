#!/usr/bin/env node

/**
 * Stage 6 Verification Suite: Redis + Shopping Cart
 */

const app = require('../src/app');
const { pool } = require('../src/config/db');
const config = require('../src/config/env');
const redis = require('../src/config/redis');
const { esClient } = require('../src/config/elasticsearch');
const searchService = require('../src/services/searchService');

async function runStage6Tests() {
  console.log('====================================================');
  console.log('🧪 Starting MarketHub Stage 6: Redis + Shopping Cart Test Suite');
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

  const login = async (email, password) => (await api('POST', '/api/auth/login', null, { email, password })).data;

  const TEMP_EMAIL = 'stage6.customer2@test.com';
  const tempProductIds = [];
  let customerId = null;
  let customer2Id = null;

  try {
    // ---------------- Redis ----------------
    console.log('\n--- 1. Redis Connection & Service ---');
    assert(await redis.connect(), 'Redis connection works');

    const health = await api('GET', '/api/health/redis');
    assert(health.status === 200 && health.data.success === true && health.data.redis === 'connected',
      'GET /api/health/redis - 200 OK & connected');
    assert(!JSON.stringify(health.data).includes('redis://'), 'Redis health does not expose connection string');

    await redis.setJSON('stage6:test', { hello: 'world' }, 60);
    const got = await redis.getJSON('stage6:test');
    assert(got && got.hello === 'world', 'Redis set/get (JSON) works');
    assert(await redis.exists('stage6:test'), 'Redis exists works');
    await redis.delete('stage6:test');
    assert(!(await redis.exists('stage6:test')) && (await redis.get('stage6:test')) === null, 'Redis delete works');

    // ---------------- Setup ----------------
    console.log('\n--- 2. Test Account & Product Setup ---');
    const cust = await login('john.doe@example.com', 'Password123!');
    const customerToken = cust.token;
    customerId = cust.user.id;
    const vendorToken = (await login('techcraft@markethub.com', 'Password123!')).token;
    const adminToken = (await login('admin@markethub.com', 'Password123!')).token;

    await pool.query('DELETE FROM users WHERE email = $1', [TEMP_EMAIL]);
    const reg = await api('POST', '/api/auth/register', null, {
      name: 'Stage Six Customer', email: TEMP_EMAIL, password: 'Password123!', role: 'customer',
    });
    const customer2Token = reg.data.token;
    customer2Id = reg.data.user && reg.data.user.id;
    assert(!!customerToken && !!customer2Token && !!vendorToken, 'Test tokens acquired (2 customers, vendor, admin)');

    // Two active products from DIFFERENT vendors with stock >= 3
    const { rows: multi } = await pool.query(`
      SELECT DISTINCT ON (p.vendor_id) p.id, p.vendor_id, p.price::FLOAT AS price, p.stock, v.business_name
      FROM products p JOIN vendors v ON v.id = p.vendor_id
      WHERE p.status = 'active' AND p.stock >= 3
      ORDER BY p.vendor_id, p.created_at`);
    assert(multi.length >= 2, `Found active products from ${multi.length} vendors`);
    const [pA, pB] = multi;

    // Temp product with stock 5 for stock-limit tests (TechCraft vendor)
    const created = await api('POST', '/api/products', vendorToken, {
      name: 'Stage6 Stock Test Item', description: 'temp', price: 10.5, stock: 5,
    });
    const stockProd = created.data.product;
    tempProductIds.push(stockProd.id);
    const createdInactive = await api('POST', '/api/products', vendorToken, {
      name: 'Stage6 Inactive Item', description: 'temp', price: 3, stock: 10, status: 'inactive',
    });
    const inactiveProd = createdInactive.data.product;
    tempProductIds.push(inactiveProd.id);

    // Start from clean carts
    await api('DELETE', '/api/cart', customerToken);
    await api('DELETE', '/api/cart', customer2Token);
    const key = `cart:${customerId}`;

    // ---------------- Cart creation ----------------
    console.log('\n--- 3. Cart Creation & Persistence ---');
    const empty = await api('GET', '/api/cart', customerToken);
    assert(empty.status === 200 && empty.data.cart.items.length === 0 && empty.data.cart.subtotal === 0,
      'Authenticated customer retrieves an empty cart');

    const add1 = await api('POST', '/api/cart/items', customerToken, { productId: pA.id, quantity: 1, price: 0.01 });
    assert(add1.status === 200 && add1.data.cart.items.length === 1, 'Customer can add a product');
    assert(add1.data.cart.items[0].price === pA.price, 'Client-supplied price ignored; backend uses PostgreSQL price');

    const { rows: dbItems } = await pool.query(
      `SELECT ci.quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1 AND ci.product_id = $2`,
      [customerId, pA.id]);
    assert(dbItems.length === 1 && dbItems[0].quantity === 1, 'Cart item stored in PostgreSQL');

    const cachedAfterAdd = await redis.getJSON(key);
    assert(cachedAfterAdd && cachedAfterAdd.items.some((i) => i.productId === pA.id),
      `Cart cached in Redis under key "cart:{userId}"`);
    const keyTtl = await redis.ttl(key);
    assert(keyTtl > 0 && keyTtl <= config.cartCacheTtlSeconds, `Redis cart key has TTL (${keyTtl}s)`);

    // ---------------- Quantity ----------------
    console.log('\n--- 4. Quantity Management & Stock Validation ---');
    const add2 = await api('POST', '/api/cart/items', customerToken, { productId: pA.id, quantity: 2 });
    const itemA = add2.data.cart.items.find((i) => i.productId === pA.id);
    assert(add2.data.cart.items.length === 1 && itemA.quantity === 3, 'Adding same product increases quantity (no duplicate row)');

    const upd = await api('PUT', `/api/cart/items/${pA.id}`, customerToken, { quantity: 2 });
    assert(upd.status === 200 && upd.data.cart.items[0].quantity === 2, 'Updating quantity works');

    const zero = await api('PUT', `/api/cart/items/${pA.id}`, customerToken, { quantity: 0 });
    assert(zero.status === 400, 'Quantity cannot be zero (400)');
    const neg = await api('POST', '/api/cart/items', customerToken, { productId: pA.id, quantity: -2 });
    assert(neg.status === 400, 'Quantity cannot be negative (400)');
    const dec = await api('POST', '/api/cart/items', customerToken, { productId: pA.id, quantity: 1.5 });
    assert(dec.status === 400, 'Quantity must be an integer (400)');

    const s1 = await api('POST', '/api/cart/items', customerToken, { productId: stockProd.id, quantity: 3 });
    const s2 = await api('POST', '/api/cart/items', customerToken, { productId: stockProd.id, quantity: 3 });
    assert(s1.status === 200 && s2.status === 409, 'Stock 5, cart 3, add 3 more -> rejected (409)', `got ${s2.status}`);
    assert(/stock/i.test(s2.data.message || ''), 'Stock error message is clear');
    const s3 = await api('PUT', `/api/cart/items/${stockProd.id}`, customerToken, { quantity: 6 });
    assert(s3.status === 409, 'Update quantity above stock rejected (409)');
    const { rows: stillThree } = await pool.query(
      `SELECT ci.quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1 AND ci.product_id = $2`,
      [customerId, stockProd.id]);
    assert(stillThree[0].quantity === 3, 'Rejected mutation left PostgreSQL unchanged (transaction rollback)');

    // ---------------- Multi-vendor & totals ----------------
    console.log('\n--- 5. Multi-Vendor Cart & Totals ---');
    const addB = await api('POST', '/api/cart/items', customerToken, { productId: pB.id, quantity: 2 });
    const cart = addB.data.cart;
    const vendorIds = new Set(cart.items.map((i) => i.vendorId));
    assert(vendorIds.size >= 2, `Products from multiple vendors in one cart (${vendorIds.size} vendors)`);
    const itemB = cart.items.find((i) => i.productId === pB.id);
    assert(itemB.vendor === pB.business_name && itemB.vendorId === pB.vendor_id, 'Vendor information returned correctly');
    assert(['productId', 'name', 'price', 'quantity', 'subtotal', 'stock', 'image', 'vendor'].every((k) => k in itemB),
      'Item contains productId, name, price, quantity, subtotal, stock, image, vendor');

    const round2 = (n) => Math.round(n * 100) / 100;
    assert(itemB.subtotal === round2(pB.price * 2), `Item subtotal correct (${itemB.subtotal})`);
    const expectedSubtotal = round2(cart.items.reduce((s, i) => s + i.price * i.quantity, 0));
    assert(cart.subtotal === expectedSubtotal, `Cart subtotal correct (${cart.subtotal})`);
    assert(cart.itemCount === 2 + 3 + 2, `Item count correct (${cart.itemCount})`);

    // ---------------- Cache ----------------
    console.log('\n--- 6. Redis Cache-Aside ---');
    await redis.delete(key);
    let t = process.hrtime.bigint();
    const miss = await api('GET', '/api/cart', customerToken);
    perf.dbMs = Number(process.hrtime.bigint() - t) / 1e6;
    assert(miss.data.source === 'database' && (await redis.exists(key)), 'First GET (cache miss) reads PostgreSQL and populates Redis');

    t = process.hrtime.bigint();
    const hit = await api('GET', '/api/cart', customerToken);
    perf.cacheMs = Number(process.hrtime.bigint() - t) / 1e6;
    assert(hit.data.source === 'cache' && hit.data.cart.subtotal === miss.data.cart.subtotal, 'Second GET served from Redis cache');

    // Averaged benchmark (20 iterations each)
    const N = 20;
    let dbTotal = 0, cacheTotal = 0;
    for (let i = 0; i < N; i++) {
      await redis.delete(key);
      t = process.hrtime.bigint();
      await api('GET', '/api/cart', customerToken);
      dbTotal += Number(process.hrtime.bigint() - t) / 1e6;
      t = process.hrtime.bigint();
      await api('GET', '/api/cart', customerToken);
      cacheTotal += Number(process.hrtime.bigint() - t) / 1e6;
    }
    perf.dbAvg = dbTotal / N;
    perf.cacheAvg = cacheTotal / N;

    // ---------------- Remove / Clear ----------------
    console.log('\n--- 7. Remove & Clear ---');
    const rem = await api('DELETE', `/api/cart/items/${pB.id}`, customerToken);
    assert(rem.status === 200 && !rem.data.cart.items.some((i) => i.productId === pB.id), 'Remove item works');
    const cachedAfterRemove = await redis.getJSON(key);
    assert(cachedAfterRemove && !cachedAfterRemove.items.some((i) => i.productId === pB.id), 'Redis updated after removal (no stale data)');
    const remMissing = await api('DELETE', `/api/cart/items/${pB.id}`, customerToken);
    assert(remMissing.status === 200, 'Removing a non-existent item handled gracefully (200)');

    const clr = await api('DELETE', '/api/cart', customerToken);
    assert(clr.status === 200 && clr.data.cart.items.length === 0 && clr.data.cart.subtotal === 0, 'Clear cart works');
    const { rows: afterClear } = await pool.query(
      `SELECT COUNT(*)::INT AS n FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1`, [customerId]);
    assert(afterClear[0].n === 0, 'PostgreSQL cart is empty after clear');
    assert(!(await redis.exists(key)), 'Redis cart key cleared');

    // ---------------- Auth ----------------
    console.log('\n--- 8. Authentication & Ownership ---');
    const unauth = await api('GET', '/api/cart');
    const unauthAdd = await api('POST', '/api/cart/items', null, { productId: pA.id, quantity: 1 });
    assert(unauth.status === 401 && unauthAdd.status === 401, 'Unauthenticated user cannot access cart (401)');
    const vendorCart = await api('GET', '/api/cart', vendorToken);
    const adminCart = await api('GET', '/api/cart', adminToken);
    assert(vendorCart.status === 403 && adminCart.status === 403, 'Vendor/Admin cannot use customer cart (403)');

    await api('POST', '/api/cart/items', customerToken, { productId: pA.id, quantity: 1 });
    const c2Add = await api('POST', '/api/cart/items', customer2Token, { productId: pB.id, quantity: 1, userId: customerId });
    const c1View = await api('GET', '/api/cart', customerToken);
    const c2View = await api('GET', '/api/cart', customer2Token);
    assert(c2Add.status === 200 && !c1View.data.cart.items.some((i) => i.productId === pB.id),
      'Body userId ignored: customer 2 cannot write to customer 1 cart');
    assert(c2View.data.cart.items.length === 1 && c2View.data.cart.items[0].productId === pB.id &&
      !c2View.data.cart.items.some((i) => i.productId === pA.id), 'Customer 2 cannot see customer 1 cart');
    const c2Remove = await api('DELETE', `/api/cart/items/${pA.id}`, customer2Token);
    const c1After = await api('GET', '/api/cart', customerToken);
    assert(c2Remove.status === 200 && c1After.data.cart.items.some((i) => i.productId === pA.id),
      "Customer 2 cannot remove items from customer 1's cart");

    // ---------------- Product validation ----------------
    console.log('\n--- 9. Product Validation ---');
    const inactive = await api('POST', '/api/cart/items', customerToken, { productId: inactiveProd.id, quantity: 1 });
    assert(inactive.status === 400, 'Inactive product cannot be added (400)');
    await api('DELETE', `/api/products/${stockProd.id}`, vendorToken); // soft delete -> inactive
    const deleted = await api('POST', '/api/cart/items', customerToken, { productId: stockProd.id, quantity: 1 });
    assert(deleted.status === 400, 'Soft-deleted product cannot be added (400)');
    const nonexist = await api('POST', '/api/cart/items', customerToken, { productId: '00000000-0000-4000-8000-000000000000', quantity: 1 });
    assert(nonexist.status === 404, 'Nonexistent product cannot be added (404)');
    const badId = await api('POST', '/api/cart/items', customerToken, { productId: 'not-a-uuid', quantity: 1 });
    assert(badId.status === 400, 'Malformed productId rejected (400)');

    // ---------------- Redis failure fallback ----------------
    console.log('\n--- 10. Redis Unavailable -> PostgreSQL Fallback ---');
    const origUrl = config.redisUrl;
    await redis.disconnect();
    config.redisUrl = 'redis://127.0.0.1:6399'; // nothing listens here: simulates Redis outage
    const downHealth = await api('GET', '/api/health/redis');
    assert(downHealth.status === 503 && downHealth.data.redis === 'disconnected' && !('error' in downHealth.data),
      'Health reports disconnected (503) without raw errors');
    const fbGet = await api('GET', '/api/cart', customerToken);
    assert(fbGet.status === 200 && fbGet.data.source === 'database' && fbGet.data.cart.items.length >= 1,
      'GET cart falls back to PostgreSQL when Redis is down');
    const fbAdd = await api('POST', '/api/cart/items', customerToken, { productId: pB.id, quantity: 1 });
    assert(fbAdd.status === 200 && fbAdd.data.cart.items.some((i) => i.productId === pB.id),
      'Cart mutation succeeds and persists to PostgreSQL while Redis is down');
    config.redisUrl = origUrl;
    await redis.disconnect();
    await redis.connect();
    // Simulate empty cache on Redis restart:
    await redis.delete(key);
    const recovered = await api('GET', '/api/cart', customerToken);
    assert(recovered.status === 200 && recovered.data.cart.items.some((i) => i.productId === pB.id) && (await redis.exists(key)),
      'After Redis recovers, cart is fully recovered from PostgreSQL and re-cached');

    // ---------------- Regression ----------------
    console.log('\n--- 11. Backward Compatibility ---');
    const checks = [
      ['/api/health', (d) => d.success],
      ['/api/health/db', (d) => d.database === 'connected'],
      ['/api/health/search', (d) => d.search === 'connected'],
      ['/api/products', (d) => Array.isArray(d.products)],
      ['/api/search/products?q=laptop&sort=price_asc', (d) => Array.isArray(d.products)],
    ];
    for (const [path, ok] of checks) {
      const r = await api('GET', path);
      assert(r.status === 200 && ok(r.data), `GET ${path} still works`);
    }
    const me = await api('GET', '/api/auth/me', customerToken);
    assert(me.status === 200 && me.data.user.role === 'customer', 'GET /api/auth/me still works');
  } catch (err) {
    console.error('Unexpected error during Stage 6 test suite:', err);
    failed++;
  } finally {
    try {
      if (customerId) {
        await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)', [customerId]);
        await redis.delete(`cart:${customerId}`);
      }
      if (customer2Id) await redis.delete(`cart:${customer2Id}`);
      await pool.query('DELETE FROM users WHERE email = $1', [TEMP_EMAIL]); // cascades cart
      for (const pid of tempProductIds) {
        await pool.query('DELETE FROM products WHERE id = $1', [pid]);
        await searchService.deleteProduct(pid);
      }
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
    server.close();
    await redis.disconnect();
    await pool.end();
    await esClient.close().catch(() => {});
  }

  if (perf.dbAvg !== undefined) {
    console.log('\n--- Performance (local, HTTP round-trip incl. JWT auth) ---');
    console.log(`  PostgreSQL cart retrieval (cache miss): first ${perf.dbMs.toFixed(2)} ms, avg ${perf.dbAvg.toFixed(2)} ms over 20`);
    console.log(`  Redis cart retrieval (cache hit):       first ${perf.cacheMs.toFixed(2)} ms, avg ${perf.cacheAvg.toFixed(2)} ms over 20`);
  }

  console.log('\n====================================================');
  console.log(`Stage 6 Test Results: Total Passed: ${passed}, Total Failed: ${failed}`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runStage6Tests();

