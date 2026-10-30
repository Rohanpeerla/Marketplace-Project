const paymentService = require('../services/paymentService');

/**
 * Customer creates Razorpay payment order.
 * POST /api/payments/create-order
 * Access: Customer only
 */
const createOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentOrder(req.user.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Customer verifies Razorpay payment signature after checkout modal completion.
 * POST /api/payments/verify
 * Access: Customer only
 */
const verify = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Customer handles payment failure or dismissal.
 * POST /api/payments/fail
 * Access: Customer only
 */
const fail = async (req, res, next) => {
  try {
    const result = await paymentService.handlePaymentFailure(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve payment details for an order.
 * GET /api/payments/order/:orderId
 * Access: Authenticated user (Customer owner, Vendor owner, or Admin)
 */
const getPaymentByOrder = async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentByOrderId(req.user, req.params.orderId);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve public Razorpay test configuration (safe for frontend).
 * GET /api/payments/config
 * Access: Authenticated / Public
 */
const getConfig = async (req, res, next) => {
  try {
    const config = paymentService.getPublicConfig();
    return res.status(200).json({
      success: true,
      ...config,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verify,
  fail,
  getPaymentByOrder,
  getConfig,
};
