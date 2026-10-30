const express = require('express');
const {
  checkout,
  getOrders,
  getOrderById,
  cancelOrder,
} = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Customer only
router.use(authenticateToken, requireRole('customer'));

/**
 * @route   POST /api/orders/checkout
 * @desc    Customer checkout (multi-vendor order creation)
 * @access  Private (Customer)
 */
router.post('/checkout', checkout);

/**
 * @route   GET /api/orders
 * @desc    Customer order history
 * @access  Private (Customer)
 */
router.get('/', getOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Customer order details
 * @access  Private (Customer)
 */
router.get('/:id', getOrderById);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel eligible customer order & restore inventory
 * @access  Private (Customer)
 */
router.put('/:id/cancel', cancelOrder);

module.exports = router;

