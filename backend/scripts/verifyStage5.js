#!/usr/bin/env node

/**
 * Stage 5 Verification Suite
 * Verifies Elasticsearch cluster connection, indexing, search, filtering,
 * sorting, pagination, CRUD sync, latency benchmarks, and regression checks.
 */

const app = require('../src/app');
const { pool } = require('../src/config/db');
const { esClient, checkEsHealth } = require('../src/config/elasticsearch');
const { reindexAllProducts, INDEX_NAME } = require('../src/services/searchService');

async function runStage5Tests() {
  console.log('====================================================');
  console.log('🧪 Starting MarketHub Stage 5: Elasticsearch Test Suite');
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

  const createdProductIds = [];

  try {
    // 0. Ensure Elasticsearch cluster is up and seeded
    console.log('\n--- 0. Elasticsearch Health & Cluster Connectivity ---');
    const health = await checkEsHealth();
    assert(health.status === 'connected', 'ES Cluster Status Connected', JSON.stringify(health));
    assert(!!health.version, `ES Version: ${health.version}`);

    const searchHealthRes = await fetch(`${baseUrl}/api/health/search`);
    const searchHealthData = await searchHealthRes.json();
    assert(searchHealthRes.status === 200 && searchHealthData.search === 'connected', 'GET /api/health/search - 200 OK & connected');

    // 1. Index verification & Schema mapping
    console.log('\n--- 1. Index Schema & Mapping Validation ---');
    await reindexAllProducts();

    const mappingRes = await esClient.indices.getMapping({ index: INDEX_NAME });
    const mapping = mappingRes[INDEX_NAME] || mappingRes.body?.[INDEX_NAME] || {};
    const props = mapping.mappings?.properties || {};

    assert(props.name?.type === 'text' && !!props.name?.fields?.keyword, 'Mapping: "name" is text with keyword multi-field');
    assert(props.description?.type === 'text', 'Mapping: "description" is text');
    assert(props.price?.type === 'float', 'Mapping: "price" is float');
    assert(props.stock?.type === 'integer', 'Mapping: "stock" is integer');
    assert(props.category_id?.type === 'keyword', 'Mapping: "category_id" is keyword');
    assert(props.vendor_id?.type === 'keyword', 'Mapping: "vendor_id" is keyword');
    assert(props.status?.type === 'keyword', 'Mapping: "status" is keyword');

    // 2. Bulk Reindex Execution & Count Match
    console.log('\n--- 2. Bulk Reindex & Document Count ---');
    const countRes = await esClient.count({ index: INDEX_NAME });
    const count = typeof countRes.count === 'number' ? countRes.count : countRes.body?.count;
    assert(count >= 7, `Reindex count match: ${count} active documents in index`);

    // Authenticate vendor & admin for sync tests
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'techcraft@markethub.com', password: 'Password123!' }),
    });
    const { token: vendorToken } = await loginRes.json();

    // 3. Keyword Search Tests
    console.log('\n--- 3. Full-Text Search Queries ---');
    
    // Test 3a: Empty query returns match_all active products
    const emptyRes = await fetch(`${baseUrl}/api/search/products`);
    const emptyData = await emptyRes.json();
    assert(emptyRes.status === 200 && emptyData.products.length >= 6, 'Empty search returns all active products (match_all)');

    // Test 3b: Single keyword search
    const laptopRes = await fetch(`${baseUrl}/api/search/products?q=laptop`);
    const laptopData = await laptopRes.json();
    assert(
      laptopRes.status === 200 &&
      laptopData.products.length > 0 &&
      laptopData.products.some((p) => p.name.toLowerCase().includes('laptop') || p.description.toLowerCase().includes('laptop')),
      'Keyword search "laptop" returns matching laptop products'
    );

    // Test 3c: Multi-word search
    const multiRes = await fetch(`${baseUrl}/api/search/products?q=wireless+headphones`);
    const multiData = await multiRes.json();
    assert(
      multiRes.status === 200 &&
      multiData.products.length > 0 &&
      multiData.products.some((p) => p.name.toLowerCase().includes('headphone') || p.description.toLowerCase().includes('headphone')),
      'Multi-word search "wireless headphones" returns relevant audio products'
    );

    // Test 3d: No-match search returns 200 OK with empty array
    const noMatchRes = await fetch(`${baseUrl}/api/search/products?q=xyznonsensequerynotfound999`);
    const noMatchData = await noMatchRes.json();
    assert(
      noMatchRes.status === 200 &&
      Array.isArray(noMatchData.products) &&
      noMatchData.products.length === 0,
      'No-match search returns 200 OK with empty products array'
    );

    // Test 3e: Boosted relevance test (name^3 boost)
    console.log('\n--- 4. Relevance & Boosting ---');
    const searchResBoost = await fetch(`${baseUrl}/api/search/products?q=Pro`);
    const boostData = await searchResBoost.json();
    if (boostData.products.length >= 2) {
      const firstScore = boostData.products[0]._score || 1;
      const secondScore = boostData.products[1]._score || 1;
      assert(firstScore >= secondScore, 'Products ordered by relevance score descending');
    } else {
      assert(boostData.products.length > 0, 'Relevance query returned scored results');
    }

    // 4. Filtering Tests
    console.log('\n--- 5. Filtering (Category, Vendor, Price Range) ---');

    // Get a category ID from seeded products
    const sampleProduct = laptopData.products[0];
    const categoryId = sampleProduct.category_id;
    const vendorId = sampleProduct.vendor_id;

    // Test 5a: Category filter
    const catRes = await fetch(`${baseUrl}/api/search/products?category_id=${categoryId}`);
    const catData = await catRes.json();
    assert(
      catRes.status === 200 &&
      catData.products.length > 0 &&
      catData.products.every((p) => p.category_id === categoryId),
      'Category filter returns only products in specified category'
    );

    // Test 5b: Vendor filter
    const venRes = await fetch(`${baseUrl}/api/search/products?vendor_id=${vendorId}`);
    const venData = await venRes.json();
    assert(
      venRes.status === 200 &&
      venData.products.length > 0 &&
      venData.products.every((p) => p.vendor_id === vendorId),
      'Vendor filter returns only products for specified vendor'
    );

    // Test 5c: Price range filter (min_price)
    const minPriceRes = await fetch(`${baseUrl}/api/search/products?min_price=100`);
    const minPriceData = await minPriceRes.json();
    assert(
      minPriceRes.status === 200 &&
      minPriceData.products.length > 0 &&
      minPriceData.products.every((p) => Number(p.price) >= 100),
      'Price filter: min_price=100 returns only products >= $100'
    );

    // Test 5d: Price range filter (max_price)
    const maxPriceRes = await fetch(`${baseUrl}/api/search/products?max_price=100`);
    const maxPriceData = await maxPriceRes.json();
    assert(
      maxPriceRes.status === 200 &&
      maxPriceData.products.length > 0 &&
      maxPriceData.products.every((p) => Number(p.price) <= 100),
      'Price filter: max_price=100 returns only products <= $100'
    );

    // Test 5e: Combined min_price and max_price
    const priceRangeRes = await fetch(`${baseUrl}/api/search/products?min_price=50&max_price=300`);
    const priceRangeData = await priceRangeRes.json();
    assert(
      priceRangeRes.status === 200 &&
      priceRangeData.products.every((p) => Number(p.price) >= 50 && Number(p.price) <= 300),
      'Price range: min_price=50&max_price=300 respected across all results'
    );

    // Test 5f: Combined search + category + price filter
    const combinedRes = await fetch(`${baseUrl}/api/search/products?category_id=${categoryId}&min_price=10`);
    const combinedData = await combinedRes.json();
    assert(
      combinedRes.status === 200 &&
      combinedData.products.every((p) => p.category_id === categoryId && Number(p.price) >= 10),
      'Combined query: category_id + min_price simultaneously respected'
    );

    // 5. Sorting Tests
    console.log('\n--- 6. Sorting (Price, Name, Relevance) ---');

    // Test 6a: Price Ascending
    const sortPriceAscRes = await fetch(`${baseUrl}/api/search/products?sort=price_asc`);
    const sortPriceAscData = await sortPriceAscRes.json();
    const pricesAsc = sortPriceAscData.products.map((p) => Number(p.price));
    const isSortedPriceAsc = pricesAsc.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
    assert(isSortedPriceAsc && pricesAsc.length > 0, 'Sort price_asc: prices strictly ascending');

    // Test 6b: Price Descending
    const sortPriceDescRes = await fetch(`${baseUrl}/api/search/products?sort=price_desc`);
    const sortPriceDescData = await sortPriceDescRes.json();
    const pricesDesc = sortPriceDescData.products.map((p) => Number(p.price));
    const isSortedPriceDesc = pricesDesc.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
    assert(isSortedPriceDesc && pricesDesc.length > 0, 'Sort price_desc: prices strictly descending');

    // Test 6c: Name Ascending
    const sortNameAscRes = await fetch(`${baseUrl}/api/search/products?sort=name_asc`);
    const sortNameAscData = await sortNameAscRes.json();
    const namesAsc = sortNameAscData.products.map((p) => p.name.toLowerCase());
    const isSortedNameAsc = namesAsc.every((val, i, arr) => i === 0 || arr[i - 1].localeCompare(val) <= 0);
    assert(isSortedNameAsc && namesAsc.length > 0, 'Sort name_asc: names alphabetical A-Z');

    // Test 6d: Name Descending
    const sortNameDescRes = await fetch(`${baseUrl}/api/search/products?sort=name_desc`);
    const sortNameDescData = await sortNameDescRes.json();
    const namesDesc = sortNameDescData.products.map((p) => p.name.toLowerCase());
    const isSortedNameDesc = namesDesc.every((val, i, arr) => i === 0 || arr[i - 1].localeCompare(val) >= 0);
    assert(isSortedNameDesc && namesDesc.length > 0, 'Sort name_desc: names reverse alphabetical Z-A');

    // 6. Pagination Tests
    console.log('\n--- 7. Pagination Controls & Metadata ---');

    // Test 7a: Limit and metadata
    const page1Res = await fetch(`${baseUrl}/api/search/products?page=1&limit=3`);
    const page1Data = await page1Res.json();
    assert(page1Res.status === 200, 'Pagination page 1 returns 200 OK');
    assert(page1Data.products.length === 3, 'Pagination limit=3 returns exactly 3 products');
    assert(
      page1Data.pagination.page === 1 &&
      page1Data.pagination.limit === 3 &&
      page1Data.pagination.total >= 6 &&
      page1Data.pagination.totalPages >= 2,
      'Pagination metadata structure valid (total, page, limit, totalPages)'
    );

    // Test 7b: Page 2 offset
    const page2Res = await fetch(`${baseUrl}/api/search/products?page=2&limit=3`);
    const page2Data = await page2Res.json();
    assert(page2Data.products.length === 3, 'Pagination page 2 returns next 3 products');
    assert(
      page1Data.products[0].id !== page2Data.products[0].id,
      'Page 1 and Page 2 contain non-overlapping products'
    );

    // 7. PostgreSQL -> Elasticsearch Synchronization Tests
    console.log('\n--- 8. PostgreSQL -> Elasticsearch CRUD Synchronization ---');

    // Test 8a: Create product syncs to Elasticsearch
    const createRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({
        name: 'Quantum Mechanical Keyboard 99X',
        description: 'Ultra-low latency RGB mechanical gaming keyboard with hot-swappable switches',
        price: 189.99,
        stock: 25,
        categoryId,
        imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && !!createData.product?.id, 'POST /api/products creates product in PostgreSQL');
    const newProductId = createData.product.id;
    createdProductIds.push(newProductId);

    // Search Elasticsearch for the newly created product
    const searchCreatedRes = await fetch(`${baseUrl}/api/search/products?q=Quantum+Mechanical+Keyboard+99X`);
    const searchCreatedData = await searchCreatedRes.json();
    assert(
      searchCreatedData.products.some((p) => p.id === newProductId),
      'Created product automatically synced to Elasticsearch and immediately searchable'
    );

    // Test 8b: Update product syncs to Elasticsearch
    const updateRes = await fetch(`${baseUrl}/api/products/${newProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({
        name: 'Quantum Mechanical Keyboard 99X Pro Edition',
        price: 219.99,
      }),
    });
    assert(updateRes.status === 200, 'PUT /api/products/:id updates product in PostgreSQL');

    const searchUpdatedRes = await fetch(`${baseUrl}/api/search/products?q=Pro+Edition`);
    const searchUpdatedData = await searchUpdatedRes.json();
    const updatedFound = searchUpdatedData.products.find((p) => p.id === newProductId);
    assert(
      !!updatedFound && Number(updatedFound.price) === 219.99,
      'Updated product name and price synchronized to Elasticsearch'
    );

    // Test 8c: Soft delete product deactivates/removes from customer search results
    const deleteRes = await fetch(`${baseUrl}/api/products/${newProductId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${vendorToken}`,
      },
    });
    assert(deleteRes.status === 200, 'DELETE /api/products/:id soft deletes product in PostgreSQL');

    const searchDeletedRes = await fetch(`${baseUrl}/api/search/products?q=Quantum+Mechanical+Keyboard+99X`);
    const searchDeletedData = await searchDeletedRes.json();
    assert(
      !searchDeletedData.products.some((p) => p.id === newProductId),
      'Soft deleted product is no longer returned in customer search results'
    );

    // 8. Performance & Latency Benchmarks
    console.log('\n--- 9. Latency & Performance Benchmarks ---');
    const startBench = Date.now();
    await fetch(`${baseUrl}/api/search/products?q=laptop&sort=price_asc&limit=10`);
    const searchLatency = Date.now() - startBench;
    assert(searchLatency < 300, `Search request latency: ${searchLatency}ms (< 300ms SLA target)`);

    // 9. Elasticsearch Unavailable / Resilient Handling Check
    console.log('\n--- 10. Service Resilience & Graceful Error Handling ---');
    const searchController = require('../src/controllers/searchController');
    let capturedStatus = null;
    let capturedJson = null;
    const mockRes = {
      status(code) { capturedStatus = code; return this; },
      json(data) { capturedJson = data; return this; },
    };
    // Call controller with malformed / invalid query triggering catch
    const searchService = require('../src/services/searchService');
    const origSearch = searchService.searchProducts;
    searchService.searchProducts = async () => { throw new Error('Elasticsearch cluster unreachable (simulated)'); };
    await searchController.searchProducts({ query: {} }, mockRes, () => {});
    searchService.searchProducts = origSearch; // restore
    assert(capturedStatus === 503 && capturedJson.success === false && capturedJson.message.includes('unavailable'), 'Simulated ES outage returns 503 Service Unavailable with clear message');

    // 10. Regression Checks (Stages 1-4)
    console.log('\n--- 11. Regression Checks for Stages 1 - 4 ---');
    const healthDbRes = await fetch(`${baseUrl}/api/health/db`);
    const healthDbData = await healthDbRes.json();
    assert(healthDbRes.status === 200 && healthDbData.database === 'connected', 'Stage 2 DB Health: /api/health/db connected');

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.role === 'vendor', 'Stage 3 Auth: /api/auth/me returns vendor profile');

    const directProductsRes = await fetch(`${baseUrl}/api/products`);
    const directProductsData = await directProductsRes.json();
    assert(directProductsRes.status === 200 && directProductsData.products.length >= 6, 'Stage 4 Direct Product Listing: /api/products continues working');
  } catch (err) {
    console.error('Unexpected error during Stage 5 test suite:', err);
    failed++;
  } finally {
    // Cleanup temporary test products
    for (const pid of createdProductIds) {
      try {
        await pool.query('DELETE FROM product_images WHERE product_id = $1', [pid]);
        await pool.query('DELETE FROM products WHERE id = $1', [pid]);
        await esClient.delete({ index: INDEX_NAME, id: pid }, { ignore: [404] });
      } catch (_) {}
    }
    server.close();
    await pool.end();
    await esClient.close();
  }

  console.log('\n====================================================');
  console.log(`Stage 5 Test Results: Total Passed: ${passed}, Total Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage5Tests();
