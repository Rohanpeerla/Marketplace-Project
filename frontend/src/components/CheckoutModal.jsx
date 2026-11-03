import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { orderApi, paymentApi, couponApi, invoiceApi } from '../services/api';

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
  const { cart, refreshCart, fetchCart } = useCart();
  const reloadCart = refreshCart || fetchCart || (() => {});
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
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Placed Orders & Payment State
  const [placedOrders, setPlacedOrders] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('card');

  useEffect(() => {
    if (isOpen) {
      reloadCart();
    }
  }, [isOpen]);

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

      // If user has configured real Razorpay test credentials, open the official Razorpay SDK popup
      if (paymentData.isLiveKey && paymentData.keyId && paymentData.keyId !== 'rzp_test_placeholder') {
        const scriptLoaded = await loadRazorpayScript();
        if (scriptLoaded && window.Razorpay) {
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
              color: '#2563eb',
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
          return;
        }
      }

      // If in local dev / test mode without real Razorpay keys:
      // The interactive gateway view is presented below for immediate one-click test payment
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
   * Completes payment via cryptographic HMAC SHA-256 test signature in Razorpay Test Mode.
   */
  const handleSimulatePayment = async () => {
    if (!paymentSession) return;
    try {
      setPaying(true);
      setError('');
      const verifyRes = await paymentApi.simulateSuccess({
        razorpay_order_id: paymentSession.razorpayOrderId,
      });
      setPaymentResult(verifyRes);
    } catch (err) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  /**
   * Simulates payment dismissal or bank decline.
   */
  const handleSimulateFailure = async () => {
    if (!paymentSession) return;
    try {
      setPaying(true);
      setError('');
      await paymentApi.fail({
        razorpay_order_id: paymentSession.razorpayOrderId,
        payment_id: `fail_${Date.now()}`,
      });
      setError('Payment declined/cancelled in Test Mode. You can retry anytime.');
    } catch (err) {
      setError(err.message || 'Could not record failure.');
    } finally {
      setPaying(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setIsValidatingCoupon(true);
      setCouponError('');
      const res = await couponApi.validate(couponCode.trim(), subtotal);
      setAppliedCoupon(res.data);
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (items.length === 0) {
      setError('Your cart is empty. Please add items to your cart.');
      return;
    }
    if (!formData.shippingAddress.trim()) {
      setError('Street address is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const checkoutPayload = {
        ...formData,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      };
      const response = await orderApi.checkout(checkoutPayload);
      
      const createdOrders = response.orders || [];
      setPlacedOrders(createdOrders);
      if (onOrderSuccess) onOrderSuccess(createdOrders);

      // Invalidate frontend cart state
      await reloadCart();

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
    reloadCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner ${paymentResult ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
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
                        <span className="font-mono text-blue-600 font-bold">{ord.id}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentResult ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {paymentResult ? 'Paid & Confirmed' : 'Payment Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div>Merchant: <strong className="text-slate-800">{ord.vendorName || ord.vendor_name || 'Independent Vendor'}</strong></div>
                      <div className="font-bold text-slate-900">${Number(ord.total || ord.total_amount || 0).toFixed(2)}</div>
                    </div>
                    {ord.invoiceNumber && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500">Invoice: <strong className="text-slate-700 font-mono">{ord.invoiceNumber}</strong></span>
                        <button
                          type="button"
                          onClick={() => invoiceApi.downloadInvoice(ord.id, ord.invoiceNumber)}
                          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          📄 Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Action Bar */}
              {!paymentResult ? (
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-left space-y-4">
                  {/* Gateway Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center font-black text-xs text-white">
                        R
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Razorpay Payment Gateway</span>
                          <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-400/30 text-[9px] font-bold rounded uppercase">
                            Test Mode
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Order ID: {paymentSession?.razorpayOrderId || 'order_pending'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Payable</div>
                      <div className="text-sm font-extrabold text-emerald-400">
                        ${Number(paymentSession?.totalAmount ?? subtotal ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div className="flex gap-1.5 p-1 bg-slate-800 rounded-lg text-xs">
                    {[
                      { id: 'card', label: '💳 Card' },
                      { id: 'upi', label: '📱 UPI / QR' },
                      { id: 'netbanking', label: '🏛️ Netbanking' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedPayMethod(m.id)}
                        className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] transition text-center ${
                          selectedPayMethod === m.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Method Details */}
                  {selectedPayMethod === 'card' && (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[11px] text-slate-300">
                        <span>Card Number</span>
                        <span className="text-[10px] bg-slate-700 px-1.5 py-0.2 rounded font-mono text-emerald-400">Test Card</span>
                      </div>
                      <div className="font-mono text-sm tracking-wider text-slate-100 font-bold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                        4111 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 1111
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Valid Thru</span>
                          <span className="font-mono text-slate-200">12 / 28</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">CVV</span>
                          <span className="font-mono text-slate-200">123</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPayMethod === 'upi' && (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                      <div className="text-[11px] text-slate-300">Razorpay Test Virtual Payment Address (VPA)</div>
                      <div className="font-mono text-xs text-blue-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 flex items-center justify-between">
                        <span>success@razorpay</span>
                        <span className="text-[10px] text-emerald-400 font-sans">✓ Auto-approves</span>
                      </div>
                    </div>
                  )}

                  {selectedPayMethod === 'netbanking' && (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                      <div className="text-[11px] text-slate-300">Select Test Bank</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
                        <div className="p-2 bg-slate-900 rounded-lg border border-blue-500/50 text-blue-300">SBI Test Bank</div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-slate-300">HDFC Test Bank</div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-slate-300">ICICI Test Bank</div>
                      </div>
                    </div>
                  )}

                  {/* Primary & Secondary Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={paying}
                      onClick={handleSimulatePayment}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {paying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing & Verifying Payment...</span>
                        </>
                      ) : (
                        <span>Pay ${Number(paymentSession?.totalAmount ?? subtotal ?? 0).toFixed(2)} (Complete Test Payment)</span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={paying}
                      onClick={handleSimulateFailure}
                      className="py-2.5 px-3 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition"
                    >
                      Simulate Decline
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-200 transition"
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
          ) : items.length === 0 ? (
            /* Empty Cart View */
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                🛒
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Your cart is empty</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  You do not have any items in your cart to checkout. If you already placed an order, you can view your orders to complete payment anytime.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    if (onOpenOrders) onOpenOrders();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  View My Orders & Pay
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Browse Products
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
                        <span className="text-[10px] text-blue-600 block">Sold by {item.vendor}</span>
                      </div>
                      <div className="font-semibold text-slate-900">
                        ${Number(item.subtotal).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Code Section */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Have a Coupon / Promo Code?
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>🏷️</span>
                        <span>{appliedCoupon.code} applied: -${Number(appliedCoupon?.discountAmount || 0).toFixed(2)} savings</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="e.g. WELCOME10 or FLAT50"
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs uppercase font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                        <button
                          type="button"
                          disabled={isValidatingCoupon || !couponCode.trim()}
                          onClick={handleApplyCoupon}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition"
                        >
                          {isValidatingCoupon ? 'Checking...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[11px] text-rose-600 font-medium">⚠️ {couponError}</p>
                      )}
                    </div>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold pt-1">
                    <span>Discount:</span>
                    <span>-${Number(appliedCoupon?.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Due:</span>
                  <span className="text-blue-600 text-base">
                    ${Number((appliedCoupon ? appliedCoupon.finalAmount : subtotal) || 0).toFixed(2)}
                  </span>
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
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Razorpay Test Mode notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-200 transition flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Placing Order & Preparing Payment...</span>
                    </>
                  ) : (
                    <span>Proceed to Payment (${Number(subtotal || 0).toFixed(2)})</span>
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
