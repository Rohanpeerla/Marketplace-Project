const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Public / Safe frontend config
router.get('/config', paymentController.getConfig);

// Protected Customer Payment Actions
router.post('/create-order', authenticateToken, requireRole('customer'), paymentController.createOrder);
router.post('/verify', authenticateToken, requireRole('customer'), paymentController.verify);
router.post('/simulate-success', authenticateToken, requireRole('customer'), paymentController.simulateSuccess);
router.post('/fail', authenticateToken, requireRole('customer'), paymentController.fail);

// Protected Payment Record Inspection (Customer, Vendor, Admin)
router.get('/order/:orderId', authenticateToken, paymentController.getPaymentByOrder);

module.exports = router;
