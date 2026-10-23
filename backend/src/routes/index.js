const express = require('express');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);

module.exports = router;
