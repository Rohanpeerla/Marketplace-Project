export default function Hero({ onOpenAuthModal }) {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-[#070e1c] via-[#0b162b] to-[#0f203d] py-16 sm:py-24 border-b border-blue-900/40">
      
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-30 blur-3xl -z-10 bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 rounded-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80 mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            Multi-Vendor E-Commerce Platform
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            The Modern Marketplace for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-cyan-300">
              Shoppers & Vendors
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-blue-100/90 leading-relaxed">
            MarketHub bridges trusted independent merchants and smart shoppers in a unified, high-performance ecosystem powered by PostgreSQL and Node.js.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#products"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-blue-950 bg-white hover:bg-blue-50 rounded-xl shadow-xl shadow-blue-500/20 transition transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
            >
              <span>Explore Products</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
            <button
              type="button"
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('register');
              }}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-900/50 hover:bg-blue-800/70 border border-blue-700/60 rounded-xl shadow-sm transition text-center backdrop-blur"
            >
              Become a Vendor
            </button>
          </div>

          {/* Role Pillows Preview (Crisp White Cards on Blue Canvas) */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-white p-5 rounded-2xl border border-white/40 shadow-xl hover:shadow-2xl transition duration-200">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-2.5">
                🛍️
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Portal</h3>
              <p className="text-xs text-slate-500 mt-1">Discover curated products from multiple trusted vendors with universal cart.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white/40 shadow-xl hover:shadow-2xl transition duration-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-2.5">
                🏪
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Vendor Dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">Manage shop storefront, track orders, monitor earnings, and upload stock.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white/40 shadow-xl hover:shadow-2xl transition duration-200">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg mb-2.5">
                🛡️
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Admin Control</h3>
              <p className="text-xs text-slate-500 mt-1">Verify vendor applications, handle disputes, and maintain platform health.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
