import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductSection from './components/ProductSection';
import BackendStatusCard from './components/BackendStatusCard';
import Footer from './components/Footer';

export default function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkBackendHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      let response;
      try {
        response = await fetch(`${baseUrl}/api/health`);
      } catch {
        response = await fetch('http://localhost:5000/api/health');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to reach backend API`);
      }

      const data = await response.json();
      setApiStatus(data);
    } catch (err) {
      console.warn('Backend health check error:', err.message);
      setError(err.message || 'Could not connect to backend server');
      setApiStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <Navbar apiStatus={apiStatus} />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Live Backend Connection Verification Banner */}
        <BackendStatusCard
          apiStatus={apiStatus}
          loading={loading}
          error={error}
          onRefresh={checkBackendHealth}
        />

        {/* Product Marketplace Placeholder Section */}
        <ProductSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
