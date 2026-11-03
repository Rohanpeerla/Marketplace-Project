import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar({
  apiStatus,
  onOpenSystemStatus,
  onOpenAuthModal,
  onOpenVendorDashboard,
  onOpenAdminCategories,
  onOpenAdminOrders,
  onOpenAdminAnalytics,
  onOpenCart,
  onOpenOrders,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'vendor':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070e1c]/90 backdrop-blur-md border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <a href="#" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/30 group-hover:bg-blue-500 transition">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-300 transition">
                  Market<span className="text-blue-400">Hub</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-300/70">
                  Multi-Vendor
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
            <a href="#home" className="text-slate-200 hover:text-white font-semibold transition">Home</a>
            <a href="#products" className="text-slate-200 hover:text-white font-semibold transition">Products</a>
            <button
              type="button"
              onClick={onOpenSystemStatus}
              className="text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <span>Architecture</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-900/80 text-blue-300 border border-blue-700/60">Full-Stack</span>
            </button>
          </nav>

          {/* Actions & Role-Based Control Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Full-Stack Live System Inspector Trigger */}
            <button
              type="button"
              onClick={onOpenSystemStatus}
              title="Click to view live full-stack system architecture & service health"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/50 text-emerald-300 transition active:scale-95 shadow-sm mr-1"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Full-Stack Live</span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-900/70 px-1.5 py-0.2 rounded border border-emerald-700/60">
                API • DB • Redis • ES
              </span>
            </button>

            {/* Authenticated User View vs Unauthenticated Buttons */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                {/* Customer Role Actions: Shopping Cart & My Orders */}
                {user.role === 'customer' && (
                  <>
                    <button
                      type="button"
                      id="nav-orders-btn"
                      onClick={onOpenOrders}
                      className="px-3.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/70 text-slate-200 text-xs font-semibold rounded-lg border border-blue-800/60 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>My Orders</span>
                    </button>

                    <button
                      type="button"
                      id="nav-cart-btn"
                      onClick={onOpenCart}
                      className="relative px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>Cart</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-blue-950 min-w-[18px] text-center">
                        {itemCount}
                      </span>
                    </button>
                  </>
                )}

                {/* Vendor Role Action: Vendor Dashboard */}
                {user.role === 'vendor' && (
                  <button
                    type="button"
                    id="nav-vendor-dashboard-btn"
                    onClick={onOpenVendorDashboard}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-emerald-500/30 transition flex items-center gap-1.5"
                  >
                    <span>🏪 Vendor Dashboard</span>
                  </button>
                )}

                {/* Admin Role Actions: Categories & Platform Orders */}
                {user.role === 'admin' && (
                  <>
                    <button
                      type="button"
                      id="nav-admin-analytics-btn"
                      onClick={onOpenAdminAnalytics}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition flex items-center gap-1.5"
                    >
                      <span>📈 Analytics</span>
                    </button>

                    <button
                      type="button"
                      id="nav-admin-orders-btn"
                      onClick={onOpenAdminOrders}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <span>📊 Platform Orders</span>
                    </button>

                    <button
                      type="button"
                      id="nav-admin-categories-btn"
                      onClick={onOpenAdminCategories}
                      className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition flex items-center gap-1.5"
                    >
                      <span>🛡️ Manage Categories</span>
                    </button>
                  </>
                )}

                {/* User Profile Pill */}
                <div className="flex items-center space-x-2 pl-2 pr-3 py-1 bg-blue-950/70 border border-blue-800/70 rounded-lg text-white">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white leading-tight max-w-[120px] truncate">{user.name}</span>
                    <span className={`text-[10px] font-semibold uppercase px-1 rounded border inline-block w-fit ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="nav-logout-btn"
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 border border-blue-900/60 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="nav-login-button"
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="nav-register-button"
                  className="px-4 py-1.5 text-xs font-bold text-blue-950 bg-white hover:bg-blue-50 rounded-lg shadow-sm transition"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('register')}
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              type="button"
              className="p-2 text-slate-300 hover:text-white hover:bg-blue-950/60 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-900/40 bg-[#070e1c] px-4 pt-3 pb-5 space-y-3 text-slate-200">
          <a href="#home" className="block text-base font-medium text-slate-200 hover:text-white">Home</a>
          <a href="#products" className="block text-base font-medium text-slate-200 hover:text-white">Products</a>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onOpenSystemStatus) onOpenSystemStatus();
            }}
            className="w-full text-left py-1 text-base font-semibold text-emerald-400 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>⚡ Full-Stack Architecture Inspector</span>
          </button>

          {/* Mobile Role Controls */}
          {isAuthenticated && user && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {user.role === 'customer' && (
                <>
                  <button
                    type="button"
                    id="mobile-nav-orders-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenOrders) onOpenOrders();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>📦 My Orders</span>
                  </button>

                  <button
                    type="button"
                    id="mobile-nav-cart-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenCart) onOpenCart();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>🛒 Shopping Cart ({itemCount})</span>
                  </button>
                </>
              )}

              {user.role === 'vendor' && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenVendorDashboard) onOpenVendorDashboard();
                  }}
                  className="w-full text-center py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  🏪 Vendor Dashboard
                </button>
              )}

              {user.role === 'admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAdminAnalytics) onOpenAdminAnalytics();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                  >
                    📈 Analytics Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAdminOrders) onOpenAdminOrders();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs"
                  >
                    📊 Platform Orders
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAdminCategories) onOpenAdminCategories();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                  >
                    🛡️ Manage Categories
                  </button>
                </>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-sm font-bold text-slate-800">{user.name}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getRoleBadgeClass(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-full text-center py-2 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="w-full text-center py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal('login');
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="w-full text-center py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal('register');
                  }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
