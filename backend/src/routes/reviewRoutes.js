const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route to get reviews for a product
router.get('/products/:productId', reviewController.getProductReviews);

// Protected routes (Customer / Admin)
router.post('/', authenticateToken, reviewController.createReview);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);

module.exports = router;
