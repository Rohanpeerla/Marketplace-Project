import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AuthTestCard from './components/AuthTestCard';
import BackendStatusCard from './components/BackendStatusCard';
import ProductSection from './components/ProductSection';
import ProductDetailModal from './components/ProductDetailModal';
import VendorDashboardModal from './components/VendorDashboardModal';
import AdminCategoryModal from './components/AdminCategoryModal';
import AdminOrdersModal from './components/AdminOrdersModal';
import AdminAnalyticsModal from './components/AdminAnalyticsModal';
import CartModal from './components/CartModal';
import CheckoutModal from './components/CheckoutModal';
import OrderHistoryModal from './components/OrderHistoryModal';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

export default function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [dbStatus, setDbStatus] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const [redisStatus, setRedisStatus] = useState(null);
  const [redisLoading, setRedisLoading] = useState(true);
  const [redisError, setRedisError] = useState(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  // Stage 6 Cart Modal State
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Stage 7 Checkout & Orders Modal States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAdminOrdersOpen, setIsAdminOrdersOpen] = useState(false);
  const [isAdminAnalyticsOpen, setIsAdminAnalyticsOpen] = useState(false);

  // Stage 4 Modal States
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isVendorDashboardOpen, setIsVendorDashboardOpen] = useState(false);
  const [isAdminCategoryOpen, setIsAdminCategoryOpen] = useState(false);

  // Key to force refresh ProductSection when categories or products change
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsProductDetailOpen(true);
  };

  const handleCategoriesUpdated = () => {
    setCatalogRefreshKey((prev) => prev + 1);
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
    } catch {
      setDbError('Database check could not be completed');
      setDbStatus(null);
    } finally {
      setDbLoading(false);
    }

    // Check Redis Health (GET /api/health/redis)
    setRedisLoading(true);
    setRedisError(null);
    try {
      let resRedis;
      try {
        resRedis = await fetch(`${baseUrl}/api/health/redis`);
      } catch {
        resRedis = await fetch('http://localhost:5000/api/health/redis');
      }
      const dataRedis = await resRedis.json();
      setRedisStatus(dataRedis);
    } catch {
      setRedisError('Redis check could not be completed');
      setRedisStatus(null);
    } finally {
      setRedisLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthChecks();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
          {/* Top Navigation */}
          <Navbar
            apiStatus={apiStatus}
            onOpenAuthModal={openAuthModal}
            onOpenVendorDashboard={() => setIsVendorDashboardOpen(true)}
            onOpenAdminCategories={() => setIsAdminCategoryOpen(true)}
            onOpenAdminOrders={() => setIsAdminOrdersOpen(true)}
            onOpenAdminAnalytics={() => setIsAdminAnalyticsOpen(true)}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenOrders={() => setIsOrdersOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1">
            {/* Hero Section */}
            <Hero onOpenAuthModal={openAuthModal} />

            {/* Interactive Stage 3 RBAC Verification Section */}
            <AuthTestCard onOpenAuthModal={openAuthModal} />

            {/* Live Infrastructure Status Card (API + DB + Redis) */}
            <BackendStatusCard
              apiStatus={apiStatus}
              apiLoading={apiLoading}
              apiError={apiError}
              dbStatus={dbStatus}
              dbLoading={dbLoading}
              dbError={dbError}
              redisStatus={redisStatus}
              redisLoading={redisLoading}
              redisError={redisError}
              onRefresh={fetchHealthChecks}
            />

            {/* Product Marketplace Catalog Section */}
            <ProductSection
              key={catalogRefreshKey}
              onViewProduct={handleViewProduct}
              onOpenAuthModal={openAuthModal}
            />
          </main>

          {/* Footer */}
          <Footer />

          {/* Authentication Modal (Sign In / Sign Up) */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialTab={authModalTab}
          />

          {/* Shopping Cart Modal (Customer Stage 6) */}
          <CartModal
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onCheckout={() => setIsCheckoutOpen(true)}
          />

          {/* Checkout & Shipping Modal (Customer Stage 7) */}
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onOpenOrders={() => setIsOrdersOpen(true)}
          />

          {/* Customer Order History & Cancellation Modal (Customer Stage 7) */}
          <OrderHistoryModal
            isOpen={isOrdersOpen}
            onClose={() => setIsOrdersOpen(false)}
          />

          {/* Product Details Modal (Customer Browsing) */}
          <ProductDetailModal
            product={selectedProduct}
            isOpen={isProductDetailOpen}
            onClose={() => setIsProductDetailOpen(false)}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuthModal={openAuthModal}
          />

          {/* Vendor Dashboard Modal (Vendor Only: Products + Orders + Profile) */}
          <VendorDashboardModal
            isOpen={isVendorDashboardOpen}
            onClose={() => {
              setIsVendorDashboardOpen(false);
              setCatalogRefreshKey((prev) => prev + 1);
            }}
          />

          {/* Admin Category Management Modal (Admin Only) */}
          <AdminCategoryModal
            isOpen={isAdminCategoryOpen}
            onClose={() => setIsAdminCategoryOpen(false)}
            onCategoriesUpdated={handleCategoriesUpdated}
          />

          {/* Admin Orders Modal (Admin Only: Platform Overview) */}
          <AdminOrdersModal
            isOpen={isAdminOrdersOpen}
            onClose={() => setIsAdminOrdersOpen(false)}
          />

          {/* Admin Analytics Dashboard Modal (Admin Only: KPIs & Trends) */}
          <AdminAnalyticsModal
            isOpen={isAdminAnalyticsOpen}
            onClose={() => setIsAdminAnalyticsOpen(false)}
          />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
