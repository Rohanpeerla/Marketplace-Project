const express = require('express');
const { getHealthStatus } = require('../controllers/healthController');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get API operational health status
 * @access  Public
 */
router.get('/', getHealthStatus);

module.exports = router;
