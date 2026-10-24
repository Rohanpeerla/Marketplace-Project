import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AuthTestCard from './components/AuthTestCard';
import BackendStatusCard from './components/BackendStatusCard';
import ProductSection from './components/ProductSection';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

export default function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [dbStatus, setDbStatus] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const fetchHealthChecks = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    
    // Check API Health
    setApiLoading(true);
    setApiError(null);
    try {
      let res;
      try {
        res = await fetch(`${baseUrl}/api/health`);
      } catch {
        res = await fetch('http://localhost:5000/api/health');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: API unreachable`);
      const data = await res.json();
      setApiStatus(data);
    } catch (err) {
      setApiError(err.message || 'API connection failed');
      setApiStatus(null);
    } finally {
      setApiLoading(false);
    }

    // Check Database Health (GET /api/health/db)
    setDbLoading(true);
    setDbError(null);
    try {
      let resDb;
      try {
        resDb = await fetch(`${baseUrl}/api/health/db`);
      } catch {
        resDb = await fetch('http://localhost:5000/api/health/db');
      }
      const dataDb = await resDb.json();
      setDbStatus(dataDb);
    } catch (err) {
      setDbError('Database check could not be completed');
      setDbStatus(null);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthChecks();
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        {/* Top Navigation */}
        <Navbar apiStatus={apiStatus} onOpenAuthModal={openAuthModal} />

        {/* Main Content Area */}
        <main className="flex-1">
          {/* Hero Section */}
          <Hero onOpenAuthModal={openAuthModal} />

          {/* Interactive Stage 3 RBAC Verification Section */}
          <AuthTestCard onOpenAuthModal={openAuthModal} />

          {/* Live Infrastructure Status Card (API + DB) */}
          <BackendStatusCard
            apiStatus={apiStatus}
            apiLoading={apiLoading}
            apiError={apiError}
            dbStatus={dbStatus}
            dbLoading={dbLoading}
            dbError={dbError}
            onRefresh={fetchHealthChecks}
          />

          {/* Product Marketplace Placeholder Section */}
          <ProductSection />
        </main>

        {/* Footer */}
        <Footer />

        {/* Authentication Modal (Sign In / Sign Up) */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialTab={authModalTab}
        />
      </div>
    </AuthProvider>
  );
}
