const { esClient } = require('../config/elasticsearch');
const config = require('../config/env');
const { query } = require('../config/db');
const productModel = require('../models/productModel');

const INDEX_NAME = config.elasticsearchIndex || 'products';

/**
 * Expected schema mapping for products index in Elasticsearch.
 */
const PRODUCT_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        product_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      name: {
        type: 'text',
        analyzer: 'product_search_analyzer',
        fields: {
          keyword: { type: 'keyword', ignore_above: 256 },
        },
      },
      description: {
        type: 'text',
        analyzer: 'product_search_analyzer',
      },
      price: { type: 'float' },
      stock: { type: 'integer' },
      status: { type: 'keyword' },
      category_id: { type: 'keyword' },
      category_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword', ignore_above: 256 },
        },
      },
      vendor_id: { type: 'keyword' },
      vendor_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword', ignore_above: 256 },
        },
      },
      images: {
        type: 'object',
        properties: {
          id: { type: 'keyword' },
          image_url: { type: 'keyword' },
          is_primary: { type: 'boolean' },
          created_at: { type: 'date' },
        },
      },
      primary_image: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
};

/**
 * Initialize products index with mapping if it does not already exist.
 */
const initProductIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        ...PRODUCT_INDEX_MAPPING,
      });
      console.log(`[Elasticsearch] Index "${INDEX_NAME}" created with schema mapping.`);
    }
    return true;
  } catch (error) {
    console.error(`[Elasticsearch] Failed to initialize index "${INDEX_NAME}":`, error.message);
    throw error;
  }
};

/**
 * Delete products index (used during re-indexing or teardown).
 */
const deleteProductIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (exists) {
      await esClient.indices.delete({ index: INDEX_NAME });
      console.log(`[Elasticsearch] Index "${INDEX_NAME}" deleted.`);
    }
    return true;
  } catch (error) {
    console.error(`[Elasticsearch] Failed to delete index "${INDEX_NAME}":`, error.message);
    throw error;
  }
};

/**
 * Format a raw product record (with vendor, category, images) for Elasticsearch indexing.
 */
const formatProductDoc = (product) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImg = images.find((img) => img.is_primary) || images[0] || null;

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: parseFloat(product.price) || 0,
    stock: parseInt(product.stock, 10) || 0,
    status: product.status,
    category_id: product.category_id,
    category_name: product.category_name || '',
    vendor_id: product.vendor_id,
    vendor_name: product.vendor_name || '',
    images: images.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      is_primary: !!img.is_primary,
      created_at: img.created_at || null,
    })),
    primary_image: primaryImg ? primaryImg.image_url : null,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
};

/**
 * Index or update a single product by ID in Elasticsearch.
 * Fetches latest state from PostgreSQL. If deleted, removes from index.
 */
const indexProduct = async (productId) => {
  try {
    const product = await productModel.findById(productId);
    if (!product || product.status === 'deleted') {
      return await deleteProduct(productId);
    }

    const doc = formatProductDoc(product);
    await esClient.index({
      index: INDEX_NAME,
      id: productId,
      document: doc,
      refresh: 'wait_for',
    });
    return true;
  } catch (error) {
    console.warn(`[Elasticsearch] Warning: Could not index product ${productId}:`, error.message);
    return false;
  }
};

/**
 * Update an existing product document in Elasticsearch.
 */
const updateProduct = async (productId) => {
  return await indexProduct(productId);
};

/**
 * Delete a product from Elasticsearch by ID.
 */
const deleteProduct = async (productId) => {
  try {
    await esClient.delete(
      {
        index: INDEX_NAME,
        id: productId,
        refresh: 'wait_for',
      },
      { ignore: [404] }
    );
    return true;
  } catch (error) {
    if (error.statusCode === 404 || error.meta?.statusCode === 404) {
      return true;
    }
    console.warn(`[Elasticsearch] Warning: Could not delete product ${productId} from index:`, error.message);
    return false;
  }
};

/**
 * Bulk reindex all products from PostgreSQL into Elasticsearch.
 */
const reindexAllProducts = async () => {
  const startTime = Date.now();
  await initProductIndex();

  const sql = `
    SELECT p.id, p.vendor_id, p.category_id, p.name, p.description,
           p.price::FLOAT AS price, p.stock, p.status, p.created_at, p.updated_at,
           c.name AS category_name,
           v.business_name AS vendor_name,
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
    WHERE p.status != 'deleted'
    GROUP BY p.id, c.id, v.id
    ORDER BY p.created_at DESC;
  `;

  const { rows } = await query(sql);
  const total = rows.length;

  if (total === 0) {
    return {
      total: 0,
      indexed: 0,
      failed: 0,
      duration_ms: Date.now() - startTime,
    };
  }

  const operations = [];
  for (const product of rows) {
    operations.push({ index: { _index: INDEX_NAME, _id: product.id } });
    operations.push(formatProductDoc(product));
  }

  const bulkResponse = await esClient.bulk({
    refresh: true,
    operations,
  });

  let failed = 0;
  if (bulkResponse.errors) {
    for (const item of bulkResponse.items) {
      const operation = item.index || item.create || item.update || item.delete;
      if (operation && operation.error) {
        failed++;
        console.error(`[Elasticsearch Bulk Reindex] Failed for doc ${operation._id}:`, operation.error);
      }
    }
  }

  const indexed = total - failed;
  const duration_ms = Date.now() - startTime;
  console.log(`[Elasticsearch Reindex] Completed: ${indexed}/${total} indexed, ${failed} failed in ${duration_ms}ms.`);

  return {
    total,
    indexed,
    failed,
    duration_ms,
  };
};

/**
 * Execute search, filtering, and sorting against Elasticsearch.
 * @param {Object} options
 * @param {string} [options.q] - Search keyword
 * @param {string} [options.category_id] - Category UUID filter
 * @param {string} [options.vendor_id] - Vendor UUID filter
 * @param {number} [options.min_price] - Minimum price filter
 * @param {number} [options.max_price] - Maximum price filter
 * @param {string} [options.sort='relevance'] - Sorting ('relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc')
 * @param {number} [options.page=1] - Page number (1-based)
 * @param {number} [options.limit=12] - Items per page
 * @returns {Promise<Object>} { products, pagination }
 */
const searchProducts = async ({
  q,
  category_id,
  vendor_id,
  min_price,
  max_price,
  sort = 'relevance',
  page = 1,
  limit = 12,
} = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
  const from = (safePage - 1) * safeLimit;

  const mustConditions = [];
  const filterConditions = [];

  // Default: Only active products are visible in customer search
  filterConditions.push({ term: { status: 'active' } });

  // Full-text query on name (boosted x3), description, category_name, vendor_name
  const trimmedQuery = typeof q === 'string' ? q.trim() : '';
  if (trimmedQuery.length > 0) {
    mustConditions.push({
      multi_match: {
        query: trimmedQuery,
        fields: ['name^3', 'description', 'category_name', 'vendor_name'],
        fuzziness: 'AUTO',
        operator: 'or',
      },
    });
  } else {
    mustConditions.push({ match_all: {} });
  }

  // Category filter
  if (category_id) {
    filterConditions.push({ term: { category_id } });
  }

  // Vendor filter
  if (vendor_id) {
    filterConditions.push({ term: { vendor_id } });
  }

  // Price range filter
  const priceRange = {};
  if (min_price !== undefined && min_price !== '' && !isNaN(min_price)) {
    priceRange.gte = Number(min_price);
  }
  if (max_price !== undefined && max_price !== '' && !isNaN(max_price)) {
    priceRange.lte = Number(max_price);
  }
  if (Object.keys(priceRange).length > 0) {
    filterConditions.push({ range: { price: priceRange } });
  }

  // Sorting
  let sortRules = [];
  switch (sort) {
    case 'price_asc':
      sortRules = [{ price: { order: 'asc' } }, { id: { order: 'asc' } }];
      break;
    case 'price_desc':
      sortRules = [{ price: { order: 'desc' } }, { id: { order: 'asc' } }];
      break;
    case 'name_asc':
      sortRules = [{ 'name.keyword': { order: 'asc' } }, { id: { order: 'asc' } }];
      break;
    case 'name_desc':
      sortRules = [{ 'name.keyword': { order: 'desc' } }, { id: { order: 'asc' } }];
      break;
    case 'relevance':
    default:
      if (trimmedQuery.length > 0) {
        sortRules = [{ _score: { order: 'desc' } }, { created_at: { order: 'desc' } }];
      } else {
        sortRules = [{ created_at: { order: 'desc' } }];
      }
      break;
  }

  const searchParams = {
    index: INDEX_NAME,
    from,
    size: safeLimit,
    query: {
      bool: {
        must: mustConditions,
        filter: filterConditions,
      },
    },
    sort: sortRules,
  };

  const response = await esClient.search(searchParams);

  const total =
    typeof response.hits.total === 'object'
      ? response.hits.total.value
      : response.hits.total || 0;

  const products = (response.hits.hits || []).map((hit) => ({
    ...hit._source,
    _score: hit._score,
  }));

  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    products,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
};

module.exports = {
  INDEX_NAME,
  initProductIndex,
  deleteProductIndex,
  formatProductDoc,
  indexProduct,
  updateProduct,
  deleteProduct,
  reindexAllProducts,
  searchProducts,
};
