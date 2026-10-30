const app = require('../src/app');
const { pool } = require('../src/config/db');

async function runStage4Tests() {
  console.log('====================================================');
  console.log('🧪 Starting MarketHub Stage 4: Vendor & Product Test Suite');
  console.log('====================================================\n');

  // Start ephemeral test server
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details}`);
      failed++;
    }
  }

  // Cleanup helper
  const createdProductIds = [];
  const createdCategoryIds = [];

  try {
    // Authenticate seeded accounts (Admin, Vendor 1: TechCraft, Vendor 2: Aura, Customer: John Doe)
    console.log('\n--- 0. Authenticating Seeded Test Accounts ---');

    async function login(email, password) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return data.token;
    }

    const adminToken = await login('admin@markethub.com', 'Password123!');
    const techcraftToken = await login('techcraft@markethub.com', 'Password123!');
    const aurasoundToken = await login('aurasound@markethub.com', 'Password123!');
    const customerToken = await login('john.doe@example.com', 'Password123!');

    assert(!!adminToken, 'Admin Token Acquired');
    assert(!!techcraftToken, 'TechCraft Vendor Token Acquired');
    assert(!!aurasoundToken, 'AuraSound Vendor Token Acquired');
    assert(!!customerToken, 'Customer Token Acquired');

    // Register a brand new vendor who will have 'pending' status by default
    await pool.query("DELETE FROM vendors WHERE user_id IN (SELECT id FROM users WHERE email = 'pending.vendor@test.com')");
    await pool.query("DELETE FROM users WHERE email = 'pending.vendor@test.com'");
    const pendingVendorReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pending Vendor User',
        email: 'pending.vendor@test.com',
        password: 'Password123!',
        role: 'vendor',
        businessName: 'Unapproved Shop',
      }),
    });
    const pendingVendorData = await pendingVendorReg.json();
    const pendingVendorToken = pendingVendorData.token;
    assert(
      pendingVendorReg.status === 201 && pendingVendorData.user.vendor.status === 'pending',
      'Register Pending Vendor - Status is pending'
    );

    // =========================================================================
    // 1. VENDOR PROFILE MANAGEMENT
    // =========================================================================
    console.log('\n--- 1. Testing Vendor Profile Management (GET/PUT /api/vendors/me) ---');

    // Test 1.1: Vendor can view own profile
    const vMeRes = await fetch(`${baseUrl}/api/vendors/me`, {
      headers: { Authorization: `Bearer ${techcraftToken}` },
    });
    const vMeData = await vMeRes.json();
    assert(
      vMeRes.status === 200 && vMeData.success && vMeData.vendor.business_name === 'TechCraft Innovations',
      'GET /api/vendors/me - Vendor views own profile'
    );

    // Test 1.2: Customer cannot view vendor profile
    const custVMeRes = await fetch(`${baseUrl}/api/vendors/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custVMeRes.status === 403, 'GET /api/vendors/me - Customer rejected with 403');

    // Test 1.3: Unauthenticated request rejected
    const noTokenVMe = await fetch(`${baseUrl}/api/vendors/me`);
    assert(noTokenVMe.status === 401, 'GET /api/vendors/me - Unauthenticated rejected with 401');

    // Test 1.4: Vendor updates allowed profile fields
    const vUpdateRes = await fetch(`${baseUrl}/api/vendors/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techcraftToken}`,
      },
      body: JSON.stringify({
        phone: '+1-555-999-8888',
        address: '100 Innovation Way, Updated Suite 500, San Francisco, CA',
      }),
    });
    const vUpdateData = await vUpdateRes.json();
    assert(
      vUpdateRes.status === 200 && vUpdateData.vendor.phone === '+1-555-999-8888',
      'PUT /api/vendors/me - Vendor updates allowed fields'
    );

    // Test 1.5: Vendor cannot modify status or user_id
    const vTamperRes = await fetch(`${baseUrl}/api/vendors/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pendingVendorToken}`,
      },
      body: JSON.stringify({
        status: 'approved', // Malicious attempt to self-approve
        businessName: 'Still Pending Shop',
      }),
    });
    const vTamperData = await vTamperRes.json();
    assert(
      vTamperRes.status === 200 && vTamperData.vendor.status === 'pending',
      'PUT /api/vendors/me - Status tamper attempt safely ignored (remains pending)'
    );

    // =========================================================================
    // 2. CATEGORY MANAGEMENT
    // =========================================================================
    console.log('\n--- 2. Testing Category Management (GET/POST/PUT/DELETE /api/categories) ---');

    // Test 2.1: Public category listing
    const catListRes = await fetch(`${baseUrl}/api/categories`);
    const catListData = await catListRes.json();
    assert(
      catListRes.status === 200 && Array.isArray(catListData.categories) && catListData.categories.length >= 5,
      'GET /api/categories - Public listing returns seeded categories'
    );

    // Test 2.2: Non-admin cannot create category (403)
    const custCatCreate = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Category' }),
    });
    assert(custCatCreate.status === 403, 'POST /api/categories - Customer cannot create category (403)');

    const vendorCatCreate = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techcraftToken}`,
      },
      body: JSON.stringify({ name: 'Vendor Category Attempt' }),
    });
    assert(vendorCatCreate.status === 403, 'POST /api/categories - Vendor cannot create category (403)');

    // Test 2.3: Admin creates category
    const adminCatCreate = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Stage 4 Test Hardware',
        description: 'Temporary hardware category for test verification',
      }),
    });
    const adminCatData = await adminCatCreate.json();
    assert(
      adminCatCreate.status === 201 && adminCatData.success && adminCatData.category.name === 'Stage 4 Test Hardware',
      'POST /api/categories - Admin creates category (201 Created)'
    );
    const testCatId = adminCatData.category.id;
    createdCategoryIds.push(testCatId);

    // Test 2.4: Duplicate category name rejection
    const dupCatRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Stage 4 Test Hardware' }),
    });
    assert(dupCatRes.status === 409, 'POST /api/categories - Duplicate category name returns 409 Conflict');

    // Test 2.5: Admin updates category
    const updateCatRes = await fetch(`${baseUrl}/api/categories/${testCatId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Stage 4 Test Hardware Updated',
        description: 'Updated description',
      }),
    });
    const updateCatData = await updateCatRes.json();
    assert(
      updateCatRes.status === 200 && updateCatData.category.name === 'Stage 4 Test Hardware Updated',
      'PUT /api/categories/:id - Admin updates category (200 OK)'
    );

    // Test 2.6: Non-admin cannot delete category
    const custCatDel = await fetch(`${baseUrl}/api/categories/${testCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custCatDel.status === 403, 'DELETE /api/categories/:id - Customer cannot delete category (403)');

    // =========================================================================
    // 3. PRODUCT BROWSING & QUERYING (PUBLIC)
    // =========================================================================
    console.log('\n--- 3. Testing Product Browsing & Querying (GET /api/products) ---');

    // Test 3.1: Public product listing with pagination
    const prodListRes = await fetch(`${baseUrl}/api/products?page=1&limit=3`);
    const prodListData = await prodListRes.json();
    assert(
      prodListRes.status === 200 &&
        prodListData.success &&
        prodListData.products.length === 3 &&
        prodListData.pagination.total >= 6,
      'GET /api/products - Returns paginated products (limit 3)'
    );

    // Test 3.2: Price filter
    const priceFilterRes = await fetch(`${baseUrl}/api/products?min_price=100&max_price=160`);
    const priceFilterData = await priceFilterRes.json();
    const pricesValid = priceFilterData.products.every((p) => p.price >= 100 && p.price <= 160);
    assert(
      priceFilterRes.status === 200 && pricesValid && priceFilterData.products.length > 0,
      'GET /api/products - Price range filter ($100 - $160) works accurately'
    );

    // Test 3.3: Keyword search
    const searchRes = await fetch(`${baseUrl}/api/products?search=Headphones`);
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchData.products.some((p) => p.name.includes('Headphones')),
      'GET /api/products?search=Headphones - Keyword search returns matching product'
    );

    // Test 3.4: Single product details (GET /api/products/:id)
    const seededProductId = 'f0000000-0000-0000-0000-000000000001';
    const prodDetailRes = await fetch(`${baseUrl}/api/products/${seededProductId}`);
    const prodDetailData = await prodDetailRes.json();
    assert(
      prodDetailRes.status === 200 &&
        prodDetailData.product.name.includes('Aura Wireless') &&
        Array.isArray(prodDetailData.product.images) &&
        prodDetailData.product.vendor_name === 'Aura Sound Labs',
      'GET /api/products/:id - Returns complete product info with images and vendor name'
    );

    // =========================================================================
    // 4. PRODUCT CREATION & APPROVAL ENFORCEMENT
    // =========================================================================
    console.log('\n--- 4. Testing Product Creation & Vendor Approval Checks ---');

    // Test 4.1: Customer cannot create product
    const custCreateProd = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        name: 'Customer Product Attempt',
        price: 19.99,
        stock: 5,
      }),
    });
    assert(custCreateProd.status === 403, 'POST /api/products - Customer cannot create product (403)');

    // Test 4.2: Pending (unapproved) vendor cannot create product
    const pendingCreateProd = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pendingVendorToken}`,
      },
      body: JSON.stringify({
        name: 'Pending Vendor Product',
        price: 49.99,
        stock: 10,
      }),
    });
    assert(
      pendingCreateProd.status === 403,
      'POST /api/products - Unapproved/Pending vendor rejected with 403 Forbidden'
    );

    // Test 4.3: Approved vendor creates product successfully
    const createProdRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techcraftToken}`,
      },
      body: JSON.stringify({
        name: 'TechCraft Ultra Gaming Desk Mat',
        description: 'Micro-textured waterproof surface with stitched edges',
        price: 29.99,
        stock: 100,
        categoryId: testCatId,
        imageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800',
      }),
    });
    const createProdData = await createProdRes.json();
    assert(
      createProdRes.status === 201 &&
        createProdData.success &&
        createProdData.product.name === 'TechCraft Ultra Gaming Desk Mat' &&
        createProdData.product.vendor_name === 'TechCraft Innovations' &&
        createProdData.product.images.length === 1,
      'POST /api/products - Approved vendor creates product with primary image'
    );
    const techcraftProdId = createProdData.product.id;
    createdProductIds.push(techcraftProdId);

    // Test 4.4: Product validation (missing name, negative price/stock)
    const badProdRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techcraftToken}`,
      },
      body: JSON.stringify({
        name: '',
        price: -5.0,
        stock: -1,
      }),
    });
    assert(badProdRes.status === 400, 'POST /api/products - Invalid price/stock/name rejected with 400');

    // =========================================================================
    // 5. PRODUCT UPDATE & OWNERSHIP ENFORCEMENT
    // =========================================================================
    console.log('\n--- 5. Testing Product Update & Ownership Authorization ---');

    // Test 5.1: TechCraft vendor updates their OWN product
    const ownUpdateRes = await fetch(`${baseUrl}/api/products/${techcraftProdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techcraftToken}`,
      },
      body: JSON.stringify({
        price: 34.99,
        stock: 85,
      }),
    });
    const ownUpdateData = await ownUpdateRes.json();
    assert(
      ownUpdateRes.status === 200 && ownUpdateData.product.price === 34.99 && ownUpdateData.product.stock === 85,
      'PUT /api/products/:id - Vendor updates own product (200 OK)'
    );

    // Test 5.2: AuraSound vendor tries to update TechCraft's product -> 403 Forbidden!
    const crossVendorUpdate = await fetch(`${baseUrl}/api/products/${techcraftProdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aurasoundToken}`,
      },
      body: JSON.stringify({
        name: 'Hacked by Competitor',
      }),
    });
    assert(
      crossVendorUpdate.status === 403,
      'PUT /api/products/:id - Vendor modifying another vendor product rejected with 403'
    );

    // Test 5.3: Customer tries to update product -> 403 Forbidden
    const custProdUpdate = await fetch(`${baseUrl}/api/products/${techcraftProdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ price: 1.0 }),
    });
    assert(custProdUpdate.status === 403, 'PUT /api/products/:id - Customer modifying product rejected with 403');

    // Test 5.4: Admin can update any product
    const adminProdUpdate = await fetch(`${baseUrl}/api/products/${techcraftProdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Admin verified and updated description',
      }),
    });
    assert(adminProdUpdate.status === 200, 'PUT /api/products/:id - Admin successfully updates product (200 OK)');

    // =========================================================================
    // 6. PRODUCT IMAGES MANAGEMENT
    // =========================================================================
    console.log('\n--- 6. Testing Product Images Management (POST/DELETE /api/products/:id/images) ---');

    // Test 6.1: Vendor adds second image to own product
    const addImgRes = await fetch(`${baseUrl}/api/products/${techcraftProdId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techcraftToken}`,
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
        isPrimary: false,
      }),
    });
    const addImgData = await addImgRes.json();
    assert(
      addImgRes.status === 201 && addImgData.success && !!addImgData.image.id,
      'POST /api/products/:id/images - Vendor adds image to own product (201 Created)'
    );
    const newImageId = addImgData.image.id;

    // Test 6.2: Competitor vendor cannot add image to TechCraft's product
    const competitorImgRes = await fetch(`${baseUrl}/api/products/${techcraftProdId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aurasoundToken}`,
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-competitor?w=800',
      }),
    });
    assert(
      competitorImgRes.status === 403,
      'POST /api/products/:id/images - Competitor adding image rejected with 403'
    );

    // Test 6.3: Vendor removes image from own product
    const delImgRes = await fetch(`${baseUrl}/api/products/${techcraftProdId}/images/${newImageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${techcraftToken}` },
    });
    assert(delImgRes.status === 200, 'DELETE /api/products/:id/images/:imageId - Vendor removes image (200 OK)');

    // =========================================================================
    // 7. PRODUCT DELETION & SOFT-DELETE
    // =========================================================================
    console.log('\n--- 7. Testing Product Soft Deletion ---');

    // Test 7.1: Competitor vendor cannot delete TechCraft product
    const competitorDelProd = await fetch(`${baseUrl}/api/products/${techcraftProdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aurasoundToken}` },
    });
    assert(
      competitorDelProd.status === 403,
      'DELETE /api/products/:id - Competitor deleting product rejected with 403'
    );

    // Test 7.2: TechCraft vendor deletes own product
    const ownDelProd = await fetch(`${baseUrl}/api/products/${techcraftProdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${techcraftToken}` },
    });
    const ownDelData = await ownDelProd.json();
    assert(
      ownDelProd.status === 200 && ownDelData.product.status === 'inactive',
      'DELETE /api/products/:id - Owner vendor soft-deletes product (status: inactive)'
    );

    // Test 7.3: Product no longer appears in default public active listings
    const checkActiveRes = await fetch(`${baseUrl}/api/products?search=Desk+Mat`);
    const checkActiveData = await checkActiveRes.json();
    assert(
      checkActiveData.products.length === 0,
      'GET /api/products - Inactive product excluded from active marketplace browse'
    );

    // =========================================================================
    // 8. ADMIN CATEGORY DELETION CLEANUP
    // =========================================================================
    console.log('\n--- 8. Testing Admin Category Deletion ---');

    const adminCatDel = await fetch(`${baseUrl}/api/categories/${testCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCatDel.status === 200, 'DELETE /api/categories/:id - Admin deletes category (200 OK)');

    // =========================================================================
    // 9. STAGE 1, 2, 3 REGRESSION CHECKS
    // =========================================================================
    console.log('\n--- 9. Preserving Stage 1-3 Infrastructure & Auth Health ---');

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success, 'GET /api/health - 200 OK & running');

    const dbHealthRes = await fetch(`${baseUrl}/api/health/db`);
    const dbHealthData = await dbHealthRes.json();
    assert(
      dbHealthRes.status === 200 && dbHealthData.database === 'connected',
      'GET /api/health/db - 200 OK & database connected'
    );

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${techcraftToken}` },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.user.role === 'vendor' && !!meData.user.vendor,
      'GET /api/auth/me - Stage 3 Profile endpoint continues working'
    );
  } catch (err) {
    console.error('Unexpected error during Stage 4 test suite:', err);
    failed++;
  } finally {
    // Cleanup pending vendor test account (delete vendors first due to ON DELETE RESTRICT)
    await pool.query("DELETE FROM vendors WHERE user_id IN (SELECT id FROM users WHERE email = 'pending.vendor@test.com')");
    await pool.query("DELETE FROM users WHERE email = 'pending.vendor@test.com'");
    for (const pid of createdProductIds) {
      await pool.query('DELETE FROM products WHERE id = $1', [pid]);
    }
    for (const cid of createdCategoryIds) {
      await pool.query('DELETE FROM categories WHERE id = $1', [cid]);
    }
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log(`Stage 4 Test Results: Total Passed: ${passed}, Total Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage4Tests();
