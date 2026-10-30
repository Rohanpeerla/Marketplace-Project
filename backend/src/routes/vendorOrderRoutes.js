const express = require('express');
const {
  getVendorOrders,
  getVendorOrderById,
  updateOrderStatus,
} = require('../controllers/vendorOrderController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Vendor only
router.use(authenticateToken, requireRole('vendor'));

/**
 * @route   GET /api/vendor/orders
 * @desc    Vendor order list
 * @access  Private (Vendor)
 */
router.get('/', getVendorOrders);

/**
 * @route   GET /api/vendor/orders/:id
 * @desc    Vendor order details
 * @access  Private (Vendor)
 */
router.get('/:id', getVendorOrderById);

/**
 * @route   PUT /api/vendor/orders/:id/status
 * @desc    Update vendor order status
 * @access  Private (Vendor)
 */
router.put('/:id/status', updateOrderStatus);

module.exports = router;

