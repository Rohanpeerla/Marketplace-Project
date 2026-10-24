const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware: authenticateToken
 * Verifies the JWT Bearer token supplied in the Authorization request header.
 * Attaches decoded user claims { id, email, role } to req.user.
 * Rejects missing, expired, and invalid tokens with appropriate HTTP status codes.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  // 1. Check for presence of Authorization header
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Missing Authorization header. Format: "Bearer <token>"',
    });
  }

  // 2. Validate Bearer format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid Authorization format. Format: "Bearer <token>"',
    });
  }

  const token = parts[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Token missing from Authorization header.',
    });
  }

  // 3. Verify JWT validity and signature
  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired. Please authenticate again.',
          expiredAt: err.expiredAt,
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Invalid or forged access token.',
      });
    }

    // 4. Attach decoded token payload { id, email, role } to req.user
    req.user = decoded;
    next();
  });
};

/**
 * Middleware Factory: requireRole
 * Verifies that the authenticated user possesses one of the required roles.
 * Returns 401 if user is unauthenticated.
 * Returns 403 if user lacks required permissions.
 *
 * Usage:
 *   requireRole('admin')
 *   requireRole('vendor')
 *   requireRole('customer')
 *   requireRole('admin', 'vendor')
 *
 * @param  {...string} roles - Allowed role names
 */
const requireRole = (...roles) => {
  // Support both array of roles or spread arguments
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    // 1. Ensure user is authenticated
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access this resource.',
      });
    }

    // 2. Check if user's role matches any allowed role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Insufficient permissions. Required role: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
      });
    }

    // 3. User is authorized
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
};
