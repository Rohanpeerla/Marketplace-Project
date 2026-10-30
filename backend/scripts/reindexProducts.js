#!/usr/bin/env node

/**
 * Bulk reindex CLI script: npm run search:reindex
 * Reads all products from PostgreSQL and indexes them into Elasticsearch.
 */

const { pool, testConnection } = require('../src/config/db');
const { esClient, testEsConnection } = require('../src/config/elasticsearch');
const { reindexAllProducts } = require('../src/services/searchService');

const runReindex = async () => {
  console.log('====================================================');
  console.log(' MarketHub - Bulk Elasticsearch Product Reindexing ');
  console.log('====================================================');

  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('[Error] PostgreSQL connection failed. Aborting reindex.');
      await pool.end();
      process.exit(1);
    }

    const esConnected = await testEsConnection();
    if (!esConnected) {
      console.error('[Error] Elasticsearch connection failed. Aborting reindex.');
      await pool.end();
      process.exit(1);
    }

    console.log('[Reindex] Starting bulk reindexing of products...');
    const result = await reindexAllProducts();

    console.log('----------------------------------------------------');
    console.log(`[Success] Total PostgreSQL products found: ${result.total}`);
    console.log(`[Success] Products indexed in Elasticsearch: ${result.indexed}`);
    console.log(`[Success] Failures: ${result.failed}`);
    console.log(`[Success] Duration: ${result.duration_ms} ms`);
    console.log('====================================================');

    await pool.end();
    await esClient.close();
    if (result.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('[Fatal Error] Reindexing failed:', error);
    try {
      await pool.end();
      await esClient.close();
    } catch (_) {}
    process.exit(1);
  }
};

runReindex();
