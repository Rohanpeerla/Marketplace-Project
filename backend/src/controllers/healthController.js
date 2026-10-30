const { checkHealth } = require('../config/db');
const { checkEsHealth } = require('../config/elasticsearch');
const redis = require('../config/redis');

/**
 * Redis health check controller. Never exposes URL or credentials.
 * @route GET /api/health/redis
 */
const getRedisHealth = async (req, res) => {
  const health = await redis.checkHealth();
  if (health.connected) {
    return res.status(200).json({ success: true, redis: 'connected', latencyMs: health.latencyMs });
  }
  return res.status(503).json({
    success: false,
    redis: 'disconnected',
    message: 'Redis cache is unavailable. Cart falls back to PostgreSQL.',
  });
};

/**
 * Health check controller.
 * Validates backend operational status for clients and monitors.
 * @route GET /api/health
 */
const getHealthStatus = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'MarketHub API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Database health check controller.
 * Validates PostgreSQL connection status without exposing credentials.
 * @route GET /api/health/db
 */
const getDatabaseHealth = async (req, res, next) => {
  try {
    const health = await checkHealth();

    if (health.isConnected) {
      return res.status(200).json({
        success: true,
        database: 'connected',
        latencyMs: health.latencyMs,
      });
    }

    return res.status(503).json({
      success: false,
      database: 'disconnected',
      message: health.message,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      database: 'disconnected',
      message: 'Database connection check failed.',
    });
  }
};

/**
 * Elasticsearch search health check controller.
 * Validates Elasticsearch connection status.
 * @route GET /api/health/search
 */
const getSearchHealth = async (req, res, next) => {
  try {
    const health = await checkEsHealth();

    if (health.status === 'connected') {
      return res.status(200).json({
        success: true,
        search: 'connected',
        cluster_name: health.cluster_name,
        cluster_status: health.cluster_status,
        version: health.version,
        latency_ms: health.latency_ms,
      });
    }

    return res.status(503).json({
      success: false,
      search: 'disconnected',
      message: 'Elasticsearch connection check failed.',
      error: health.error,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      search: 'disconnected',
      message: 'Search service health check failed.',
      error: error.message,
    });
  }
};

module.exports = {
  getHealthStatus,
  getDatabaseHealth,
  getSearchHealth,
  getRedisHealth,
};
