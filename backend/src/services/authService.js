const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userModel = require('../models/userModel');

/**
 * Custom Error class with HTTP status code support.
 */
class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Validate email string format.
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
};

/**
 * Generate a signed JWT for the authenticated user.
 * Token payload contains only minimal essential claims: id, role, email.
 * @param {Object} user - User record { id, role, email }
 * @returns {string} Signed JWT string
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Hash a plain text password using bcrypt.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password string
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare plain text password against bcrypt hash.
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash from database
 * @returns {Promise<boolean>} True if match
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Register a new user (Customer or Vendor).
 * Strictly forbids registering as an admin.
 * @param {Object} data
 * @param {string} data.name - Full name
 * @param {string} data.email - Valid email
 * @param {string} data.password - Password (min 6 characters)
 * @param {string} [data.role='customer'] - Role ('customer' or 'vendor')
 * @param {string} [data.businessName] - Vendor business name (if registering as vendor)
 * @param {string} [data.phone] - Phone number (if vendor or customer)
 * @param {string} [data.address] - Address (if vendor)
 * @returns {Promise<Object>} { user, token }
 */
const registerUser = async ({ name, email, password, role = 'customer', businessName, phone, address }) => {
  // 1. Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AuthError('Full name is required', 400);
  }

  if (!email || !isValidEmail(email)) {
    throw new AuthError('A valid email address is required', 400);
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new AuthError('Password must be at least 6 characters long', 400);
  }

  // 2. Validate role - admin registration strictly forbidden via public API
  const normalizedRole = (role || 'customer').trim().toLowerCase();
  if (normalizedRole === 'admin') {
    throw new AuthError('Registering as administrator is not permitted', 403);
  }

  if (!['customer', 'vendor'].includes(normalizedRole)) {
    throw new AuthError('Role must be either "customer" or "vendor"', 400);
  }

  // 3. Prevent duplicate email registration
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    throw new AuthError('An account with this email address already exists', 409);
  }

  // 4. Hash password securely
  const passwordHash = await hashPassword(password);

  // 5. Create user record in database
  const newUser = await userModel.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: normalizedRole,
  });

  // 6. If vendor, create corresponding vendor record
  let vendorProfile = null;
  if (normalizedRole === 'vendor') {
    vendorProfile = await userModel.createVendorProfile({
      userId: newUser.id,
      businessName: businessName ? businessName.trim() : `${name.trim()}'s Shop`,
      businessEmail: email.trim().toLowerCase(),
      phone: phone || null,
      address: address || null,
      status: 'pending',
    });
  }

  // 7. Generate JWT token
  const token = generateToken(newUser);

  // 8. Return safe user object (never password/hash)
  return {
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      vendor: vendorProfile,
    },
  };
};

/**
 * Authenticate user login credentials.
 * @param {Object} credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - Plain text password
 * @returns {Promise<Object>} { token, user }
 */
const loginUser = async ({ email, password }) => {
  // 1. Validate required fields
  if (!email || !password) {
    throw new AuthError('Email and password are required', 400);
  }

  if (!isValidEmail(email)) {
    throw new AuthError('Invalid email format', 400);
  }

  // 2. Look up user by email
  const user = await userModel.findByEmail(email);
  if (!user) {
    // Avoid user enumeration: generic error message
    throw new AuthError('Invalid email or password', 401);
  }

  // 3. Verify password hash using bcrypt
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new AuthError('Invalid email or password', 401);
  }

  // 4. Fetch associated vendor profile if role is vendor
  let vendorProfile = null;
  if (user.role === 'vendor') {
    vendorProfile = await userModel.findVendorByUserId(user.id);
  }

  // 5. Generate JWT token
  const token = generateToken(user);

  // 6. Return safe authentication response
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vendor: vendorProfile,
    },
  };
};

/**
 * Get current user profile by user ID.
 * Excludes sensitive fields and attaches vendor profile if applicable.
 * @param {string} userId - UUID
 * @returns {Promise<Object>} Safe user profile
 */
const getUserProfile = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new AuthError('User profile not found', 404);
  }

  let vendorProfile = null;
  if (user.role === 'vendor') {
    vendorProfile = await userModel.findVendorByUserId(user.id);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    vendor: vendorProfile,
  };
};

module.exports = {
  AuthError,
  generateToken,
  hashPassword,
  comparePassword,
  registerUser,
  loginUser,
  getUserProfile,
};
