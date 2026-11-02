import { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function CartModal({ isOpen, onClose, onCheckout }) {
  const { cart, itemCount, subtotal, items, isLoading, isMutating, updateQuantity, removeFromCart, clearCart } = useCart();
  const [updatingId, setUpdatingId] = useState(null);

  if (!isOpen) return null;

  const handleQtyChange = async (productId, newQty, stock) => {
    if (newQty < 1 || (stock && newQty > stock)) return;
    setUpdatingId(productId);
    try {
      await updateQuantity(productId, newQty);
    } catch (_) {
      // Error handled in context feedback
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId) => {
    setUpdatingId(productId);
    try {
      await removeFromCart(productId);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Shopping Cart</span>
                {itemCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">Redis-cached - Persistent PostgreSQL Cart</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                disabled={isMutating}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2.5 py-1 rounded hover:bg-rose-50 transition disabled:opacity-50"
              >
                Clear Cart
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close cart"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading && items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500">Loading your cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Your cart is empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Explore authentic goods delivered directly by approved independent merchants across our marketplace network.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const target = document.getElementById('products');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-200 transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const isItemUpdating = updatingId === item.productId;
                const canIncrease = item.quantity < item.stock;

                return (
                  <div
                    key={item.productId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 transition gap-4"
                  >
                    {/* Item Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800';
                            }}
                          />
                        ) : (
                          <span className="text-2xl text-slate-300">📦</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                          <span>{item.vendor || 'Independent Merchant'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          ${Number(item.price).toFixed(2)} each
                          {item.stock <= 5 && (
                            <span className="ml-2 text-[10px] text-amber-600 font-semibold">
                              Only {item.stock} in stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls, subtotal & remove */}
                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      {/* Quantity stepper */}
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, item.quantity - 1, item.stock)}
                          disabled={item.quantity <= 1 || isItemUpdating}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-md disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-slate-800">
                          {isItemUpdating ? '...' : item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, item.quantity + 1, item.stock)}
                          disabled={!canIncrease || isItemUpdating}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-md disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                          title={!canIncrease ? 'Reached available stock' : 'Increase quantity'}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-sm font-bold text-slate-900">
                          ${Number(item.subtotal).toFixed(2)}
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.productId)}
                        disabled={isItemUpdating}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Multi-vendor breakdown note */}
              {cart?.vendors && cart.vendors.length > 1 && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
                  <span className="font-semibold">Multi-Vendor Cart:</span> Containing items from{' '}
                  <span className="font-bold">{cart.vendors.length} independent vendors</span>. Items will be fulfilled by each merchant upon checkout in Stage 7.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with totals & action */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Cart Subtotal</div>
              <div className="text-2xl font-extrabold text-slate-900">
                ${Number(subtotal).toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onCheckout) onCheckout();
                }}
                className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-200 transition flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Checkout</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

