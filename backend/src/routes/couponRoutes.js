const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Validate coupon (Customer, Vendor, Admin)
router.post('/validate', authenticateToken, couponController.validateCoupon);

// Admin-only coupon management
router.get('/', authenticateToken, requireRole('admin'), couponController.getCoupons);
router.post('/', authenticateToken, requireRole('admin'), couponController.createCoupon);
router.put('/:id', authenticateToken, requireRole('admin'), couponController.updateCoupon);
router.delete('/:id', authenticateToken, requireRole('admin'), couponController.deleteCoupon);

module.exports = router;
