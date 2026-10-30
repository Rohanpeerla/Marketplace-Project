const express = require('express');
const {
  getAdminOrders,
  getAdminOrderById,
} = require('../controllers/adminOrderController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin only
router.use(authenticateToken, requireRole('admin'));

/**
 * @route   GET /api/admin/orders
 * @desc    Admin: View all platform orders
 * @access  Private (Admin)
 */
router.get('/', getAdminOrders);

/**
 * @route   GET /api/admin/orders/:id
 * @desc    Admin: View single order details
 * @access  Private (Admin)
 */
router.get('/:id', getAdminOrderById);

module.exports = router;

