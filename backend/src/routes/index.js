const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const vendorRoutes = require('./vendorRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const searchRoutes = require('./searchRoutes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/vendors', vendorRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/search', searchRoutes);

module.exports = router;
