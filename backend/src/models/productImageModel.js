const { query } = require('../config/db');

/**
 * Find all images for a given product.
 * Ordered with primary image first.
 * @param {string} productId - Product UUID
 * @returns {Promise<Array>}
 */
const findByProductId = async (productId) => {
  const sql = `
    SELECT id, product_id, image_url, is_primary, created_at
    FROM product_images
    WHERE product_id = $1
    ORDER BY is_primary DESC, created_at ASC;
  `;
  const result = await query(sql, [productId]);
  return result.rows;
};

/**
 * Find image by ID.
 * @param {string} id - Image UUID
 * @returns {Promise<Object|null>}
 */
const findById = async (id) => {
  const sql = `
    SELECT id, product_id, image_url, is_primary, created_at
    FROM product_images
    WHERE id = $1
    LIMIT 1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Add image to product.
 * If isPrimary is true, unsets is_primary on all existing images for this product.
 * @param {Object} imageData
 * @param {string} imageData.productId - Product UUID
 * @param {string} imageData.imageUrl - Image URL string
 * @param {boolean} [imageData.isPrimary=false]
 * @returns {Promise<Object>}
 */
const add = async ({ productId, imageUrl, isPrimary = false }) => {
  if (isPrimary) {
    await query(
      `UPDATE product_images SET is_primary = false WHERE product_id = $1;`,
      [productId]
    );
  } else {
    // If this is the very first image for the product, automatically make it primary
    const existing = await query(
      `SELECT COUNT(*)::INTEGER AS count FROM product_images WHERE product_id = $1;`,
      [productId]
    );
    if (existing.rows[0].count === 0) {
      isPrimary = true;
    }
  }

  const sql = `
    INSERT INTO product_images (product_id, image_url, is_primary)
    VALUES ($1, $2, $3)
    RETURNING id, product_id, image_url, is_primary, created_at;
  `;
  const result = await query(sql, [productId, imageUrl.trim(), isPrimary]);
  return result.rows[0];
};

/**
 * Delete image by ID.
 * If deleted image was primary, optionally designate the next image as primary.
 * @param {string} id - Image UUID
 * @returns {Promise<Object|null>}
 */
const remove = async (id) => {
  // First retrieve image to check product_id and is_primary
  const img = await findById(id);
  if (!img) return null;

  const sql = `
    DELETE FROM product_images
    WHERE id = $1
    RETURNING id, product_id;
  `;
  const result = await query(sql, [id]);

  // If deleted image was primary, promote the next remaining image to primary
  if (img.is_primary) {
    await query(
      `
      UPDATE product_images
      SET is_primary = true
      WHERE id = (
        SELECT id FROM product_images
        WHERE product_id = $1
        ORDER BY created_at ASC
        LIMIT 1
      );
      `,
      [img.product_id]
    );
  }

  return result.rows[0] || null;
};

module.exports = {
  findByProductId,
  findById,
  add,
  remove,
};
