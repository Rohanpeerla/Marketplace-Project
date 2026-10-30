import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { orderApi } from '../services/api';

export default function CheckoutModal({ isOpen, onClose, onOrderSuccess, onOpenOrders }) {
  const { cart, refreshCart } = useCart();
  const [formData, setFormData] = useState({
    shippingAddress: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [placedOrders, setPlacedOrders] = useState(null);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!formData.shippingAddress.trim()) {
      setError('Street address is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await orderApi.checkout(formData);
      
      // Invalidate frontend cart state
      await refreshCart();

      // Show confirmation
      setPlacedOrders(response.orders || []);
      if (onOrderSuccess) onOrderSuccess(response.orders);
    } catch (err) {
      setError(err.message || 'Failed to complete checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlacedOrders(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
              🛍️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {placedOrders ? 'Order Confirmed!' : 'Checkout & Shipping'}
              </h3>
              <p className="text-xs text-slate-500">
                {placedOrders
                  ? 'Thank you! Your order has been placed with the vendor(s).'
                  : 'Review your items and provide delivery details.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {placedOrders ? (
            /* Order Placed Success View */
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  {placedOrders.length === 1 ? 'Order Successfully Placed' : 'Multi-Vendor Orders Placed'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  We have forwarded your purchase directly to {placedOrders.length} independent vendor{placedOrders.length > 1 ? 's' : ''} for fulfillment.
                </p>
              </div>

              {/* Created Orders Cards */}
              <div className="space-y-3 text-left">
                {placedOrders.map((ord, idx) => (
                  <div key={ord.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">Order ID: </span>
                        <span className="font-mono text-indigo-600 font-bold">{ord.id}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                        {ord.status || 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div>Merchant: <strong className="text-slate-800">{ord.vendorName || 'Independent Vendor'}</strong></div>
                      <div className="font-bold text-slate-900">${Number(ord.total).toFixed(2)}</div>
                    </div>

                    {ord.items && (
                      <div className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 space-y-1">
                        {ord.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between">
                            <span>{item.quantity}x {item.productName || item.name || 'Product'}</span>
                            <span>${Number(item.subtotal || (item.price * item.quantity)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    if (onOpenOrders) onOpenOrders();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition"
                >
                  View My Orders
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleCheckout} className="space-y-6">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <span className="text-rose-500 font-bold">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Order Summary Snapshot */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Order Summary ({items.length} unique item{items.length !== 1 ? 's' : ''})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                      <div className="truncate max-w-[280px]">
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="text-slate-400 ml-1.5">x{item.quantity}</span>
                        <span className="text-[10px] text-indigo-600 block">Sold by {item.vendor}</span>
                      </div>
                      <div className="font-semibold text-slate-900">
                        ${Number(item.subtotal).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Due:</span>
                  <span className="text-indigo-600 text-base">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Shipping Address Inputs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Delivery Address & Contact
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleChange}
                    placeholder="e.g. 123 Market St, Suite 400"
                    required
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. San Francisco"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. CA"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 94105"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 555-0199"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Vendor fulfillment note */}
              {cart?.vendors && cart.vendors.length > 1 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  ⚠️ <strong>Notice:</strong> Your cart includes products from <strong>{cart.vendors.length} different vendors</strong>. Separate orders will be created and processed independently by each merchant.
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <span>Confirm & Place Order (${subtotal.toFixed(2)})</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
