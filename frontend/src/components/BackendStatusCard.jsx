import { useState, useEffect } from 'react';

export default function BackendStatusCard({ apiStatus, loading, error, onRefresh }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className={`p-3 rounded-xl ${apiStatus?.success ? 'bg-emerald-50 text-emerald-600' : error ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Backend API Communication (CORS Verification)
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  apiStatus?.success ? 'bg-emerald-100 text-emerald-800' : error ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {loading ? 'Checking...' : apiStatus?.success ? '200 OK' : 'Unavailable'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Endpoint: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">GET /api/health</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

        </div>

        {/* Status Details */}
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block font-medium">Backend Response</span>
            <span className="font-semibold text-slate-800">
              {apiStatus?.message || error || 'Pending test...'}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block font-medium">Environment</span>
            <span className="font-semibold text-slate-800">
              {apiStatus?.environment || 'development'}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block font-medium">Last Verified</span>
            <span className="font-semibold text-slate-800">
              {apiStatus?.timestamp ? new Date(apiStatus.timestamp).toLocaleTimeString() : 'Not yet'}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
