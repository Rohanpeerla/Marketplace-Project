const express = require('express');
const { getCart, addItem, updateItem, removeItem, clearCart } = require('../controllers/cartController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All cart routes: authenticated customers only (vendors/admins receive 403 per RBAC conventions)
router.use(authenticateToken, requireRole('customer'));

/** @route GET /api/cart - Get current customer's cart (Redis cache-aside) */
router.get('/', getCart);

/** @route POST /api/cart/items - Add product { productId, quantity } */
router.post('/items', addItem);

/** @route PUT /api/cart/items/:productId - Set quantity { quantity } */
router.put('/items/:productId', updateItem);

/** @route DELETE /api/cart/items/:productId - Remove item */
router.delete('/items/:productId', removeItem);

/** @route DELETE /api/cart - Clear cart */
router.delete('/', clearCart);

module.exports = router;

