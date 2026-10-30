const { query } = require('../config/db');

/**
 * Find products with filtering, search, and pagination.
 * Exclusively uses parameterized queries.
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=12]
 * @param {string} [options.categoryId]
 * @param {string} [options.vendorId]
 * @param {number} [options.minPrice]
 * @param {number} [options.maxPrice]
 * @param {string} [options.status='active']
 * @param {string} [options.search]
 * @returns {Promise<Object>} { products, pagination: { total, page, limit, totalPages } }
 */
const findFiltered = async ({
  page = 1,
  limit = 12,
  categoryId,
  vendorId,
  minPrice,
  maxPrice,
  status = 'active',
  search,
} = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
  const offset = (safePage - 1) * safeLimit;

  const whereConditions = [];
  const params = [];
  let paramIndex = 1;

  // Status filter (null or 'all' permits any status, default 'active')
  if (status && status !== 'all') {
    whereConditions.push(`p.status = $${paramIndex++}`);
    params.push(status);
  }

  // Category filter
  if (categoryId) {
    whereConditions.push(`p.category_id = $${paramIndex++}`);
    params.push(categoryId);
  }

  // Vendor filter
  if (vendorId) {
    whereConditions.push(`p.vendor_id = $${paramIndex++}`);
    params.push(vendorId);
  }

  // Price range filters
  if (minPrice !== undefined && minPrice !== null && !isNaN(minPrice)) {
    whereConditions.push(`p.price >= $${paramIndex++}`);
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== null && !isNaN(maxPrice)) {
    whereConditions.push(`p.price <= $${paramIndex++}`);
    params.push(Number(maxPrice));
  }

  // Search keyword (case-insensitive name and description)
  if (search && search.trim()) {
    whereConditions.push(
      `(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
    );
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Count total matching records
  const countSql = `
    SELECT COUNT(*)::INTEGER AS total
    FROM products p
    ${whereClause};
  `;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;

  // Query paginated product records with category, vendor, and primary image
  const dataParams = [...params, safeLimit, offset];
  const dataSql = `
    SELECT p.id, p.vendor_id, p.category_id, p.name, p.description,
           p.price::FLOAT AS price, p.stock, p.status, p.created_at, p.updated_at,
           c.name AS category_name,
           v.business_name AS vendor_name,
           v.status AS vendor_status,
           (
             SELECT pi.image_url
             FROM product_images pi
             WHERE pi.product_id = p.id
             ORDER BY pi.is_primary DESC, pi.created_at ASC
             LIMIT 1
           ) AS primary_image,
           (
             SELECT COUNT(*)::INTEGER
             FROM product_images pi
             WHERE pi.product_id = p.id
           ) AS image_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN vendors v ON p.vendor_id = v.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;

  const dataResult = await query(dataSql, dataParams);
  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    products: dataResult.rows,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
};

/**
 * Find single product by ID with full details, vendor, category, and images array.
 * @param {string} id - Product UUID
 * @returns {Promise<Object|null>}
 */
const findById = async (id) => {
  const sql = `
    SELECT p.id, p.vendor_id, p.category_id, p.name, p.description,
           p.price::FLOAT AS price, p.stock, p.status, p.created_at, p.updated_at,
           c.name AS category_name, c.description AS category_description,
           v.business_name AS vendor_name, v.business_email AS vendor_email,
           v.phone AS vendor_phone, v.status AS vendor_status,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'image_url', pi.image_url,
                 'is_primary', pi.is_primary,
                 'created_at', pi.created_at
               ) ORDER BY pi.is_primary DESC, pi.created_at ASC
             ) FILTER (WHERE pi.id IS NOT NULL),
             '[]'::json
           ) AS images
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN vendors v ON p.vendor_id = v.id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.id = $1
    GROUP BY p.id, c.id, v.id;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Create a new product.
 * @param {Object} productData
 * @param {string} productData.vendorId
 * @param {string} [productData.categoryId]
 * @param {string} productData.name
 * @param {string} [productData.description]
 * @param {number} productData.price
 * @param {number} productData.stock
 * @param {string} [productData.status='active']
 * @returns {Promise<Object>}
 */
const create = async ({
  vendorId,
  categoryId = null,
  name,
  description = null,
  price,
  stock = 0,
  status = 'active',
}) => {
  const sql = `
    INSERT INTO products (vendor_id, category_id, name, description, price, stock, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, vendor_id, category_id, name, description, price::FLOAT, stock, status, created_at, updated_at;
  `;
  const result = await query(sql, [
    vendorId,
    categoryId || null,
    name.trim(),
    description ? description.trim() : null,
    Number(price),
    parseInt(stock, 10) || 0,
    status,
  ]);
  return result.rows[0];
};

/**
 * Update an existing product.
 * @param {string} id - Product UUID
 * @param {Object} updateData
 * @returns {Promise<Object|null>}
 */
const update = async (id, updateData) => {
  const fields = [];
  const params = [id];
  let paramIndex = 2;

  if (updateData.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    params.push(updateData.name.trim());
  }
  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    params.push(updateData.description ? updateData.description.trim() : null);
  }
  if (updateData.price !== undefined) {
    fields.push(`price = $${paramIndex++}`);
    params.push(Number(updateData.price));
  }
  if (updateData.stock !== undefined) {
    fields.push(`stock = $${paramIndex++}`);
    params.push(parseInt(updateData.stock, 10));
  }
  if (updateData.categoryId !== undefined) {
    fields.push(`category_id = $${paramIndex++}`);
    params.push(updateData.categoryId || null);
  }
  if (updateData.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    params.push(updateData.status);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE products
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING id, vendor_id, category_id, name, description, price::FLOAT, stock, status, created_at, updated_at;
  `;

  const result = await query(sql, params);
  return result.rows[0] || null;
};

/**
 * Soft delete product by marking status as 'inactive'.
 * @param {string} id - Product UUID
 * @returns {Promise<Object|null>}
 */
const softDelete = async (id) => {
  const sql = `
    UPDATE products
    SET status = 'inactive',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, name, status, updated_at;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Hard delete product (cascades to product_images).
 * @param {string} id - Product UUID
 * @returns {Promise<Object|null>}
 */
const hardDelete = async (id) => {
  const sql = `
    DELETE FROM products
    WHERE id = $1
    RETURNING id, name;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

module.exports = {
  findFiltered,
  findById,
  create,
  update,
  softDelete,
  hardDelete,
};
