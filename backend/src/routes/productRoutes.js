const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  addImage,
  removeImage,
} = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Browse products with pagination and filters
 * @access  Public
 */
router.get('/', getAll);

/**
 * @route   GET /api/products/:id
 * @desc    Get product details by ID
 * @access  Public
 */
router.get('/:id', getById);

/**
 * @route   GET /api/products/:productId/reviews
 * @desc    Get product reviews & ratings breakdown
 * @access  Public
 */
router.get('/:productId/reviews', reviewController.getProductReviews);

/**
 * @route   POST /api/products
 * @desc    Create product (Approved Vendor only)
 * @access  Private (Vendor, Admin)
 */
router.post('/', authenticateToken, requireRole('vendor', 'admin'), create);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (Product owner vendor or Admin)
 * @access  Private (Vendor, Admin)
 */
router.put('/:id', authenticateToken, requireRole('vendor', 'admin'), update);

/**
 * @route   DELETE /api/products/:id
 * @desc    Deactivate product (Product owner vendor or Admin)
 * @access  Private (Vendor, Admin)
 */
router.delete('/:id', authenticateToken, requireRole('vendor', 'admin'), remove);

/**
 * @route   POST /api/products/:id/images
 * @desc    Add image URL to product (Product owner vendor or Admin)
 * @access  Private (Vendor, Admin)
 */
router.post('/:id/images', authenticateToken, requireRole('vendor', 'admin'), addImage);

/**
 * @route   DELETE /api/products/:id/images/:imageId
 * @desc    Remove image from product (Product owner vendor or Admin)
 * @access  Private (Vendor, Admin)
 */
router.delete('/:id/images/:imageId', authenticateToken, requireRole('vendor', 'admin'), removeImage);

module.exports = router;
