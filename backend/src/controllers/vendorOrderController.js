const orderService = require('../services/orderService');

/**
 * Vendor Orders List Controller.
 * GET /api/vendor/orders
 * Access: Vendor only
 */
const getVendorOrders = async (req, res, next) => {
  try {
    const result = await orderService.getVendorOrders(req.user, req.query);
    return res.status(200).json({
      success: true,
      orders: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor Order Details Controller.
 * GET /api/vendor/orders/:id
 * Access: Vendor only (must own order)
 */
const getVendorOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getVendorOrderById(req.user, req.params.id);
    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor Order Status Update Controller.
 * PUT /api/vendor/orders/:id/status
 * Access: Vendor only (must own order)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateVendorOrderStatus(req.user, req.params.id, req.body.status);
    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVendorOrders,
  getVendorOrderById,
  updateOrderStatus,
};
