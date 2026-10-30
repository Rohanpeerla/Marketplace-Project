const { query } = require('../config/db');

/**
 * Retrieve all categories with product count.
 * @returns {Promise<Array>}
 */
const findAll = async () => {
  const sql = `
    SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
           COUNT(p.id)::INTEGER AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
    GROUP BY c.id
    ORDER BY c.name ASC;
  `;
  const result = await query(sql);
  return result.rows;
};

/**
 * Find category by ID.
 * @param {string} id - Category UUID
 * @returns {Promise<Object|null>}
 */
const findById = async (id) => {
  const sql = `
    SELECT id, name, description, created_at, updated_at
    FROM categories
    WHERE id = $1
    LIMIT 1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Find category by name (case-insensitive).
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
const findByName = async (name) => {
  const sql = `
    SELECT id, name, description, created_at, updated_at
    FROM categories
    WHERE LOWER(name) = LOWER($1)
    LIMIT 1;
  `;
  const result = await query(sql, [name.trim()]);
  return result.rows[0] || null;
};

/**
 * Create a new category.
 * @param {Object} categoryData
 * @param {string} categoryData.name
 * @param {string} [categoryData.description]
 * @returns {Promise<Object>}
 */
const create = async ({ name, description }) => {
  const sql = `
    INSERT INTO categories (name, description)
    VALUES ($1, $2)
    RETURNING id, name, description, created_at, updated_at;
  `;
  const result = await query(sql, [
    name.trim(),
    description ? description.trim() : null,
  ]);
  return result.rows[0];
};

/**
 * Update existing category.
 * @param {string} id - Category UUID
 * @param {Object} updateData
 * @param {string} [updateData.name]
 * @param {string} [updateData.description]
 * @returns {Promise<Object|null>}
 */
const update = async (id, { name, description }) => {
  const sql = `
    UPDATE categories
    SET name = COALESCE($2, name),
        description = COALESCE($3, description),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, name, description, created_at, updated_at;
  `;
  const result = await query(sql, [
    id,
    name !== undefined ? name.trim() : null,
    description !== undefined ? (description ? description.trim() : null) : null,
  ]);
  return result.rows[0] || null;
};

/**
 * Delete a category.
 * Note: Foreign keys on products.category_id will SET NULL automatically.
 * @param {string} id - Category UUID
 * @returns {Promise<Object|null>}
 */
const remove = async (id) => {
  const sql = `
    DELETE FROM categories
    WHERE id = $1
    RETURNING id, name;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  remove,
};
