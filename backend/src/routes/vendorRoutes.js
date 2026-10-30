const express = require('express');
const { getProfile, updateProfile, listVendors } = require('../controllers/vendorController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/vendors/me
 * @desc    Get authenticated vendor's profile
 * @access  Private (Vendor only)
 */
router.get('/me', authenticateToken, requireRole('vendor'), getProfile);

/**
 * @route   PUT /api/vendors/me
 * @desc    Update authenticated vendor's profile
 * @access  Private (Vendor only)
 */
router.put('/me', authenticateToken, requireRole('vendor'), updateProfile);

/**
 * @route   GET /api/vendors
 * @desc    List all approved vendors / directory
 * @access  Public
 */
router.get('/', listVendors);

module.exports = router;
