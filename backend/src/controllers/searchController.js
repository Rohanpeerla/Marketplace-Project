const searchService = require('../services/searchService');

/**
 * Search products via Elasticsearch.
 * Supports keyword search (name^3, description), category, vendor, price range, sorting, pagination.
 * @route GET /api/search/products
 * @access Public
 */
const searchProducts = async (req, res, next) => {
  try {
    const {
      q,
      category_id,
      vendor_id,
      min_price,
      max_price,
      sort,
      page,
      limit,
    } = req.query;

    const result = await searchService.searchProducts({
      q,
      category_id,
      vendor_id,
      min_price,
      max_price,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      products: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[Search Controller Error]:', error.message);
    // If Elasticsearch is unavailable or search execution fails, return 503 Service Unavailable
    return res.status(503).json({
      success: false,
      message: 'Search service is temporarily unavailable',
      error: error.message,
    });
  }
};

module.exports = {
  searchProducts,
};

