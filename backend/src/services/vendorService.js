const { vendorModel } = require('../models');
const { AppError } = require('../utils/appError');

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
};

/**
 * Retrieve vendor profile for an authenticated user.
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Vendor profile
 */
const getVendorProfile = async (userId) => {
  const vendor = await vendorModel.findByUserId(userId);
  if (!vendor) {
    throw new AppError('Vendor profile not found for this user', 404);
  }
  return vendor;
};

/**
 * Update authenticated vendor's profile.
 * Rejects modifications to vendor id, user_id, status, or timestamps.
 * @param {string} userId - User UUID
 * @param {Object} updateData
 * @param {string} [updateData.businessName]
 * @param {string} [updateData.businessEmail]
 * @param {string} [updateData.phone]
 * @param {string} [updateData.address]
 * @returns {Promise<Object>}
 */
const updateVendorProfile = async (userId, { businessName, businessEmail, phone, address }) => {
  const vendor = await vendorModel.findByUserId(userId);
  if (!vendor) {
    throw new AppError('Vendor profile not found for this user', 404);
  }

  // Validate businessName if supplied
  if (businessName !== undefined) {
    if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
      throw new AppError('Business name cannot be empty', 400);
    }
    if (businessName.trim().length > 150) {
      throw new AppError('Business name must not exceed 150 characters', 400);
    }
  }

  // Validate businessEmail if supplied
  if (businessEmail !== undefined) {
    if (!businessEmail || !isValidEmail(businessEmail)) {
      throw new AppError('A valid business email address is required', 400);
    }
  }

  // Validate phone if supplied
  if (phone !== undefined && phone !== null && phone.trim()) {
    if (phone.trim().length > 20) {
      throw new AppError('Phone number must not exceed 20 characters', 400);
    }
  }

  const updated = await vendorModel.updateProfile(vendor.id, {
    businessName,
    businessEmail,
    phone,
    address,
  });

  return updated;
};

/**
 * Retrieve all vendors (for admin review / vendor directory).
 * @param {Object} options
 * @returns {Promise<Array>}
 */
const listVendors = async (options) => {
  return vendorModel.findAll(options);
};

module.exports = {
  getVendorProfile,
  updateVendorProfile,
  listVendors,
};
