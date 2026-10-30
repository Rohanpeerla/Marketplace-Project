const orderService = require('../services/orderService');

/**
 * Admin All Orders List Controller.
 * GET /api/admin/orders
 * Access: Admin only
 */
const getAdminOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAdminOrders(req.query);
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
 * Admin Order Details Controller.
 * GET /api/admin/orders/:id
 * Access: Admin only
 */
const getAdminOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getAdminOrderById(req.params.id);
    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOrders,
  getAdminOrderById,
};
