import { useState, useEffect, useCallback } from 'react';
import { searchApi, productApi, categoryApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function ProductSection({ onViewProduct, onOpenAuthModal }) {
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [addingId, setAddingId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [cartNotification, setCartNotification] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortOption, setSortOption] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchSource, setSearchSource] = useState('elasticsearch'); // 'elasticsearch' | 'database'

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryApi.getAll();
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.warn('Failed to load categories:', err.message);
      }
    };
    loadCategories();
  }, []);

  // Fetch products with active filters and sorting
  const fetchProducts = useCallback(async (pageToLoad = currentPage) => {
    setLoading(true);
    setError(null);

    const params = {
      page: pageToLoad,
      limit: 12,
      sort: sortOption,
    };

    if (selectedCategory !== 'all') {
      params.category_id = selectedCategory;
    }

    if (searchTerm.trim()) {
      params.q = searchTerm.trim();
    }

    if (priceFilter === 'under50') {
      params.max_price = 50;
    } else if (priceFilter === '50to100') {
      params.min_price = 50;
      params.max_price = 100;
    } else if (priceFilter === 'over100') {
      params.min_price = 100;
    }

    try {
      // Primary: query Elasticsearch via search API
      const res = await searchApi.searchProducts(params);
      if (res.success && Array.isArray(res.products)) {
        setProducts(res.products);
        if (res.pagination) {
          setPagination(res.pagination);
          setCurrentPage(res.pagination.page);
        }
        setSearchSource('elasticsearch');
        return;
      }
      throw new Error(res.message || 'Elasticsearch returned an unexpected response');
    } catch (searchErr) {
      console.warn('[Search] Elasticsearch query failed, falling back to PostgreSQL:', searchErr.message);
      // Fallback: query PostgreSQL directly
      try {
        const dbParams = {
          page: pageToLoad,
          limit: 12,
          status: 'active',
        };
        if (selectedCategory !== 'all') dbParams.categoryId = selectedCategory;
        if (searchTerm.trim()) dbParams.search = searchTerm.trim();
        if (params.min_price) dbParams.minPrice = params.min_price;
        if (params.max_price) dbParams.maxPrice = params.max_price;

        const dbRes = await productApi.getAll(dbParams);
        if (dbRes.success && Array.isArray(dbRes.products)) {
          setProducts(dbRes.products);
          if (dbRes.pagination) {
            setPagination(dbRes.pagination);
            setCurrentPage(dbRes.pagination.page);
          }
          setSearchSource('database');
        } else {
          setError('Failed to retrieve products from marketplace.');
        }
      } catch (dbErr) {
        setError(dbErr.message || 'Failed to retrieve products from marketplace.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, searchTerm, priceFilter, sortOption]);

  // When filters or sort change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1);
  }, [selectedCategory, searchTerm, priceFilter, sortOption]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchProducts(newPage);
      window.scrollTo({ top: document.getElementById('products')?.offsetTop - 80, behavior: 'smooth' });
    }
  };

  const handleAddToCart = async (product, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    if (user?.role !== 'customer') {
      setCartNotification({ type: 'error', message: 'Cart is available for customer accounts.' });
      setTimeout(() => setCartNotification(null), 3000);
      return;
    }
    setAddingId(product.id);
    setCartNotification(null);
    try {
      await addToCart(product.id, 1);
      setAddedId(product.id);
      setCartNotification({ type: 'success', message: `Added "${product.name}" to cart!` });
      setTimeout(() => setAddedId(null), 2000);
      setTimeout(() => setCartNotification(null), 3500);
    } catch (err) {
      setCartNotification({ type: 'error', message: err.message });
      setTimeout(() => setCartNotification(null), 4000);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section id="products" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1.5">
              <span>Marketplace Catalog</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-400 font-mono">
                {searchSource === 'elasticsearch' ? 'Elasticsearch 7.17 Cluster' : 'PostgreSQL 16 Direct'}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Vendor Products
            </h2>
            <p className="mt-2 text-slate-600 text-sm max-w-xl">
              Discover authentic goods delivered directly by approved independent merchants across our multi-vendor network.
            </p>
          </div>

          {/* Search, Sort & Price Filter Controls */}
          <div className="mt-6 md:mt-0 flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-44 sm:w-52"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Price Filter Dropdown */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Prices</option>
              <option value="under50">Under $50</option>
              <option value="50to100">$50 to $100</option>
              <option value="over100">Over $100</option>
            </select>

            {/* Sort Options Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchProducts(currentPage)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-slate-200 transition"
              title="Refresh search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Live Cart Notification Toast */}
        {cartNotification && (
          <div
            className={`mb-6 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition animate-in fade-in slide-in-from-top-2 ${
              cartNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{cartNotification.type === 'success' ? '🛒' : '⚠️'}</span>
              <span>{cartNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setCartNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {category.name}
              {category.product_count !== undefined && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === category.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {category.product_count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 h-80 p-5 flex flex-col justify-between">
                <div className="h-44 bg-slate-200 rounded-xl"></div>
                <div className="space-y-2 mt-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl">
            <p className="text-sm text-rose-700 font-semibold mb-2">{error}</p>
            <button
              type="button"
              onClick={() => fetchProducts(currentPage)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-slate-800">No products match your criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your category filter, keyword search, or price range.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchTerm('');
                setPriceFilter('all');
                setSortOption('relevance');
              }}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold rounded-lg transition"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= 5;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Visual Header */}
                  <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800';
                        }}
                      />
                    ) : (
                      <div className="text-5xl text-slate-300">📦</div>
                    )}

                    {/* Category Tag */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                      {product.category_name || 'Marketplace'}
                    </div>

                    {/* Stock Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-500 text-white rounded shadow-xs">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500 text-white rounded shadow-xs">
                          Only {product.stock} left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-600 text-white rounded shadow-xs">
                          In Stock ({product.stock})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Information */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Vendor attribution */}
                      <div className="flex items-center text-xs text-blue-600 font-semibold mb-1">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{product.vendor_name || 'Independent Merchant'}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition line-clamp-1">
                        {product.name}
                      </h3>

                      {/* Description preview */}
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {product.description || 'Verified authentic vendor merchandise.'}
                      </p>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Price</span>
                        <span className="text-xl font-extrabold text-slate-900">
                          ${Number(product.price).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProduct && onViewProduct(product)}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          disabled={isOutOfStock || addingId === product.id}
                          onClick={(e) => handleAddToCart(product, e)}
                          title={isOutOfStock ? 'Item is out of stock' : 'Add 1 item to cart'}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                            isOutOfStock
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : addedId === product.id
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200'
                          }`}
                        >
                          {addingId === product.id ? (
                            <span>Adding...</span>
                          ) : addedId === product.id ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <div className="text-xs text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.total} total products)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
