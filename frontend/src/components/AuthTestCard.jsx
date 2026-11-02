import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function AuthTestCard({ onOpenAuthModal }) {
  const { user, token, isAuthenticated, login, logout } = useAuth();

  const [testResult, setTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(null);
  const [switchingUser, setSwitchingUser] = useState(false);

  const handleTestEndpoint = async (endpoint, label) => {
    setTestingEndpoint(label);
    const start = Date.now();
    try {
      const res = await authApi.testEndpoint(endpoint);
      setTestResult({
        endpoint,
        label,
        status: res.status,
        latency: Date.now() - start,
        data: res.data,
      });
    } catch (err) {
      setTestResult({
        endpoint,
        label,
        status: 'Error',
        latency: Date.now() - start,
        data: { error: err.message },
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const handleQuickSwitch = async (email, password) => {
    setSwitchingUser(true);
    setTestResult(null);
    try {
      await login(email, password);
    } catch (err) {
      console.error('Quick switch failed:', err);
    } finally {
      setSwitchingUser(false);
    }
  };

  // Role badge color helper
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'vendor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="auth-verification-section">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <h2 className="text-lg font-bold tracking-tight">Stage 3: Authentication & Role-Based Access Control (RBAC)</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Verify JWT token verification and server-enforced role authorization for Customer, Vendor, and Admin.
            </p>
          </div>

          {/* Quick Account Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Switch Seeded Account:</span>
            <button
              type="button"
              id="switch-customer-btn"
              disabled={switchingUser}
              onClick={() => handleQuickSwitch('john.doe@example.com', 'Password123!')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                user?.email === 'john.doe@example.com'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              id="switch-vendor-btn"
              disabled={switchingUser}
              onClick={() => handleQuickSwitch('techcraft@markethub.com', 'Password123!')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                user?.email === 'techcraft@markethub.com'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Vendor
            </button>
            <button
              type="button"
              id="switch-admin-btn"
              disabled={switchingUser}
              onClick={() => handleQuickSwitch('admin@markethub.com', 'Password123!')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                user?.email === 'admin@markethub.com'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Auth Status Card */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Authentication Status
                </span>
                {isAuthenticated ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Authenticated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Unauthenticated
                  </span>
                )}
              </div>

              {isAuthenticated && user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{user.name}</h4>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span
                      className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getRoleBadge(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {user.vendor && (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900">
                      <p className="font-semibold flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Vendor Shop: {user.vendor.business_name}
                      </p>
                      <p className="text-emerald-700 mt-1">Status: <strong className="capitalize">{user.vendor.status}</strong></p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                    <p className="flex justify-between">
                      <span className="text-slate-400">User ID:</span>
                      <span className="font-mono text-slate-700 truncate max-w-[200px]">{user.id}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">JWT Token:</span>
                      <span className="font-mono text-blue-600 truncate max-w-[200px]">
                        {token ? `${token.substring(0, 16)}...${token.substring(token.length - 8)}` : 'None'}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-500 mb-3">
                    No active JWT session. Sign in with a seeded account or register a new one to test role endpoints.
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('login')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('register')}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  id="auth-logout-btn"
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Role Authorization Testing */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Role-Based Endpoint Verification
                </span>
                <span className="text-xs text-slate-400">Click to dispatch with active JWT</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <button
                  type="button"
                  id="test-me-btn"
                  disabled={testingEndpoint !== null}
                  onClick={() => handleTestEndpoint('/api/auth/me', 'GET /api/auth/me')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold text-center transition flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400">Profile</span>
                  <span className="font-mono text-indigo-600">/me</span>
                </button>

                <button
                  type="button"
                  id="test-customer-btn"
                  disabled={testingEndpoint !== null}
                  onClick={() => handleTestEndpoint('/api/auth/customer-test', 'GET /customer-test')}
                  className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-900 text-xs font-semibold text-center transition flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <span className="text-[10px] uppercase font-bold text-blue-500">Customer Only</span>
                  <span className="font-mono text-blue-700">/customer-test</span>
                </button>

                <button
                  type="button"
                  id="test-vendor-btn"
                  disabled={testingEndpoint !== null}
                  onClick={() => handleTestEndpoint('/api/auth/vendor-test', 'GET /vendor-test')}
                  className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 text-xs font-semibold text-center transition flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <span className="text-[10px] uppercase font-bold text-emerald-500">Vendor Only</span>
                  <span className="font-mono text-emerald-700">/vendor-test</span>
                </button>

                <button
                  type="button"
                  id="test-admin-btn"
                  disabled={testingEndpoint !== null}
                  onClick={() => handleTestEndpoint('/api/auth/admin-test', 'GET /admin-test')}
                  className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/60 hover:bg-purple-100/60 text-purple-900 text-xs font-semibold text-center transition flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <span className="text-[10px] uppercase font-bold text-purple-500">Admin Only</span>
                  <span className="font-mono text-purple-700">/admin-test</span>
                </button>
              </div>

              {/* Response Inspector Terminal */}
              <div className="bg-slate-900 rounded-xl p-4 text-white font-mono text-xs border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-[11px] text-slate-400 font-sans ml-1">API Response Inspector</span>
                  </div>
                  {testResult && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          testResult.status === 200
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : testResult.status === 403
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        HTTP {testResult.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{testResult.latency}ms</span>
                    </div>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto">
                  {testResult ? (
                    <div>
                      <div className="text-slate-400 text-[11px] mb-1 font-sans">
                        Endpoint: <strong className="text-indigo-400">{testResult.endpoint}</strong>
                      </div>
                      <pre className="text-emerald-400 whitespace-pre-wrap break-all">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-6 text-center">
                      Select one of the endpoints above to dispatch an authenticated request and observe the server response.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Matrix Rule Reminder */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <div className="p-1.5 rounded bg-blue-50/50 border border-blue-100/60">
                <strong className="text-blue-900 block font-semibold">Customer Test</strong>
                Allowed: Customer only (200), others (403)
              </div>
              <div className="p-1.5 rounded bg-emerald-50/50 border border-emerald-100/60">
                <strong className="text-emerald-900 block font-semibold">Vendor Test</strong>
                Allowed: Vendor only (200), others (403)
              </div>
              <div className="p-1.5 rounded bg-purple-50/50 border border-purple-100/60">
                <strong className="text-purple-900 block font-semibold">Admin Test</strong>
                Allowed: Admin only (200), others (403)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
