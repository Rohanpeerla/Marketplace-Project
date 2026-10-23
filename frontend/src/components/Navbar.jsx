import { useState } from 'react';

export default function Navbar({ apiStatus }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
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

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition">
              Home
            </a>
            <a href="#products" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Products
            </a>
            <a href="#vendors" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Vendors
            </a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              About
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Backend API Status Indicator */}
            <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full mr-2 ${apiStatus?.success ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{apiStatus?.success ? 'API Online' : 'Connecting API...'}</span>
            </div>

            {/* Cart Placeholder */}
            <button
              type="button"
              id="cart-button"
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Shopping Cart (Placeholder)"
              onClick={() => alert('Cart feature will be available in the upcoming phase!')}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </button>

            {/* Auth Buttons */}
            <button
              type="button"
              id="login-button"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
              onClick={() => alert('Authentication will be integrated in the next stage.')}
            >
              Login
            </button>
            <button
              type="button"
              id="register-button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
              onClick={() => alert('Registration will be integrated in the next stage.')}
            >
              Register
            </button>
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
          <a href="#products" className="block text-base font-medium text-slate-700">Products</a>
          <a href="#vendors" className="block text-base font-medium text-slate-700">Vendors</a>
          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            <button
              type="button"
              className="w-full text-center py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
              onClick={() => alert('Authentication will be integrated in the next stage.')}
            >
              Login
            </button>
            <button
              type="button"
              className="w-full text-center py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg"
              onClick={() => alert('Registration will be integrated in the next stage.')}
            >
              Register
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
