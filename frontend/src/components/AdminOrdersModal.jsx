import React, { useState, useEffect } from 'react';
import { adminOrderApi } from '../services/api';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  placed: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-sky-100 text-sky-800 border-sky-200',
  packed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  shipped: 'bg-blue-100 text-blue-800 border-blue-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function AdminOrdersModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    } else {
      setSelectedOrder(null);
      setError('');
    }
  }, [isOpen, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await adminOrderApi.getOrders(params);
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.message || 'Could not load marketplace orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (orderId) => {
    try {
      setDetailLoading(true);
      setError('');
      const res = await adminOrderApi.getOrderById(orderId);
      setSelectedOrder(res.order);
    } catch (err) {
      setError(err.message || 'Could not fetch order details');
    } finally {
      setDetailLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-lg">
              🛡️
            </span>
            <div>
              <h3 className="text-base font-bold">Marketplace Orders Overview (Admin)</h3>
              <p className="text-xs text-slate-300">Monitor all transactions, vendor fulfillments, and order statuses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          {['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st || 'all'}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap capitalize ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st || 'All Orders'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-rose-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading platform orders...</p>
            </div>
          ) : selectedOrder ? (
            /* Detailed View */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  ← Back to All Orders
                </button>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[selectedOrder.order_status] || 'bg-slate-100 text-slate-700'}`}>
                  {selectedOrder.order_status}
                </span>
              </div>

              {/* Order Meta Header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Order ID</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] truncate block" title={selectedOrder.id}>
                    {selectedOrder.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Customer</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedOrder.customer_name || 'Customer'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">{selectedOrder.customer_email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Merchant / Vendor</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedOrder.vendor_name || 'Independent Merchant'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Amount</span>
                  <span className="text-base font-extrabold text-blue-600 block">
                    ${Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 block mb-0.5">Shipping Destination:</span>
                <span className="text-slate-600">{selectedOrder.shipping_address}</span>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Order Line Items</h4>
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
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400">
                📊
              </div>
              <h4 className="text-sm font-bold text-slate-800">No marketplace orders found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter ? `No orders found with status "${statusFilter}".` : 'No orders have been placed in the marketplace yet.'}
              </p>
            </div>
          ) : (
            /* Table of all platform orders */
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Merchant</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => handleSelectOrder(ord.id)}>
                      <td className="py-3 px-3 font-mono text-blue-600 font-bold">
                        #{ord.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-medium">
                        {ord.customer_name || 'Customer'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {ord.vendor_name || 'Vendor'}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        ${Number(ord.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[ord.order_status] || 'bg-slate-100 text-slate-700'}`}>
                          {ord.order_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOrder(ord.id);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 rounded text-[11px] font-semibold transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

