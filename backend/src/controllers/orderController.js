const orderService = require('../services/orderService');
const invoiceService = require('../services/invoiceService');

/**
 * Customer Checkout Controller.
 * POST /api/orders/checkout
 * Access: Customer only
 */
const checkout = async (req, res, next) => {
  try {
    const result = await orderService.checkout(req.user.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Customer Order History Controller.
 * GET /api/orders
 * Access: Customer only
 */
const getOrders = async (req, res, next) => {
  try {
    const result = await orderService.getCustomerOrders(req.user.id, req.query);
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
 * Customer Order Details Controller.
 * GET /api/orders/:id
 * Access: Customer only (must own order)
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getCustomerOrderById(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer Order Cancellation Controller.
 * PUT /api/orders/:id/cancel
 * Access: Customer only (must own order and status must be pending/placed/confirmed)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and inventory restored',
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download Invoice PDF
 * GET /api/orders/:id/invoice
 * Access: Authenticated Customer (order owner) or Admin
 */
const downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { doc, filename } = await invoiceService.generateInvoicePdf(id, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
};

