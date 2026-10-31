const analyticsService = require('../services/analyticsService');

class AdminAnalyticsController {
  async getOverview(req, res, next) {
    try {
      const data = await analyticsService.getOverview();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRevenue(req, res, next) {
    try {
      const data = await analyticsService.getRevenueStats();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getOrders(req, res, next) {
    try {
      const data = await analyticsService.getOrdersStats();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getProducts(req, res, next) {
    try {
      const data = await analyticsService.getProductAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getVendors(req, res, next) {
    try {
      const data = await analyticsService.getVendorAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminAnalyticsController();

