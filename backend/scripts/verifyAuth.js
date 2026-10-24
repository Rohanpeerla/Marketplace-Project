const app = require('../src/app');
const { pool } = require('../src/config/db');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting MarketHub Stage 3 Auth & RBAC Test Suite');
  console.log('====================================================\n');

  // Start ephemeral server
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

  try {
    // Clean up any test accounts from previous runs
    await pool.query("DELETE FROM users WHERE email IN ('test.customer.stage3@example.com', 'test.vendor.stage3@example.com')");

    // =========================================================================
    // 1. REGISTRATION TESTS
    // =========================================================================
    console.log('\n--- 1. Testing Registration Endpoint (POST /api/auth/register) ---');

    // Test 1.1: Successful Customer Registration
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Stage3 Test Customer',
        email: 'test.customer.stage3@example.com',
        password: 'SecurePassword123!',
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 && regData.success === true && regData.user.email === 'test.customer.stage3@example.com' && !regData.user.password_hash,
      'Customer Registration - 201 Created & no password_hash exposed',
      JSON.stringify(regData)
    );

    // Test 1.2: Duplicate Email Rejection
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Test',
        email: 'test.customer.stage3@example.com',
        password: 'SecurePassword123!',
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 409 && dupData.success === false,
      'Duplicate Email Rejection - 409 Conflict',
      JSON.stringify(dupData)
    );

    // Test 1.3: Invalid Email Format
    const badEmailRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'SecurePassword123!',
      }),
    });
    assert(badEmailRes.status === 400, 'Invalid Email Format - 400 Bad Request');

    // Test 1.4: Short Password (<6 chars)
    const shortPassRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pass User',
        email: 'shortpass@example.com',
        password: '123',
      }),
    });
    assert(shortPassRes.status === 400, 'Short Password - 400 Bad Request');

    // Test 1.5: Disallow Self-Registration as Admin
    const adminRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Admin Attempt',
        email: 'fakeadmin@example.com',
        password: 'SecurePassword123!',
        role: 'admin',
      }),
    });
    assert(adminRegRes.status === 403, 'Disallow Admin Registration - 403 Forbidden');

    // =========================================================================
    // 2. LOGIN TESTS & SEEDED ACCOUNTS
    // =========================================================================
    console.log('\n--- 2. Testing Login Endpoint (POST /api/auth/login) ---');

    // Test 2.1: Seeded Admin Login (admin@markethub.com / Password123!)
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@markethub.com',
        password: 'Password123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminLoginData.success === true && adminLoginData.user.role === 'admin' && !!adminLoginData.token,
      'Seeded Admin Login - 200 OK & JWT Issued',
      JSON.stringify(adminLoginData)
    );
    const adminToken = adminLoginData.token;

    // Test 2.2: Seeded Vendor Login (techcraft@markethub.com / Password123!)
    const vendorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'techcraft@markethub.com',
        password: 'Password123!',
      }),
    });
    const vendorLoginData = await vendorLoginRes.json();
    assert(
      vendorLoginRes.status === 200 && vendorLoginData.success === true && vendorLoginData.user.role === 'vendor' && !!vendorLoginData.token && !!vendorLoginData.user.vendor,
      'Seeded Vendor Login - 200 OK, JWT Issued & Vendor Details Included',
      JSON.stringify(vendorLoginData)
    );
    const vendorToken = vendorLoginData.token;

    // Test 2.3: Seeded Customer Login (john.doe@example.com / Password123!)
    const custLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'Password123!',
      }),
    });
    const custLoginData = await custLoginRes.json();
    assert(
      custLoginRes.status === 200 && custLoginData.success === true && custLoginData.user.role === 'customer' && !!custLoginData.token,
      'Seeded Customer Login - 200 OK & JWT Issued',
      JSON.stringify(custLoginData)
    );
    const customerToken = custLoginData.token;

    // Test 2.4: Invalid Password
    const badPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@markethub.com',
        password: 'WrongPassword!',
      }),
    });
    assert(badPassRes.status === 401, 'Invalid Password - 401 Unauthorized');

    // Test 2.5: Non-Existent User
    const nonUserRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doesnotexist@example.com',
        password: 'Password123!',
      }),
    });
    assert(nonUserRes.status === 401, 'Non-Existent User - 401 Unauthorized');

    // =========================================================================
    // 3. PROTECTED PROFILE ENDPOINT (GET /api/auth/me)
    // =========================================================================
    console.log('\n--- 3. Testing Protected Profile Endpoint (GET /api/auth/me) ---');

    // Test 3.1: Missing Token
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    assert(noTokenRes.status === 401, 'Profile with No Token - 401 Unauthorized');

    // Test 3.2: Invalid Token
    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert(badTokenRes.status === 403, 'Profile with Invalid Token - 403 Forbidden');

    // Test 3.3: Valid Customer Token
    const custProfileRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const custProfileData = await custProfileRes.json();
    assert(
      custProfileRes.status === 200 &&
        custProfileData.success === true &&
        custProfileData.user.email === 'john.doe@example.com' &&
        custProfileData.user.role === 'customer' &&
        !custProfileData.user.password_hash,
      'Profile with Customer Token - 200 OK & correct user data'
    );

    // Test 3.4: Valid Vendor Token
    const vendorProfileRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    const vendorProfileData = await vendorProfileRes.json();
    assert(
      vendorProfileRes.status === 200 &&
        vendorProfileData.success === true &&
        vendorProfileData.user.role === 'vendor' &&
        vendorProfileData.user.vendor.business_name === 'TechCraft Innovations',
      'Profile with Vendor Token - 200 OK & includes vendor details'
    );

    // =========================================================================
    // 4. ROLE-BASED AUTHORIZATION MATRIX TESTS
    // =========================================================================
    console.log('\n--- 4. Testing Role Authorization Matrix ---');

    // Matrix Tests
    const matrix = [
      { endpoint: '/api/auth/customer-test', roleTarget: 'customer', token: customerToken, expected: 200, userRole: 'customer' },
      { endpoint: '/api/auth/customer-test', roleTarget: 'customer', token: vendorToken, expected: 403, userRole: 'vendor' },
      { endpoint: '/api/auth/customer-test', roleTarget: 'customer', token: adminToken, expected: 403, userRole: 'admin' },

      { endpoint: '/api/auth/vendor-test', roleTarget: 'vendor', token: customerToken, expected: 403, userRole: 'customer' },
      { endpoint: '/api/auth/vendor-test', roleTarget: 'vendor', token: vendorToken, expected: 200, userRole: 'vendor' },
      { endpoint: '/api/auth/vendor-test', roleTarget: 'vendor', token: adminToken, expected: 403, userRole: 'admin' },

      { endpoint: '/api/auth/admin-test', roleTarget: 'admin', token: customerToken, expected: 403, userRole: 'customer' },
      { endpoint: '/api/auth/admin-test', roleTarget: 'admin', token: vendorToken, expected: 403, userRole: 'vendor' },
      { endpoint: '/api/auth/admin-test', roleTarget: 'admin', token: adminToken, expected: 200, userRole: 'admin' },
    ];

    for (const test of matrix) {
      const res = await fetch(`${baseUrl}${test.endpoint}`, {
        headers: { Authorization: `Bearer ${test.token}` },
      });
      assert(
        res.status === test.expected,
        `Role Check: [${test.userRole.toUpperCase()}] on ${test.endpoint} -> Expected ${test.expected}, Got ${res.status}`
      );
    }

    // =========================================================================
    // 5. EXISTING HEALTH CHECKS
    // =========================================================================
    console.log('\n--- 5. Testing Existing Health Checks ---');

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success === true, 'GET /api/health - 200 OK & success');

    const dbHealthRes = await fetch(`${baseUrl}/api/health/db`);
    const dbHealthData = await dbHealthRes.json();
    assert(
      dbHealthRes.status === 200 && dbHealthData.success === true && dbHealthData.database === 'connected',
      'GET /api/health/db - 200 OK & database connected'
    );

    // Clean up created test user
    await pool.query("DELETE FROM users WHERE email = 'test.customer.stage3@example.com'");
  } catch (err) {
    console.error('Unexpected error during test suite:', err);
    failed++;
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log(`Test Results Summary: Total Passed: ${passed}, Total Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
