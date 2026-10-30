import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], itemCount: 0, subtotal: 0, vendors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  const isCustomer = isAuthenticated && user?.role === 'customer';

  const clearFeedbackTimer = useCallback(() => {
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!isCustomer) {
      setCart({ items: [], itemCount: 0, subtotal: 0, vendors: [] });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await cartApi.getCart();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (err) {
      console.warn('[Cart] Failed to load cart:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    if (!isCustomer) {
      throw new Error('Please sign in as a customer to add items to your cart.');
    }
    setIsMutating(true);
    setError(null);
    try {
      const res = await cartApi.addItem(productId, quantity);
      if (res.success && res.cart) {
        setCart(res.cart);
        setFeedback({ type: 'success', message: 'Added to cart!' });
        clearFeedbackTimer();
        return res.cart;
      }
      throw new Error(res.message || 'Could not add item');
    } catch (err) {
      setError(err.message);
      setFeedback({ type: 'error', message: err.message });
      clearFeedbackTimer();
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    setIsMutating(true);
    setError(null);
    try {
      const res = await cartApi.updateItem(productId, quantity);
      if (res.success && res.cart) {
        setCart(res.cart);
        return res.cart;
      }
      throw new Error(res.message || 'Could not update item');
    } catch (err) {
      setError(err.message);
      setFeedback({ type: 'error', message: err.message });
      clearFeedbackTimer();
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const removeFromCart = async (productId) => {
    setIsMutating(true);
    setError(null);
    try {
      const res = await cartApi.removeItem(productId);
      if (res.success && res.cart) {
        setCart(res.cart);
        setFeedback({ type: 'success', message: 'Item removed' });
        clearFeedbackTimer();
        return res.cart;
      }
      throw new Error(res.message || 'Could not remove item');
    } catch (err) {
      setError(err.message);
      setFeedback({ type: 'error', message: err.message });
      clearFeedbackTimer();
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const clearCart = async () => {
    setIsMutating(true);
    setError(null);
    try {
      const res = await cartApi.clearCart();
      if (res.success && res.cart) {
        setCart(res.cart);
        setFeedback({ type: 'success', message: 'Cart cleared' });
        clearFeedbackTimer();
        return res.cart;
      }
    } catch (err) {
      setError(err.message);
      setFeedback({ type: 'error', message: err.message });
      clearFeedbackTimer();
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const value = {
    cart,
    itemCount: cart?.itemCount || 0,
    subtotal: cart?.subtotal || 0,
    items: cart?.items || [],
    isLoading,
    isMutating,
    error,
    feedback,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    isCustomer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

