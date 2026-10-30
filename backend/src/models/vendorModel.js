const { query } = require('../config/db');

/**
 * Find vendor profile by associated user ID.
 * @param {string} userId - UUID of user
 * @returns {Promise<Object|null>}
 */
const findByUserId = async (userId) => {
  const sql = `
    SELECT id, user_id, business_name, business_email, phone, address, status, created_at, updated_at
    FROM vendors
    WHERE user_id = $1
    LIMIT 1;
  `;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
};

/**
 * Find vendor profile by vendor ID.
 * @param {string} id - UUID of vendor
 * @returns {Promise<Object|null>}
 */
const findById = async (id) => {
  const sql = `
    SELECT id, user_id, business_name, business_email, phone, address, status, created_at, updated_at
    FROM vendors
    WHERE id = $1
    LIMIT 1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Update vendor profile fields permitted for vendor self-management.
 * Strictly prevents updating id, user_id, status, or timestamps directly.
 * @param {string} id - Vendor UUID
 * @param {Object} updateData
 * @param {string} [updateData.businessName]
 * @param {string} [updateData.businessEmail]
 * @param {string} [updateData.phone]
 * @param {string} [updateData.address]
 * @returns {Promise<Object|null>}
 */
const updateProfile = async (id, { businessName, businessEmail, phone, address }) => {
  const sql = `
    UPDATE vendors
    SET business_name = COALESCE($2, business_name),
        business_email = COALESCE($3, business_email),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, user_id, business_name, business_email, phone, address, status, created_at, updated_at;
  `;
  const result = await query(sql, [
    id,
    businessName ? businessName.trim() : null,
    businessEmail ? businessEmail.trim().toLowerCase() : null,
    phone !== undefined ? (phone ? phone.trim() : null) : null,
    address !== undefined ? (address ? address.trim() : null) : null,
  ]);
  return result.rows[0] || null;
};

/**
 * List vendors with optional status filter.
 * @param {Object} [options]
 * @param {string} [options.status]
 * @returns {Promise<Array>}
 */
const findAll = async ({ status } = {}) => {
  let sql = `
    SELECT v.id, v.user_id, v.business_name, v.business_email, v.phone, v.address, v.status, v.created_at, v.updated_at,
           u.name AS owner_name, u.email AS owner_email
    FROM vendors v
    JOIN users u ON v.user_id = u.id
  `;
  const params = [];
  if (status) {
    sql += ` WHERE v.status = $1`;
    params.push(status);
  }
  sql += ` ORDER BY v.created_at DESC;`;
  const result = await query(sql, params);
  return result.rows;
};

module.exports = {
  findByUserId,
  findById,
  updateProfile,
  findAll,
};
