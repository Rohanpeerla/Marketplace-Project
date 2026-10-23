const express = require('express');
const { getHealthStatus, getDatabaseHealth } = require('../controllers/healthController');

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

module.exports = router;
