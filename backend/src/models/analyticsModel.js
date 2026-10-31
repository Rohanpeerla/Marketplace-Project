const { query } = require('../config/db');

const analyticsModel = {
  /**
   * Platform Overview KPIs
   */
  async getOverview() {
    const sql = `
      SELECT
        (SELECT COALESCE(SUM(total_amount), 0)::FLOAT FROM orders WHERE payment_status = 'paid') AS total_revenue,
        (SELECT COUNT(*)::INT FROM orders) AS total_orders,
        (SELECT COUNT(*)::INT FROM orders WHERE order_status = 'delivered') AS delivered_orders,
        (SELECT COUNT(*)::INT FROM orders WHERE order_status = 'cancelled') AS cancelled_orders,
        (SELECT COUNT(*)::INT FROM users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*)::INT FROM vendors WHERE status = 'approved') AS total_approved_vendors,
        (SELECT COUNT(*)::INT FROM products WHERE status = 'active') AS total_active_products,
        (SELECT COALESCE(ROUND(AVG(total_amount)::NUMERIC, 2), 0)::FLOAT FROM orders WHERE payment_status = 'paid') AS average_order_value,
        (SELECT COALESCE(SUM(discount_amount), 0)::FLOAT FROM orders) AS total_discounts_given;
    `;
    const res = await query(sql);
    return res.rows[0];
  },

  /**
   * Revenue analytics by month and recent daily trend
   */
  async getRevenueStats() {
    const monthlySql = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::INT AS order_count,
        COALESCE(SUM(total_amount), 0)::FLOAT AS revenue,
        COALESCE(SUM(discount_amount), 0)::FLOAT AS total_discounts
      FROM orders
      WHERE payment_status = 'paid'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12;
    `;

    const dailySql = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
        COUNT(*)::INT AS order_count,
        COALESCE(SUM(total_amount), 0)::FLOAT AS revenue
      FROM orders
      WHERE payment_status = 'paid' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY day ASC;
    `;

    const paymentMethodsSql = `
      SELECT 
        COALESCE(payment_provider, 'unknown') AS provider,
        status,
        COUNT(*)::INT AS count,
        COALESCE(SUM(amount), 0)::FLOAT AS total_amount
      FROM payments
      GROUP BY payment_provider, status;
    `;

    const [monthlyRes, dailyRes, paymentsRes] = await Promise.all([
      query(monthlySql),
      query(dailySql),
      query(paymentMethodsSql)
    ]);

    return {
      monthly: monthlyRes.rows.reverse(),
      daily: dailyRes.rows,
      payments: paymentsRes.rows
    };
  },

  /**
   * Orders distribution by status
   */
  async getOrderStatusDistribution() {
    const sql = `
      SELECT 
        order_status,
        COUNT(*)::INT AS count,
        COALESCE(SUM(total_amount), 0)::FLOAT AS total_value
      FROM orders
      GROUP BY order_status
      ORDER BY count DESC;
    `;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Top selling products & low stock alerts
   */
  async getProductAnalytics() {
    const topProductsSql = `
      SELECT 
        p.id,
        p.name,
        p.price::FLOAT AS price,
        COALESCE(SUM(oi.quantity), 0)::INT AS total_sold,
        COALESCE(SUM(oi.subtotal), 0)::FLOAT AS total_sales,
        v.business_name AS vendor_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN vendors v ON v.id = p.vendor_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.order_status NOT IN ('cancelled')
      GROUP BY p.id, p.name, p.price, v.business_name
      ORDER BY total_sold DESC
      LIMIT 10;
    `;

    const lowStockSql = `
      SELECT 
        p.id,
        p.name,
        p.stock,
        p.price::FLOAT AS price,
        v.business_name AS vendor_name
      FROM products p
      LEFT JOIN vendors v ON v.id = p.vendor_id
      WHERE p.status = 'active' AND p.stock <= 5
      ORDER BY p.stock ASC
      LIMIT 10;
    `;

    const [topRes, lowRes] = await Promise.all([
      query(topProductsSql),
      query(lowStockSql)
    ]);

    return {
      topSelling: topRes.rows,
      lowStock: lowRes.rows
    };
  },

  /**
   * Vendor analytics & performance rankings
   */
  async getVendorAnalytics() {
    const sql = `
      SELECT 
        v.id AS vendor_id,
        v.business_name,
        v.business_email,
        v.status AS vendor_status,
        COUNT(DISTINCT o.id)::INT AS total_orders,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0)::FLOAT AS total_revenue,
        COUNT(DISTINCT p.id)::INT AS product_count
      FROM vendors v
      LEFT JOIN orders o ON o.vendor_id = v.id
      LEFT JOIN products p ON p.vendor_id = v.id
      GROUP BY v.id, v.business_name, v.business_email, v.status
      ORDER BY total_revenue DESC
      LIMIT 20;
    `;
    const res = await query(sql);
    return res.rows;
  }
};

module.exports = analyticsModel;
