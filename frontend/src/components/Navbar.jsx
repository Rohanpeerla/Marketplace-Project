import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ apiStatus, onOpenAuthModal }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <a href="#" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200 group-hover:bg-indigo-700 transition">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                  Market<span className="text-indigo-600">Hub</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                  Multi-Vendor
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#home" className="text-indigo-600 hover:text-indigo-700 transition">Home</a>
            <a href="#auth-verification-section" className="hover:text-indigo-600 transition flex items-center gap-1.5">
              <span>RBAC Testing</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Stage 3</span>
            </a>
            <a href="#products" className="hover:text-indigo-600 transition">Products</a>
            <a href="#vendors" className="hover:text-indigo-600 transition">Vendors</a>
          </nav>

          {/* Actions & Auth */}
          <div className="hidden md:flex items-center space-x-3">
            {/* API Health Indicator Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 mr-2">
              <span className={`w-2 h-2 rounded-full ${apiStatus?.success ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{apiStatus?.success ? 'Backend Online' : 'Connecting...'}</span>
            </div>

            {/* Authenticated User View vs Unauthenticated Buttons */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 pl-2 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">{user.name}</span>
                    <span className={`text-[10px] font-semibold uppercase px-1 rounded border inline-block w-fit ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="nav-logout-btn"
                  onClick={logout}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="nav-login-button"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="nav-register-button"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
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
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
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
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          <a href="#home" className="block text-base font-medium text-indigo-600">Home</a>
          <a href="#auth-verification-section" className="block text-base font-medium text-slate-700">RBAC Testing (Stage 3)</a>
          <a href="#products" className="block text-base font-medium text-slate-700">Products</a>
          <a href="#vendors" className="block text-base font-medium text-slate-700">Vendors</a>
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
                  className="w-full text-center py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg"
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
