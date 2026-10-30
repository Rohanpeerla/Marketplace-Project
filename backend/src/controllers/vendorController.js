const { vendorService } = require('../services');

/**
 * Get authenticated vendor's profile.
 * GET /api/vendors/me
 */
const getProfile = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorProfile(req.user.id);
    return res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated vendor's profile.
 * PUT /api/vendors/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const { businessName, businessEmail, phone, address } = req.body;
    const vendor = await vendorService.updateVendorProfile(req.user.id, {
      businessName,
      businessEmail,
      phone,
      address,
    });

    return res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List vendors (Public/Admin).
 * GET /api/vendors
 */
const listVendors = async (req, res, next) => {
  try {
    const { status } = req.query;
    const vendors = await vendorService.listVendors({ status });
    return res.status(200).json({
      success: true,
      vendors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  listVendors,
};
