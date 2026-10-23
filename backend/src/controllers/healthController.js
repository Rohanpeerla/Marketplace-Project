const { checkHealth } = require('../config/db');

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

module.exports = {
  getHealthStatus,
  getDatabaseHealth,
};
