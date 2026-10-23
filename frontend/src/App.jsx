import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductSection from './components/ProductSection';
import BackendStatusCard from './components/BackendStatusCard';
import Footer from './components/Footer';

export default function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [dbStatus, setDbStatus] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <Navbar apiStatus={apiStatus} />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

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
    </div>
  );
}
