const { pool } = require('../src/config/db');
const { reindexAllProducts } = require('../src/services/searchService');
const seedDatabase = require('../database/seedDb');

async function cleanTestProducts() {
  console.log('====================================================');
  console.log('🧹 MarketHub: Cleaning Up Residual Test Products');
  console.log('====================================================');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all test product IDs
    const testProds = await client.query(
      "SELECT id, name FROM products WHERE id::text NOT LIKE 'f0000000-%'"
    );
    console.log(`[Cleanup] Found ${testProds.rows.length} test products to remove.`);

    if (testProds.rows.length > 0) {
      const testIds = testProds.rows.map(p => p.id);

      // Find order_items referencing test products
      const orderItems = await client.query(
        "SELECT DISTINCT order_id FROM order_items WHERE product_id = ANY($1::uuid[])",
        [testIds]
      );
      const testOrderIds = orderItems.rows.map(o => o.order_id);

      if (testOrderIds.length > 0) {
        console.log(`[Cleanup] Removing ${testOrderIds.length} test orders...`);
        // Remove payments for these orders
        await client.query(
          "DELETE FROM payments WHERE order_id = ANY($1::uuid[])",
          [testOrderIds]
        );
        // Remove order_items
        await client.query(
          "DELETE FROM order_items WHERE order_id = ANY($1::uuid[])",
          [testOrderIds]
        );
        // Remove orders
        await client.query(
          "DELETE FROM orders WHERE id = ANY($1::uuid[])",
          [testOrderIds]
        );
      }

      // Remove cart_items referencing test products
      await client.query(
        "DELETE FROM cart_items WHERE product_id = ANY($1::uuid[])",
        [testIds]
      );

      // Remove reviews referencing test products
      await client.query(
        "DELETE FROM reviews WHERE product_id = ANY($1::uuid[])",
        [testIds]
      );

      // Remove product images referencing test products
      await client.query(
        "DELETE FROM product_images WHERE product_id = ANY($1::uuid[])",
        [testIds]
      );

      // Remove test products
      await client.query(
        "DELETE FROM products WHERE id = ANY($1::uuid[])",
        [testIds]
      );
    }

    // Clean up test categories created by test runs
    const testCats = await client.query(
      "DELETE FROM categories WHERE id::text NOT LIKE 'd0000000-%' RETURNING id, name"
    );
    if (testCats.rows.length > 0) {
      console.log(`[Cleanup] Removed ${testCats.rows.length} leftover test categories.`);
    }

    // Refresh timestamps on the 6 genuine seed products so they are fresh
    await client.query(
      "UPDATE products SET created_at = NOW() WHERE id::text LIKE 'f0000000-%'"
    );

    await client.query('COMMIT');
    console.log('[Cleanup] Database cleaned successfully.');

    // Count remaining products
    const remaining = await client.query("SELECT id, name FROM products ORDER BY created_at DESC");
    console.log(`[Cleanup] Remaining showcase products: ${remaining.rows.length}`);
    remaining.rows.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Cleanup Error]:', err);
    throw err;
  } finally {
    client.release();
  }

  // Ensure seed data is fully refreshed
  await seedDatabase();

  console.log('====================================================');
  console.log('✅ Database cleaned and seeded with the 6 Showcase Products!');
  console.log('   Now run: npm run search:reindex');
  console.log('====================================================');
}

if (require.main === module) {
  cleanTestProducts().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = cleanTestProducts;
