const couponService = require('../services/couponService');

class CouponController {
  async validateCoupon(req, res, next) {
    try {
      const { code, orderAmount } = req.body;
      const result = await couponService.validateCoupon(code, orderAmount);
      return res.status(200).json({
        success: true,
        message: 'Coupon is valid',
        data: {
          code: result.coupon.code,
          discountType: result.coupon.discount_type,
          discountValue: Number(result.coupon.discount_value),
          discountAmount: result.discountAmount,
          orderAmount: result.orderAmount,
          finalAmount: result.finalAmount
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getCoupons(req, res, next) {
    try {
      const result = await couponService.listCoupons(req.query);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async createCoupon(req, res, next) {
    try {
      const result = await couponService.createCoupon(req.body);
      return res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCoupon(req, res, next) {
    try {
      const { id } = req.params;
      const result = await couponService.updateCoupon(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Coupon updated successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCoupon(req, res, next) {
    try {
      const { id } = req.params;
      const result = await couponService.deleteCoupon(id);
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CouponController();
