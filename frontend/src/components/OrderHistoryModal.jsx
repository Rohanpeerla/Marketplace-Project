import React, { useState, useEffect } from 'react';
import { orderApi, paymentApi, invoiceApi } from '../services/api';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  placed: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  packed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  shipped: 'bg-blue-100 text-blue-800 border-blue-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function OrderHistoryModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    } else {
      setSelectedOrder(null);
      setError('');
      setActionMessage('');
    }
  }, [isOpen, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await orderApi.getOrders(params);
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.message || 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePayOrder = async (orderId) => {
    try {
      setPayLoading(true);
      setError('');
      const payData = await paymentApi.createOrder({ orderIds: [orderId] });
      
      // Perform cryptographic signature verification via test gateway
      await paymentApi.simulateSuccess({
        razorpay_order_id: payData.razorpayOrderId,
      });

      setActionMessage('Payment completed successfully via Razorpay Test Gateway!');
      await loadOrders();
      const refreshed = await orderApi.getOrderById(orderId);
      setSelectedOrder(refreshed.order);
    } catch (err) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleSelectOrder = async (orderId) => {
    try {
      setDetailLoading(true);
      setError('');
      const res = await orderApi.getOrderById(orderId);
      setSelectedOrder(res.order);
    } catch (err) {
      setError(err.message || 'Could not fetch order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? The inventory will be restored to the merchant.')) {
      return;
    }

    try {
      setCancelLoading(true);
      setError('');
      await orderApi.cancelOrder(orderId);
      setActionMessage('Order was cancelled successfully and items have been restocked.');
      
      // Refresh current detail and list
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const refreshed = await orderApi.getOrderById(orderId);
        setSelectedOrder(refreshed.order);
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCancellable = (status) => ['pending', 'placed', 'confirmed'].includes(status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
              📦
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">My Orders</h3>
              <p className="text-xs text-slate-500">Track and manage your marketplace purchases</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          {['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st || 'all'}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap capitalize ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st || 'All Orders'}
            </button>
          ))}
        </div>

        {/* Notifications */}
        {actionMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button type="button" onClick={() => setActionMessage('')} className="text-emerald-500 font-bold ml-2">✕</button>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-rose-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Body (Split list + detail if selected) */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading your orders...</p>
            </div>
          ) : selectedOrder ? (
            /* Selected Order Detail View */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  ← Back to Orders List
                </button>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[selectedOrder.order_status] || 'bg-slate-100 text-slate-700'}`}>
                  {selectedOrder.order_status}
                </span>
              </div>

              {/* Order Meta Header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Order ID</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] truncate block" title={selectedOrder.id}>
                    {selectedOrder.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Merchant</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedOrder.vendor_name || 'Independent Merchant'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Placed On</span>
                  <span className="font-medium text-slate-800">
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border inline-block mt-0.5 ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    {selectedOrder.payment_status || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Amount</span>
                  <span className="text-base font-extrabold text-indigo-600 block">
                    ${Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 block mb-0.5">Shipping Destination:</span>
                <span className="text-slate-600">{selectedOrder.shipping_address}</span>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Purchased Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items && selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-base shrink-0">
                          📦
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{item.product_name || 'Product'}</div>
                          <div className="text-slate-500 text-[11px]">Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-900">
                        ${Number(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <div>
                  {isCancellable(selectedOrder.order_status) && (
                    <span className="text-[11px] text-slate-500">
                      Eligible for cancellation before fulfillment begins.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => invoiceApi.downloadInvoice(selectedOrder.id, selectedOrder.invoice_number)}
                    className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition flex items-center gap-1.5"
                  >
                    <span>📄</span>
                    <span>Download PDF Invoice</span>
                  </button>
                  {selectedOrder.payment_status !== 'paid' && selectedOrder.order_status !== 'cancelled' && (
                    <button
                      type="button"
                      disabled={payLoading}
                      onClick={() => handlePayOrder(selectedOrder.id)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>💳</span>
                      <span>{payLoading ? 'Processing...' : 'Pay Now (Test Mode)'}</span>
                    </button>
                  )}
                  {isCancellable(selectedOrder.order_status) && (
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : orders.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400">
                🛍️
              </div>
              <h4 className="text-sm font-bold text-slate-800">No orders found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter
                  ? `You do not have any orders currently marked as "${statusFilter}".`
                  : 'You have not placed any orders yet. Discover items from marketplace vendors!'}
              </p>
            </div>
          ) : (
            /* Orders List */
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => handleSelectOrder(ord.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        #{ord.id.slice(0, 8)}...
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[ord.order_status] || 'bg-slate-100 text-slate-700'}`}>
                        {ord.order_status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ord.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {ord.payment_status || 'Unpaid'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Merchant: <strong className="text-slate-800">{ord.vendor_name || 'Independent Merchant'}</strong>
                      <span className="mx-1.5">•</span>
                      <span>{ord.item_count || 1} item{ord.item_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Placed on {new Date(ord.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-right mr-1">
                      <div className="text-[10px] text-slate-500 uppercase">Total</div>
                      <div className="text-sm font-extrabold text-slate-900">${Number(ord.total_amount).toFixed(2)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        invoiceApi.downloadInvoice(ord.id, ord.invoice_number);
                      }}
                      title="Download PDF Invoice"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                    >
                      <span>📄</span>
                      <span className="hidden sm:inline">PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOrder(ord.id);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-xs font-semibold rounded-lg transition"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

