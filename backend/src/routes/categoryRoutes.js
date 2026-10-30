const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../controllers/categoryController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories (public)
 * @access  Public
 */
router.get('/', getAll);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Public
 */
router.get('/:id', getById);

/**
 * @route   POST /api/categories
 * @desc    Create category
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, requireRole('admin'), create);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateToken, requireRole('admin'), update);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, requireRole('admin'), remove);

module.exports = router;
