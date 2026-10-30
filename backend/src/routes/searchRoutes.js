const express = require('express');
const { searchProducts } = require('../controllers/searchController');

const router = express.Router();

/**
 * @route   GET /api/search/products
 * @desc    Search, filter, sort, and paginate products using Elasticsearch
 * @access  Public
 */
router.get('/products', searchProducts);

module.exports = router;
