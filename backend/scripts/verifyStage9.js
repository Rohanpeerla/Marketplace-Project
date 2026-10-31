/**
 * Stage 9 Verification Test Suite
 * Covers:
 *  - Product Reviews (Purchase verification, rating limits, duplicate prevention, CRUD, aggregates, admin moderation)
 *  - Coupons (Validation, fixed & percentage math, expiry, usage limit, admin CRUD, checkout integration)
 *  - PDF Invoices (PDFKit streaming, stable invoice number, customer & admin access control)
 *  - Admin Analytics (Overview KPIs, revenue, order status distribution, top products, vendor performance, role security)
 */

const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let server;
let baseUrl;

const request = async (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let data = null;
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(rawBuffer.toString('utf8'));
          } catch (e) {
            data = rawBuffer.toString('utf8');
          }
        } else {
          data = rawBuffer;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          rawBuffer,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

let testsPassed = 0;
let testsFailed = 0;

const assert = (condition, testName, errorDetails = '') => {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (errorDetails) console.error(`    Details: ${errorDetails}`);
    testsFailed++;
  }
};

async function runStage9Tests() {
  console.log('\n==================================================');
  console.log('STARTING STAGE 9 VERIFICATION TEST SUITE');
  console.log('==================================================\n');

  // Start temporary server on dynamic port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}`);

  try {
    const timestamp = Date.now();

    // 1. Setup Test Users
    // Customer 1 (will make a verified purchase)
    const cust1Email = `cust1_${timestamp}@example.com`;
    const cust2Email = `cust2_${timestamp}@example.com`;
    const vendorEmail = `vendor_${timestamp}@example.com`;

    const registerUser = async (name, email, role) => {
      const res = await request('POST', '/api/auth/register', {
        name,
        email,
        password: 'Password123!',
        role,
      });
      return res.data.token || res.data.data?.token;
    };

    const cust1Token = await registerUser('Customer One', cust1Email, 'customer');
    const cust2Token = await registerUser('Customer Two', cust2Email, 'customer');

    // Login as seeded admin
    const adminRes = await request('POST', '/api/auth/login', {
      email: 'admin@markethub.com',
      password: 'Password123!',
    });
    const adminToken = adminRes.data.token;

    // Login as seeded vendor or register new vendor
    const vLoginRes = await request('POST', '/api/auth/login', {
      email: 'techcraft@markethub.com',
      password: 'Password123!',
    });
    const vendorToken = vLoginRes.data.token;

    // Create Category
    let categoryId;
    const catRes = await request('POST', '/api/categories', {
      name: `Electronics_${timestamp}`,
      description: 'Gadgets and gear',
    }, adminToken);
    categoryId = catRes.data.data ? catRes.data.data.id : catRes.data.category.id;

    // Create Product
    const prodRes = await request('POST', '/api/products', {
      name: `Pro Noise Cancelling Headphones ${timestamp}`,
      description: 'High fidelity audio headphones with ANC',
      price: 250.00,
      stock: 50,
      categoryId,
    }, vendorToken);
    const product = prodRes.data.data || prodRes.data.product;
    const productId = product.id;

    console.log('\n--- GROUP 1: PRODUCT REVIEWS ---');

    // 1. Unauthenticated review attempt
    const unauthReview = await request('POST', '/api/reviews', {
      productId,
      rating: 5,
      comment: 'Super fast delivery!',
    });
    assert(unauthReview.status === 401, 'Unauthenticated review attempt returns 401 Unauthorized');

    // 2. Non-purchaser attempt to review
    const nonBuyerReview = await request('POST', '/api/reviews', {
      productId,
      rating: 5,
      comment: 'I did not buy this but looks cool!',
    }, cust2Token);
    assert(nonBuyerReview.status === 403, 'Non-purchaser attempting to review returns 403 Forbidden');

    // 3. Invalid rating validation (<1 or >5)
    // First, let customer 1 purchase the product so they are a verified buyer
    await request('POST', '/api/cart/items', { productId, quantity: 2 }, cust1Token);
    const checkoutRes = await request('POST', '/api/orders/checkout', {
      shippingAddress: '42 Galaxy Way, Metropolis',
    }, cust1Token);
    assert(checkoutRes.status === 201, 'Customer 1 checkout succeeds');
    const orderId = checkoutRes.data.orders ? checkoutRes.data.orders[0].id : checkoutRes.data[0].id;

    // Update order to confirmed so purchase verification passes
    await pool.query("UPDATE orders SET order_status = 'confirmed', payment_status = 'paid' WHERE id = $1", [orderId]);

    // Test invalid rating: 0 and 6
    const invalidRating0 = await request('POST', '/api/reviews', {
      productId,
      rating: 0,
      comment: 'Zero stars',
    }, cust1Token);
    assert(invalidRating0.status === 400, 'Review with rating 0 returns 400 Bad Request');

    const invalidRating6 = await request('POST', '/api/reviews', {
      productId,
      rating: 6,
      comment: 'Super good',
    }, cust1Token);
    assert(invalidRating6.status === 400, 'Review with rating 6 returns 400 Bad Request');

    // 4. Valid review submission by verified purchaser
    const validReviewRes = await request('POST', '/api/reviews', {
      productId,
      rating: 4,
      comment: 'Great sound quality and battery life!',
    }, cust1Token);
    assert(validReviewRes.status === 201 && validReviewRes.data.success, 'Verified purchaser successfully submits review');
    const reviewId = validReviewRes.data.data.review.id;

    // 5. Duplicate review attempt
    const duplicateReview = await request('POST', '/api/reviews', {
      productId,
      rating: 5,
      comment: 'Another review',
    }, cust1Token);
    assert(duplicateReview.status === 409, 'Duplicate review by same customer for same product returns 409 Conflict');

    // 6. Update review
    const updateReviewRes = await request('PUT', `/api/reviews/${reviewId}`, {
      rating: 5,
      comment: 'Updated: After a week of use, this is a 5-star product!',
    }, cust1Token);
    assert(
      updateReviewRes.status === 200 && updateReviewRes.data.data.review.rating === 5,
      'Customer successfully updates their review rating and comment'
    );

    // 7. Unauthorized user cannot update or delete review
    const unauthUpdate = await request('PUT', `/api/reviews/${reviewId}`, {
      rating: 1,
      comment: 'Hacked comment',
    }, cust2Token);
    assert(unauthUpdate.status === 403, 'Unauthorized user cannot update another user\'s review');

    const unauthDelete = await request('DELETE', `/api/reviews/${reviewId}`, null, cust2Token);
    assert(unauthDelete.status === 403, 'Unauthorized user cannot delete another user\'s review');

    // 8. Public retrieval of product reviews and aggregates
    const getReviewsRes = await request('GET', `/api/products/${productId}/reviews`);
    assert(
      getReviewsRes.status === 200 &&
      getReviewsRes.data.data.aggregates.total_reviews === 1 &&
      getReviewsRes.data.data.aggregates.average_rating === 5,
      'Public review endpoint returns accurate review list and aggregates'
    );

    // 9. Admin moderation: delete review
    const adminDeleteRes = await request('DELETE', `/api/reviews/${reviewId}`, null, adminToken);
    assert(adminDeleteRes.status === 200, 'Admin can moderate and delete any review');

    const getReviewsAfterDelete = await request('GET', `/api/products/${productId}/reviews`);
    assert(
      getReviewsAfterDelete.data.data.aggregates.total_reviews === 0,
      'Product aggregates update dynamically after review deletion'
    );

    console.log('\n--- GROUP 2: COUPONS & CHECKOUT INTEGRATION ---');

    // 10. Admin creates a percentage coupon with maximum discount
    const couponPercRes = await request('POST', '/api/coupons', {
      code: `SALE20_${timestamp}`,
      discount_type: 'percentage',
      discount_value: 20,
      minimum_order_amount: 100,
      maximum_discount_amount: 40,
      usage_limit: 10,
    }, adminToken);
    assert(couponPercRes.status === 201, 'Admin creates percentage coupon with cap');

    // 11. Admin creates a fixed discount coupon
    const couponFixedRes = await request('POST', '/api/coupons', {
      code: `FLAT30_${timestamp}`,
      discount_type: 'fixed',
      discount_value: 30,
      minimum_order_amount: 150,
      usage_limit: 5,
    }, adminToken);
    assert(couponFixedRes.status === 201, 'Admin creates fixed discount coupon');

    // 12. Non-admin cannot create coupon
    const nonAdminCoupon = await request('POST', '/api/coupons', {
      code: 'FAIL',
      discount_type: 'fixed',
      discount_value: 10,
    }, cust1Token);
    assert(nonAdminCoupon.status === 403, 'Non-admin cannot create coupons (403 Forbidden)');

    // 13. Validate coupon: min order amount check
    const minOrderValidation = await request('POST', '/api/coupons/validate', {
      code: `SALE20_${timestamp}`,
      orderAmount: 50, // min is 100
    }, cust1Token);
    assert(minOrderValidation.status === 400, 'Validation fails when orderAmount is below minimum requirement');

    // 14. Validate coupon: percentage calculation with maximum cap
    // Order amount = 300, 20% would be 60, but max cap is 40
    const validPercValidation = await request('POST', '/api/coupons/validate', {
      code: `SALE20_${timestamp}`,
      orderAmount: 300,
    }, cust1Token);
    assert(
      validPercValidation.status === 200 &&
      validPercValidation.data.data.discountAmount === 40 &&
      validPercValidation.data.data.finalAmount === 260,
      'Coupon validation correctly enforces percentage discount cap'
    );

    // 15. Checkout with coupon code
    // Add product to cart (price: 250, qty: 1)
    await request('POST', '/api/cart/items', { productId, quantity: 1 }, cust2Token);
    const checkoutCouponRes = await request('POST', '/api/orders/checkout', {
      shippingAddress: '100 Baker Street, London',
      couponCode: `FLAT30_${timestamp}`,
    }, cust2Token);

    assert(checkoutCouponRes.status === 201, 'Checkout with coupon code succeeds');
    const couponOrder = checkoutCouponRes.data.orders ? checkoutCouponRes.data.orders[0] : checkoutCouponRes.data[0];
    assert(
      couponOrder.discountAmount === 30 &&
      couponOrder.total === 220 &&
      couponOrder.couponCode === `FLAT30_${timestamp}`,
      'Order records correct discount_amount, final total, and coupon_code'
    );
    assert(
      couponOrder.invoiceNumber && couponOrder.invoiceNumber.startsWith('INV-'),
      'Order generates stable invoice_number with prefix INV-'
    );

    // 16. Verify coupon usage count incremented in DB
    const couponCheck = await request('GET', '/api/coupons', null, adminToken);
    const updatedCoupon = couponCheck.data.data.coupons.find(c => c.code === `FLAT30_${timestamp}`);
    assert(updatedCoupon && updatedCoupon.used_count === 1, 'Coupon used_count incremented atomically');

    console.log('\n--- GROUP 3: PDF INVOICES ---');

    // 17. Customer owner downloads PDF invoice
    const customerPdfRes = await request('GET', `/api/orders/${couponOrder.id}/invoice`, null, cust2Token);
    assert(
      customerPdfRes.status === 200 &&
      customerPdfRes.headers['content-type'].includes('application/pdf'),
      'Customer owner downloads invoice with application/pdf Content-Type'
    );
    assert(
      customerPdfRes.rawBuffer.toString('utf8', 0, 5) === '%PDF-',
      'Invoice payload contains valid PDF binary header (%PDF-)'
    );

    // 18. Admin downloads PDF invoice
    const adminPdfRes = await request('GET', `/api/orders/${couponOrder.id}/invoice`, null, adminToken);
    assert(adminPdfRes.status === 200, 'Admin can download invoice for any customer order');

    // 19. Unauthorized customer cannot download another customer\'s invoice
    const unauthorizedPdfRes = await request('GET', `/api/orders/${couponOrder.id}/invoice`, null, cust1Token);
    assert(unauthorizedPdfRes.status === 403, 'Unauthorized customer is rejected with 403 Forbidden');

    console.log('\n--- GROUP 4: ADMIN ANALYTICS ---');

    // 20. Admin Overview KPIs
    const overviewRes = await request('GET', '/api/admin/analytics/overview', null, adminToken);
    assert(
      overviewRes.status === 200 &&
      typeof overviewRes.data.data.total_orders === 'number' &&
      typeof overviewRes.data.data.total_active_products === 'number',
      'Admin retrieves overview KPIs'
    );

    // 21. Admin Revenue Stats
    const revenueRes = await request('GET', '/api/admin/analytics/revenue', null, adminToken);
    assert(
      revenueRes.status === 200 &&
      Array.isArray(revenueRes.data.data.monthly) &&
      Array.isArray(revenueRes.data.data.daily),
      'Admin retrieves monthly and daily revenue statistics'
    );

    // 22. Admin Orders Stats & Distribution
    const ordersStatsRes = await request('GET', '/api/admin/analytics/orders', null, adminToken);
    assert(
      ordersStatsRes.status === 200 &&
      Array.isArray(ordersStatsRes.data.data.distribution) &&
      typeof ordersStatsRes.data.data.totalOrders === 'number',
      'Admin retrieves order status distribution and rates'
    );

    // 23. Admin Products Analytics (top selling, low stock)
    const productStatsRes = await request('GET', '/api/admin/analytics/products', null, adminToken);
    assert(
      productStatsRes.status === 200 &&
      Array.isArray(productStatsRes.data.data.topSelling) &&
      Array.isArray(productStatsRes.data.data.lowStock),
      'Admin retrieves top-selling products and low stock alerts'
    );

    // 24. Admin Vendor Performance
    const vendorStatsRes = await request('GET', '/api/admin/analytics/vendors', null, adminToken);
    assert(
      vendorStatsRes.status === 200 &&
      Array.isArray(vendorStatsRes.data.data),
      'Admin retrieves vendor performance metrics'
    );

    // 25. Role Protection: Customer and Vendor cannot access admin analytics
    const custAnalyticsRes = await request('GET', '/api/admin/analytics/overview', null, cust1Token);
    assert(custAnalyticsRes.status === 403, 'Customer cannot access admin analytics (403 Forbidden)');

    const vendorAnalyticsRes = await request('GET', '/api/admin/analytics/overview', null, vendorToken);
    assert(vendorAnalyticsRes.status === 403, 'Vendor cannot access admin analytics (403 Forbidden)');

  } catch (err) {
    console.error('[Stage 9 Test Exception]:', err);
    testsFailed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();

    console.log('\n==================================================');
    console.log(`STAGE 9 TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('==================================================\n');

    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

runStage9Tests();
