const { query } = require('../config/db');

/**
 * Find user by email address (case-insensitive).
 * Returns complete user record including password_hash for authentication verification.
 * @param {string} email - Email address
 * @returns {Promise<Object|null>} User record or null
 */
const findByEmail = async (email) => {
  const sql = `
    SELECT id, name, email, password_hash, role, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;
  const result = await query(sql, [email.trim()]);
  return result.rows[0] || null;
};

/**
 * Find user by ID.
 * Excludes sensitive password_hash.
 * @param {string} id - UUID user ID
 * @returns {Promise<Object|null>} Safe user record or null
 */
const findById = async (id) => {
  const sql = `
    SELECT id, name, email, role, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Create a new user in the database.
 * @param {Object} userData
 * @param {string} userData.name
 * @param {string} userData.email
 * @param {string} userData.passwordHash
 * @param {string} [userData.role='customer']
 * @returns {Promise<Object>} Safe created user record without password_hash
 */
const createUser = async ({ name, email, passwordHash, role = 'customer' }) => {
  const sql = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at, updated_at;
  `;
  const result = await query(sql, [name.trim(), email.trim().toLowerCase(), passwordHash, role]);
  return result.rows[0];
};

/**
 * Find associated vendor profile for a given user ID.
 * @param {string} userId - UUID user ID
 * @returns {Promise<Object|null>} Vendor profile or null
 */
const findVendorByUserId = async (userId) => {
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
 * Create a vendor profile for an existing vendor user.
 * @param {Object} vendorData
 * @param {string} vendorData.userId
 * @param {string} vendorData.businessName
 * @param {string} vendorData.businessEmail
 * @param {string} [vendorData.phone]
 * @param {string} [vendorData.address]
 * @param {string} [vendorData.status='pending']
 * @returns {Promise<Object>}
 */
const createVendorProfile = async ({
  userId,
  businessName,
  businessEmail,
  phone = null,
  address = null,
  status = 'pending',
}) => {
  const sql = `
    INSERT INTO vendors (user_id, business_name, business_email, phone, address, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, business_name, business_email, phone, address, status, created_at, updated_at;
  `;
  const result = await query(sql, [
    userId,
    businessName.trim(),
    businessEmail.trim().toLowerCase(),
    phone ? phone.trim() : null,
    address ? address.trim() : null,
    status,
  ]);
  return result.rows[0];
};

module.exports = {
  findByEmail,
  findById,
  createUser,
  findVendorByUserId,
  createVendorProfile,
};
