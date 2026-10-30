const cartService = require('../services/cartService');

/**
 * Cart controllers. userId is ALWAYS taken from the verified JWT (req.user.id),
 * never from the request body/params, and prices are never read from the client.
 */

const getCart = async (req, res, next) => {
  try {
    const { cart, source } = await cartService.getCart(req.user.id);
    return res.status(200).json({ success: true, cart, source });
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body || {};
    const cart = await cartService.addItem(req.user.id, productId, quantity);
    return res.status(200).json({ success: true, message: 'Item added to cart', cart });
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { quantity } = req.body || {};
    const cart = await cartService.updateItem(req.user.id, req.params.productId, quantity);
    return res.status(200).json({ success: true, message: 'Cart item updated', cart });
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeItem(req.user.id, req.params.productId);
    return res.status(200).json({ success: true, message: 'Item removed from cart', cart });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.user.id);
    return res.status(200).json({ success: true, message: 'Cart cleared', cart });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };

