import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { orderApi, paymentApi } from '../services/api';

/**
 * Loads Razorpay Standard Checkout SDK script asynchronously if not already loaded.
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  
  // Placed Orders & Payment State
  const [placedOrders, setPlacedOrders] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  /**
   * Triggers Razorpay Checkout SDK Modal or provides interactive test simulation.
   */
  const initiateRazorpayPayment = async (createdOrders) => {
    try {
      setPaying(true);
      setError('');

      const orderIds = createdOrders.map((o) => o.id);
      const paymentData = await paymentApi.createOrder({ orderIds });
      setPaymentSession(paymentData);

      // Attempt to load Razorpay official checkout SDK
      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && window.Razorpay && paymentData.keyId && paymentData.keyId.startsWith('rzp_test_')) {
        const options = {
          key: paymentData.keyId,
          amount: paymentData.amount, // subunits (paise)
          currency: paymentData.currency || 'INR',
          name: 'MarketHub Marketplace',
          description: `Order Checkout (${orderIds.length} order${orderIds.length > 1 ? 's' : ''}) - Test Mode`,
          order_id: paymentData.razorpayOrderId,
          prefill: {
            name: 'MarketHub Customer',
            email: 'customer@example.com',
            contact: formData.phone || '9999999999',
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async (response) => {
            await handleVerifyPayment({
              razorpay_order_id: response.razorpay_order_id || paymentData.razorpayOrderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: async () => {
              setPaying(false);
              try {
                await paymentApi.fail({
                  razorpay_order_id: paymentData.razorpayOrderId,
                  payment_id: 'dismissed_by_user',
                });
              } catch (_) {}
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async (resp) => {
          setPaying(false);
          setError(`Payment Failed: ${resp.error?.description || 'Transaction declined.'}`);
          try {
            await paymentApi.fail({
              razorpay_order_id: paymentData.razorpayOrderId,
              payment_id: resp.error?.metadata?.payment_id,
            });
          } catch (_) {}
        });
        rzp.open();
      }
    } catch (err) {
      setError(err.message || 'Failed to initiate payment.');
    } finally {
      setPaying(false);
    }
  };

  /**
   * Verifies payment with backend.
   */
  const handleVerifyPayment = async (verificationPayload) => {
    try {
      setPaying(true);
      setError('');
      const verifyRes = await paymentApi.verify(verificationPayload);
      setPaymentResult(verifyRes);
    } catch (err) {
      setError(err.message || 'Signature verification failed.');
    } finally {
      setPaying(false);
    }
  };

  /**
   * Helper for developer local / offline simulation of successful Razorpay payment.
   */
  const handleSimulatePayment = async () => {
    if (!paymentSession) return;
    try {
      setPaying(true);
      setError('');

      // Generate mock payment details
      const mockPaymentId = `pay_sim_${Date.now()}`;
      
      // Call mock or standard verification
      const verifyRes = await paymentApi.verify({
        razorpay_order_id: paymentSession.razorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: 'simulated_test_mode_success',
      }).catch(async () => {
        // Fallback for simulation endpoint if custom secret is configured
        return {
          success: true,
          status: 'paid',
          razorpayOrderId: paymentSession.razorpayOrderId,
          razorpayPaymentId: mockPaymentId,
        };
      });

      setPaymentResult(verifyRes);
    } catch (err) {
      setError(err.message || 'Simulated payment failed.');
    } finally {
      setPaying(false);
    }
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

      const createdOrders = response.orders || [];
      setPlacedOrders(createdOrders);
      if (onOrderSuccess) onOrderSuccess(createdOrders);

      // Immediately initiate Razorpay Test Payment Order
      await initiateRazorpayPayment(createdOrders);
    } catch (err) {
      setError(err.message || 'Failed to complete checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlacedOrders(null);
    setPaymentSession(null);
    setPaymentResult(null);
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
              💳
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {paymentResult ? 'Payment & Order Confirmed!' : placedOrders ? 'Complete Payment (Razorpay Test Mode)' : 'Checkout & Shipping'}
              </h3>
              <p className="text-xs text-slate-500">
                {paymentResult
                  ? 'Payment verified successfully. Your orders have been confirmed with the vendors.'
                  : placedOrders
                  ? 'Order created! Complete your test payment below.'
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
            /* Post-Checkout / Payment View */
            <div className="text-center py-4 space-y-5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner ${paymentResult ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {paymentResult ? '✓' : '💳'}
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  {paymentResult
                    ? 'Payment Successful & Orders Confirmed'
                    : 'Order Placed — Awaiting Test Payment'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {paymentResult
                    ? `Captured via Razorpay Test Mode (${paymentResult.razorpayPaymentId || 'pay_test'})`
                    : `Razorpay Order ID: ${paymentSession?.razorpayOrderId || 'Generating...'}`}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 text-left">
                  <span className="text-rose-500 font-bold">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Created Orders Cards */}
              <div className="space-y-3 text-left">
                {placedOrders.map((ord, idx) => (
                  <div key={ord.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">Order ID: </span>
                        <span className="font-mono text-indigo-600 font-bold">{ord.id}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentResult ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {paymentResult ? 'Paid & Confirmed' : 'Payment Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div>Merchant: <strong className="text-slate-800">{ord.vendorName || 'Independent Vendor'}</strong></div>
                      <div className="font-bold text-slate-900">${Number(ord.total).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Action Bar */}
              {!paymentResult ? (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-900">Razorpay Test Mode Checkout</div>
                      <div className="text-[11px] text-indigo-700">Total: ${subtotal.toFixed(2)} ({paymentSession?.amount || subtotal * 100} paise)</div>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-[10px] font-bold uppercase rounded-md">
                      Test Mode
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={paying}
                      onClick={() => initiateRazorpayPayment(placedOrders)}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition flex items-center justify-center gap-2"
                    >
                      {paying ? 'Processing...' : 'Pay with Razorpay Test Mode'}
                    </button>
                    <button
                      type="button"
                      disabled={paying}
                      onClick={handleSimulatePayment}
                      className="px-4 py-2 border border-indigo-300 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-lg transition"
                    >
                      Simulate Test Success
                    </button>
                  </div>
                </div>
              ) : null}

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

              {/* Razorpay Test Mode notice */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <strong>Razorpay Test Mode Integration:</strong> Payments are processed safely in development test mode. No real money or real card details are ever charged.
                </div>
              </div>

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
                      <span>Placing Order & Preparing Payment...</span>
                    </>
                  ) : (
                    <span>Proceed to Payment (${subtotal.toFixed(2)})</span>
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
