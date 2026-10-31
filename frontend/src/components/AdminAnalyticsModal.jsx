import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../services/api';

export default function AdminAnalyticsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [ordersStats, setOrdersStats] = useState(null);
  const [productsStats, setProductsStats] = useState(null);
  const [vendorsStats, setVendorsStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const [ovRes, revRes, ordRes, prodRes, vendRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getRevenue(),
        analyticsApi.getOrders(),
        analyticsApi.getProducts(),
        analyticsApi.getVendors(),
      ]);

      setOverview(ovRes.data);
      setRevenue(revRes.data);
      setOrdersStats(ordRes.data);
      setProductsStats(prodRes.data);
      setVendorsStats(vendRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                MarketHub Admin Analytics Dashboard
              </h3>
              <p className="text-xs text-slate-500">
                Real-time marketplace KPIs, revenue trends, vendor rankings, and inventory alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loading}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 transition"
              title="Refresh Analytics"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-xl font-bold transition"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & KPIs', icon: '📈' },
            { id: 'revenue', label: 'Revenue Trends', icon: '💰' },
            { id: 'orders', label: 'Orders Distribution', icon: '📦' },
            { id: 'products', label: 'Top Products & Stock', icon: '🏷️' },
            { id: 'vendors', label: 'Vendor Rankings', icon: '🏪' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Aggregating marketplace metrics...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-6">
                  {/* Top KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-indigo-700">Gross Revenue</div>
                      <div className="text-2xl font-black text-indigo-950 mt-1">
                        ${Number(overview.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-indigo-600 mt-1">From verified paid orders</div>
                    </div>

                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-emerald-700">Total Orders</div>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {overview.total_orders || 0}
                      </div>
                      <div className="text-[10px] text-emerald-600 mt-1">
                        {overview.delivered_orders || 0} successfully delivered
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-amber-700">Avg Order Value</div>
                      <div className="text-2xl font-black text-amber-950 mt-1">
                        ${Number(overview.average_order_value || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-amber-600 mt-1">Per paid checkout</div>
                    </div>

                    <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-purple-700">Discounts Given</div>
                      <div className="text-2xl font-black text-purple-950 mt-1">
                        ${Number(overview.total_discounts_given || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-purple-600 mt-1">From applied coupons</div>
                    </div>
                  </div>

                  {/* Secondary KPI Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{overview.total_customers || 0}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">Active Customers</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{overview.total_approved_vendors || 0}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">Approved Merchants</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{overview.total_active_products || 0}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">Active Products Listed</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REVENUE TRENDS */}
              {activeTab === 'revenue' && revenue && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                      Monthly Revenue History
                    </h4>
                    {revenue.monthly.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No paid transactions recorded yet.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {revenue.monthly.map((m) => (
                          <div key={m.month} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                            <span className="font-bold text-slate-800">{m.month}</span>
                            <div className="flex items-center gap-6">
                              <span className="text-slate-500">{m.order_count} orders</span>
                              <span className="font-extrabold text-indigo-600">${Number(m.revenue).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                      Payment Providers & Verification Status
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {revenue.payments.map((p, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                          <span className="font-medium text-slate-800 uppercase">{p.provider || 'Platform'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {p.status}
                          </span>
                          <span className="text-slate-500">{p.count} payments</span>
                          <span className="font-bold text-slate-900">${Number(p.total_amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ORDERS DISTRIBUTION */}
              {activeTab === 'orders' && ordersStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-3xl font-black text-emerald-700">{ordersStats.fulfillmentRate}%</div>
                      <div className="text-xs font-semibold text-emerald-900 mt-1">Fulfillment Rate</div>
                    </div>
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                      <div className="text-3xl font-black text-rose-700">{ordersStats.cancellationRate}%</div>
                      <div className="text-xs font-semibold text-rose-900 mt-1">Cancellation Rate</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                      Orders Grouped by Lifecycle Status
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {ordersStats.distribution.map((d) => (
                        <div key={d.order_status} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                          <span className="font-bold uppercase tracking-wider text-slate-800">{d.order_status}</span>
                          <div className="flex items-center gap-6">
                            <span className="text-slate-600 font-semibold">{d.count} orders</span>
                            <span className="font-extrabold text-slate-900">${Number(d.total_value).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRODUCTS & STOCK */}
              {activeTab === 'products' && productsStats && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                      Top Selling Products
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {productsStats.topSelling.length === 0 ? (
                        <p className="p-4 text-xs text-slate-400 italic">No sales recorded yet.</p>
                      ) : (
                        productsStats.topSelling.map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[11px] text-slate-400">Sold by {p.vendor_name}</div>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md mr-3">
                                {p.total_sold} units
                              </span>
                              <span className="font-extrabold text-slate-900">${Number(p.total_sales).toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Low Stock Inventory Alerts (≤ 5 units)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {productsStats.lowStock.length === 0 ? (
                        <p className="p-4 text-xs text-slate-400 italic">All active products maintain healthy stock levels.</p>
                      ) : (
                        productsStats.lowStock.map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-rose-50/40">
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[11px] text-slate-400">Merchant: {p.vendor_name}</div>
                            </div>
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-xs">
                              {p.stock === 0 ? 'Out of Stock' : `Only ${p.stock} left`}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: VENDORS */}
              {activeTab === 'vendors' && vendorsStats && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Merchant Leaderboard & Performance
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {vendorsStats.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 italic">No vendor records found.</p>
                    ) : (
                      vendorsStats.map((v) => (
                        <div key={v.vendor_id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{v.business_name}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${v.vendor_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {v.vendor_status}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px]">{v.business_email} &bull; {v.product_count} products</div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-500 text-[11px]">{v.total_orders} orders</div>
                            <div className="font-extrabold text-indigo-600 text-sm">
                              ${Number(v.total_revenue).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
