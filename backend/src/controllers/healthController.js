/**
 * Health check controller.
 * Validates backend operational status for clients and monitors.
 */
const getHealthStatus = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'MarketHub API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealthStatus,
};
