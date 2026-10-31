const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const vendorRoutes = require('./vendorRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const searchRoutes = require('./searchRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const vendorOrderRoutes = require('./vendorOrderRoutes');
const adminOrderRoutes = require('./adminOrderRoutes');
const paymentRoutes = require('./paymentRoutes');
const reviewRoutes = require('./reviewRoutes');
const couponRoutes = require('./couponRoutes');
const adminAnalyticsRoutes = require('./adminAnalyticsRoutes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/vendors', vendorRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/search', searchRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/vendor/orders', vendorOrderRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/admin/analytics', adminAnalyticsRoutes);

module.exports = router;
