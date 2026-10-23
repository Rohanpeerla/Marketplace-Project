export default function BackendStatusCard({
  apiStatus,
  apiLoading,
  apiError,
  dbStatus,
  dbLoading,
  dbError,
  onRefresh,
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              System Infrastructure & Database Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time monitoring for Express API and PostgreSQL database health.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={apiLoading || dbLoading}
            className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 ${apiLoading || dbLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{apiLoading || dbLoading ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* Dual Health Check Cards */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. API Health (GET /api/health) */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${apiStatus?.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span className="font-semibold text-slate-900 text-xs">Express API Engine</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                apiStatus?.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {apiLoading ? 'Checking...' : apiStatus?.success ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>Endpoint: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">GET /api/health</code></div>
              <div className="text-slate-500">
                Response: <span className="font-medium text-slate-700">{apiStatus?.message || apiError || 'Connecting...'}</span>
              </div>
            </div>
          </div>

          {/* 2. PostgreSQL Health (GET /api/health/db) */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${dbStatus?.success ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                <span className="font-semibold text-slate-900 text-xs">PostgreSQL Database</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                dbStatus?.success ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {dbLoading ? 'Checking...' : dbStatus?.success ? 'CONNECTED' : 'STANDBY / PENDING'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>Endpoint: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">GET /api/health/db</code></div>
              <div className="text-slate-500">
                Status: <span className="font-medium text-slate-700">
                  {dbStatus?.database === 'connected'
                    ? `Connected (${dbStatus?.latencyMs ?? 1}ms)`
                    : dbStatus?.message || dbError || 'Pending local PostgreSQL startup'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
