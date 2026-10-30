const { Client } = require('@elastic/elasticsearch');
const config = require('./env');

/**
 * Elasticsearch Client configuration.
 * Uses official @elastic/elasticsearch client pointing to config.elasticsearchUrl.
 */
const esClient = new Client({
  node: config.elasticsearchUrl,
  maxRetries: 3,
  requestTimeout: 10000,
});

/**
 * Test Elasticsearch connection on startup.
 * Non-blocking: Server continues to run even if Elasticsearch is not yet started.
 */
const testEsConnection = async () => {
  try {
    const info = await esClient.info();
    const clusterName = info.body ? info.body.cluster_name : info.cluster_name;
    const version = info.body ? info.body.version?.number : info.version?.number;
    console.log(`[Elasticsearch] Connected successfully to cluster "${clusterName}" (v${version})`);
    return true;
  } catch (error) {
    console.warn(`[Elasticsearch] Notice: Could not connect to Elasticsearch at ${config.elasticsearchUrl} (${error.message}). Operations will gracefully degrade.`);
    return false;
  }
};

/**
 * Check Elasticsearch health for GET /api/health/search.
 */
const checkEsHealth = async () => {
  const start = Date.now();
  try {
    const health = await esClient.cluster.health();
    const info = await esClient.info();
    const clusterHealth = health.body || health;
    const clusterInfo = info.body || info;

    return {
      status: 'connected',
      cluster_name: clusterHealth.cluster_name || clusterInfo.cluster_name,
      cluster_status: clusterHealth.status,
      version: clusterInfo.version?.number,
      number_of_nodes: clusterHealth.number_of_nodes,
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
      latency_ms: Date.now() - start,
    };
  }
};

module.exports = {
  esClient,
  testEsConnection,
  checkEsHealth,
};

