const { query } = require('../config/db');

const reviewModel = {
  /**
   * Check if a user has purchased a product
   */
  async checkUserPurchasedProduct(userId, productId) {
    const sql = `
      SELECT oi.id, o.id AS order_id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = $1
        AND oi.product_id = $2
        AND o.order_status IN ('confirmed', 'processing', 'placed', 'packed', 'shipped', 'delivered')
      ORDER BY o.created_at DESC
      LIMIT 1;
    `;
    const result = await query(sql, [userId, productId]);
    return result.rows[0] || null;
  },

  /**
   * Find existing review by user and product
   */
  async findByUserAndProduct(userId, productId) {
    const sql = `
      SELECT * FROM reviews
      WHERE user_id = $1 AND product_id = $2;
    `;
    const result = await query(sql, [userId, productId]);
    return result.rows[0] || null;
  },

  /**
   * Find review by ID
   */
  async findById(id) {
    const sql = `
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = $1;
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  /**
   * Create a review
   */
  async create({ userId, productId, orderId, rating, comment }) {
    const sql = `
      INSERT INTO reviews (user_id, product_id, order_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await query(sql, [userId, productId, orderId || null, rating, comment || null]);
    return result.rows[0];
  },

  /**
   * Update a review
   */
  async update(id, { rating, comment }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (rating !== undefined) {
      fields.push(`rating = $${idx++}`);
      values.push(rating);
    }
    if (comment !== undefined) {
      fields.push(`comment = $${idx++}`);
      values.push(comment);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const sql = `
      UPDATE reviews
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idx}
      RETURNING *;
    `;
    const result = await query(sql, values);
    return result.rows[0];
  },

  /**
   * Delete a review
   */
  async delete(id) {
    const sql = `DELETE FROM reviews WHERE id = $1 RETURNING *;`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  /**
   * Get reviews by product ID with pagination
   */
  async findByProductId(productId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const countSql = `SELECT COUNT(*) AS total FROM reviews WHERE product_id = $1;`;
    const countRes = await query(countSql, [productId]);
    const total = parseInt(countRes.rows[0].total, 10);

    const listSql = `
      SELECT r.id, r.user_id, r.product_id, r.rating, r.comment, r.created_at, r.updated_at,
             u.name AS user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const listRes = await query(listSql, [productId, limit, offset]);

    return {
      reviews: listRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Get review aggregates (average rating, count, distribution) for a product
   */
  async getProductAggregates(productId) {
    const sql = `
      SELECT 
        COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)::FLOAT AS average_rating,
        COUNT(*)::INT AS total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::INT AS rating_5,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::INT AS rating_4,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::INT AS rating_3,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::INT AS rating_2,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::INT AS rating_1
      FROM reviews
      WHERE product_id = $1;
    `;
    const result = await query(sql, [productId]);
    return result.rows[0] || {
      average_rating: 0,
      total_reviews: 0,
      rating_5: 0,
      rating_4: 0,
      rating_3: 0,
      rating_2: 0,
      rating_1: 0
    };
  }
};

module.exports = reviewModel;
