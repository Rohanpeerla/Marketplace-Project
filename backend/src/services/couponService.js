const couponModel = require('../models/couponModel');
const { AppError } = require('../utils/appError');

class CouponService {
  /**
   * Validate coupon against an order amount and return discount calculation
   */
  async validateCoupon(code, orderAmount, client = null) {
    if (!code || typeof code !== 'string') {
      throw new AppError('Coupon code is required', 400);
    }
    const amount = Number(orderAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new AppError('Valid order amount is required to apply a coupon', 400);
    }

    const coupon = client 
      ? await couponModel.findByCodeForUpdate(code, client)
      : await couponModel.findByCode(code);

    if (!coupon) {
      throw new AppError('Invalid coupon code', 404);
    }

    if (!coupon.active) {
      throw new AppError('This coupon is currently inactive', 400);
    }

    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      throw new AppError('This coupon is not active yet', 400);
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
      throw new AppError('This coupon has expired', 400);
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      throw new AppError('This coupon has reached its maximum usage limit', 400);
    }

    const minAmount = Number(coupon.minimum_order_amount) || 0;
    if (amount < minAmount) {
      throw new AppError(
        `Minimum order amount of ₹${minAmount.toFixed(2)} is required for this coupon`,
        400
      );
    }

    // Calculate discount
    let discount = 0;
    const discountVal = Number(coupon.discount_value);

    if (coupon.discount_type === 'percentage') {
      discount = (amount * discountVal) / 100;
      if (coupon.maximum_discount_amount !== null) {
        const maxDisc = Number(coupon.maximum_discount_amount);
        if (discount > maxDisc) {
          discount = maxDisc;
        }
      }
    } else if (coupon.discount_type === 'fixed') {
      discount = Math.min(discountVal, amount);
    } else {
      throw new AppError('Unknown discount type', 400);
    }

    discount = Math.round(discount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((amount - discount) * 100) / 100);

    return {
      coupon,
      orderAmount: amount,
      discountAmount: discount,
      finalAmount
    };
  }

  /**
   * Admin: List coupons
   */
  async listCoupons(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const active = query.active !== undefined ? query.active : undefined;
    return couponModel.findAll({ page, limit, active });
  }

  /**
   * Admin: Create coupon
   */
  async createCoupon(data) {
    const { code, discount_type, discount_value } = data;
    if (!code || !discount_type || discount_value === undefined) {
      throw new AppError('Code, discount_type, and discount_value are required', 400);
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      throw new AppError("discount_type must be 'percentage' or 'fixed'", 400);
    }

    const numVal = Number(discount_value);
    if (isNaN(numVal) || numVal <= 0) {
      throw new AppError('discount_value must be a positive number', 400);
    }

    if (discount_type === 'percentage' && numVal > 100) {
      throw new AppError('Percentage discount cannot exceed 100%', 400);
    }

    const existing = await couponModel.findByCode(code);
    if (existing) {
      throw new AppError(`Coupon code '${code.toUpperCase()}' already exists`, 409);
    }

    return couponModel.create(data);
  }

  /**
   * Admin: Update coupon
   */
  async updateCoupon(id, data) {
    const existing = await couponModel.findById(id);
    if (!existing) {
      throw new AppError('Coupon not found', 404);
    }

    if (data.code && data.code.toUpperCase() !== existing.code.toUpperCase()) {
      const codeTaken = await couponModel.findByCode(data.code);
      if (codeTaken) {
        throw new AppError(`Coupon code '${data.code.toUpperCase()}' already exists`, 409);
      }
    }

    if (data.discount_type && !['percentage', 'fixed'].includes(data.discount_type)) {
      throw new AppError("discount_type must be 'percentage' or 'fixed'", 400);
    }

    if (data.discount_value !== undefined) {
      const numVal = Number(data.discount_value);
      if (isNaN(numVal) || numVal <= 0) {
        throw new AppError('discount_value must be a positive number', 400);
      }
      const type = data.discount_type || existing.discount_type;
      if (type === 'percentage' && numVal > 100) {
        throw new AppError('Percentage discount cannot exceed 100%', 400);
      }
    }

    return couponModel.update(id, data);
  }

  /**
   * Admin: Delete coupon
   */
  async deleteCoupon(id) {
    const existing = await couponModel.findById(id);
    if (!existing) {
      throw new AppError('Coupon not found', 404);
    }
    await couponModel.delete(id);
    return { message: 'Coupon deleted successfully' };
  }
}

module.exports = new CouponService();
