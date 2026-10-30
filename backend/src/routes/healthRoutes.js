const express = require('express');
const {
  getHealthStatus,
  getDatabaseHealth,
  getSearchHealth,
} = require('../controllers/healthController');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get API operational health status
 * @access  Public
 */
router.get('/', getHealthStatus);

/**
 * @route   GET /api/health/db
 * @desc    Get PostgreSQL database connection health status
 * @access  Public
 */
router.get('/db', getDatabaseHealth);

/**
 * @route   GET /api/health/search
 * @desc    Get Elasticsearch connection health status
 * @access  Public
 */
router.get('/search', getSearchHealth);

module.exports = router;
