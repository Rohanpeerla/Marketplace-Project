const analyticsModel = require('../models/analyticsModel');

class AnalyticsService {
  async getOverview() {
    return analyticsModel.getOverview();
  }

  async getRevenueStats() {
    return analyticsModel.getRevenueStats();
  }

  async getOrdersStats() {
    const distribution = await analyticsModel.getOrderStatusDistribution();
    const totalOrders = distribution.reduce((sum, d) => sum + d.count, 0);
    const delivered = distribution.find(d => d.order_status === 'delivered')?.count || 0;
    const cancelled = distribution.find(d => d.order_status === 'cancelled')?.count || 0;

    return {
      distribution,
      totalOrders,
      fulfillmentRate: totalOrders > 0 ? Math.round((delivered / totalOrders) * 100 * 10) / 10 : 0,
      cancellationRate: totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100 * 10) / 10 : 0
    };
  }

  async getProductAnalytics() {
    return analyticsModel.getProductAnalytics();
  }

  async getVendorAnalytics() {
    return analyticsModel.getVendorAnalytics();
  }
}

module.exports = new AnalyticsService();
