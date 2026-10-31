const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All analytics endpoints require Admin role
router.use(authenticateToken, requireRole('admin'));

router.get('/overview', adminAnalyticsController.getOverview);
router.get('/revenue', adminAnalyticsController.getRevenue);
router.get('/orders', adminAnalyticsController.getOrders);
router.get('/products', adminAnalyticsController.getProducts);
router.get('/vendors', adminAnalyticsController.getVendors);

module.exports = router;
