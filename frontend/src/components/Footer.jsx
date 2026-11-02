export default function Footer() {
  return (
    <footer id="about" className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base">
                M
              </div>
              <span className="text-lg font-bold text-slate-900">
                Market<span className="text-blue-600">Hub</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              An enterprise-grade multi-vendor e-commerce platform designed for high concurrency, vendor autonomy, and streamlined customer purchasing.
            </p>
            <div className="text-xs text-slate-400">
              Stack: React • Vite • Tailwind CSS • Node.js • Express • PostgreSQL
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Platform Roles
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><span className="hover:text-blue-600 cursor-pointer">Customer Experience</span></li>
              <li><span className="hover:text-blue-600 cursor-pointer">Vendor Portal</span></li>
              <li><span className="hover:text-blue-600 cursor-pointer">Admin Governance</span></li>
            </ul>
          </div>

          {/* Project Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Architecture
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><span className="hover:text-blue-600 cursor-pointer">RESTful API Design</span></li>
              <li><span className="hover:text-blue-600 cursor-pointer">PostgreSQL Persistence</span></li>
              <li><span className="hover:text-blue-600 cursor-pointer">Modular Monorepo Structure</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} MarketHub Marketplace. Stage 1 Foundation.</p>
          <p className="mt-2 sm:mt-0">Built for Internship Full-Stack Project</p>
        </div>
      </div>
    </footer>
  );
}
