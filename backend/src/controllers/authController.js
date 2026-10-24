const { authService } = require('../services');
const { AuthError } = require('../services/authService');

/**
 * Handle new user registration (Customer or Vendor).
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, businessName, phone, address } = req.body;

    const result = await authService.registerUser({
      name,
      email,
      password,
      role,
      businessName,
      phone,
      address,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Handle user authentication and JWT issuance.
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Get current authenticated user's profile.
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);

    return res.status(200).json({
      success: true,
      user: profile,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Role-protected test endpoint: Customer only
 * GET /api/auth/customer-test
 */
const customerTest = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Customer authorization verified successfully',
    role: req.user.role,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

/**
 * Role-protected test endpoint: Vendor only
 * GET /api/auth/vendor-test
 */
const vendorTest = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Vendor authorization verified successfully',
    role: req.user.role,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

/**
 * Role-protected test endpoint: Admin only
 * GET /api/auth/admin-test
 */
const adminTest = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Admin authorization verified successfully',
    role: req.user.role,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

module.exports = {
  register,
  login,
  getMe,
  customerTest,
  vendorTest,
  adminTest,
};
