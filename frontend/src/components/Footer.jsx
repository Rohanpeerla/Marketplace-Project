export default function Footer() {
  return (
    <footer id="about" className="bg-[#050b14] border-t border-blue-900/40 mt-auto text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-500/20">
                M
              </div>
              <span className="text-lg font-bold text-white">
                Market<span className="text-blue-400">Hub</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              An enterprise-grade multi-vendor e-commerce platform designed for high concurrency, vendor autonomy, and streamlined customer purchasing.
            </p>
            <div className="text-xs text-blue-300/70">
              Stack: React • Vite • Tailwind CSS • Node.js • Express • PostgreSQL • Redis • Elasticsearch
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Platform Roles
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><span className="hover:text-blue-300 cursor-pointer transition">Customer Experience</span></li>
              <li><span className="hover:text-blue-300 cursor-pointer transition">Vendor Portal</span></li>
              <li><span className="hover:text-blue-300 cursor-pointer transition">Admin Governance</span></li>
            </ul>
          </div>

          {/* Project Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Architecture
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><span className="hover:text-blue-300 cursor-pointer transition">RESTful API Design</span></li>
              <li><span className="hover:text-blue-300 cursor-pointer transition">PostgreSQL Persistence</span></li>
              <li><span className="hover:text-blue-300 cursor-pointer transition">Elasticsearch Cluster & Redis</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-blue-900/30 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MarketHub Marketplace. Full-Stack Multi-Vendor Architecture.</p>
          <p className="mt-2 sm:mt-0">Enterprise E-Commerce Platform</p>
        </div>
      </div>
    </footer>
  );
}
