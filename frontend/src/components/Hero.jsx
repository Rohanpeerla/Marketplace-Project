export default function Hero({ onOpenAuthModal }) {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 py-16 sm:py-24 border-b border-slate-200">
      
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40 blur-3xl -z-10 bg-gradient-to-tr from-blue-400 via-sky-300 to-cyan-200 rounded-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            Multi-Vendor E-Commerce Platform
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            The Modern Marketplace for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              Shoppers & Vendors
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
            MarketHub bridges trusted independent merchants and smart shoppers in a unified, high-performance ecosystem powered by PostgreSQL and Node.js.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#auth-verification-section"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5 text-center"
            >
              Test RBAC Access
            </a>
            <button
              type="button"
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('register');
              }}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition text-center"
            >
              Become a Vendor
            </button>
          </div>

          {/* Role Pillows Preview */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-2">
                🛍️
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Customer Portal</h3>
              <p className="text-xs text-slate-500 mt-1">Discover curated products from multiple trusted vendors with universal cart.</p>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-2">
                🏪
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Vendor Dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">Manage shop storefront, track orders, monitor earnings, and upload stock.</p>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-2">
                🛡️
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Admin Control</h3>
              <p className="text-xs text-slate-500 mt-1">Verify vendor applications, handle disputes, and maintain platform health.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
