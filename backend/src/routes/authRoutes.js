const express = require('express');
const {
  register,
  login,
  getMe,
  customerTest,
  vendorTest,
  adminTest,
} = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// =============================================================================
// Public Authentication Routes
// =============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer or vendor account
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and issue JWT
 * @access  Public
 */
router.post('/login', login);

// =============================================================================
// Protected Profile Route
// =============================================================================

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve currently authenticated user's profile and vendor details
 * @access  Private (Any authenticated user)
 */
router.get('/me', authenticateToken, getMe);

// =============================================================================
// Role-Protected Test Endpoints (Stage 3 Verification)
// =============================================================================

/**
 * @route   GET /api/auth/customer-test
 * @desc    Test endpoint accessible ONLY by users with role 'customer'
 * @access  Private (Role: customer)
 */
router.get('/customer-test', authenticateToken, requireRole('customer'), customerTest);

/**
 * @route   GET /api/auth/vendor-test
 * @desc    Test endpoint accessible ONLY by users with role 'vendor'
 * @access  Private (Role: vendor)
 */
router.get('/vendor-test', authenticateToken, requireRole('vendor'), vendorTest);

/**
 * @route   GET /api/auth/admin-test
 * @desc    Test endpoint accessible ONLY by users with role 'admin'
 * @access  Private (Role: admin)
 */
router.get('/admin-test', authenticateToken, requireRole('admin'), adminTest);

module.exports = router;
