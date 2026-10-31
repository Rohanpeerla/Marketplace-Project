const { query } = require('../config/db');

const couponModel = {
  /**
   * Find coupon by ID
   */
  async findById(id) {
    const sql = `SELECT * FROM coupons WHERE id = $1;`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find coupon by code (case-insensitive)
   */
  async findByCode(code) {
    const sql = `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1);`;
    const result = await query(sql, [code]);
    return result.rows[0] || null;
  },

  /**
   * Find coupon by code with row lock (inside transaction)
   */
  async findByCodeForUpdate(code, client) {
    const sql = `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) FOR UPDATE;`;
    const result = await client.query(sql, [code]);
    return result.rows[0] || null;
  },

  /**
   * Create a new coupon
   */
  async create({
    code,
    discount_type,
    discount_value,
    minimum_order_amount = 0,
    maximum_discount_amount = null,
    start_date = null,
    expiry_date = null,
    usage_limit = null,
    active = true
  }) {
    const sql = `
      INSERT INTO coupons (
        code, discount_type, discount_value, minimum_order_amount,
        maximum_discount_amount, start_date, expiry_date, usage_limit, active
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP), $7, $8, $9)
      RETURNING *;
    `;
    const result = await query(sql, [
      code.toUpperCase().trim(),
      discount_type,
      discount_value,
      minimum_order_amount || 0,
      maximum_discount_amount || null,
      start_date || null,
      expiry_date || null,
      usage_limit || null,
      active !== undefined ? active : true
    ]);
    return result.rows[0];
  },

  /**
   * Update coupon
   */
  async update(id, fields) {
    const allowed = [
      'code', 'discount_type', 'discount_value', 'minimum_order_amount',
      'maximum_discount_amount', 'start_date', 'expiry_date', 'usage_limit',
      'used_count', 'active'
    ];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'code') {
          setClauses.push(`${key} = $${idx++}`);
          values.push(fields[key].toUpperCase().trim());
        } else {
          setClauses.push(`${key} = $${idx++}`);
          values.push(fields[key]);
        }
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    const sql = `
      UPDATE coupons
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idx}
      RETURNING *;
    `;
    const result = await query(sql, values);
    return result.rows[0];
  },

  /**
   * Increment used_count (supports external transaction client)
   */
  async incrementUsage(id, client = null) {
    const sql = `
      UPDATE coupons
      SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return result.rows[0];
  },

  /**
   * Delete coupon
   */
  async delete(id) {
    const sql = `DELETE FROM coupons WHERE id = $1 RETURNING *;`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  /**
   * List coupons with optional filtering and pagination
   */
  async findAll({ page = 1, limit = 20, active } = {}) {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    let idx = 1;

    if (active !== undefined) {
      where.push(`active = $${idx++}`);
      params.push(active === true || active === 'true');
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) AS total FROM coupons ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const listSql = `
      SELECT * FROM coupons
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);
    const listRes = await query(listSql, params);

    return {
      coupons: listRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

module.exports = couponModel;
