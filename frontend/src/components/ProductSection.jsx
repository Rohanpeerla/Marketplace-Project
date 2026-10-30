import { useState, useEffect, useCallback } from 'react';
import { productApi, categoryApi } from '../services/api';

export default function ProductSection({ onViewProduct }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Fetch products with active filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 12,
        status: 'active',
      };

      if (selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (priceFilter === 'under50') {
        params.maxPrice = 50;
      } else if (priceFilter === '50to100') {
        params.minPrice = 50;
        params.maxPrice = 100;
      } else if (priceFilter === 'over100') {
        params.minPrice = 100;
      }

      const res = await productApi.getAll(params);
      if (res.success && Array.isArray(res.products)) {
        setProducts(res.products);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve products from marketplace.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, priceFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <section id="products" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1 flex items-center gap-1.5">
              <span>Marketplace Catalog</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-400 font-mono">Live PostgreSQL 16</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Vendor Products
            </h2>
            <p className="mt-2 text-slate-600 text-sm max-w-xl">
              Discover authentic goods delivered directly by approved independent merchants across our multi-vendor network.
            </p>
          </div>

          {/* Search & Price Filter Controls */}
          <div className="mt-6 md:mt-0 flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48 sm:w-56"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Price Filter Dropdown */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Prices</option>
              <option value="under50">Under $50</option>
              <option value="50to100">$50 to $100</option>
              <option value="over100">Over $100</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchProducts}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 transition"
              title="Refresh products"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
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
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {category.name}
              {category.product_count !== undefined && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === category.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-500'
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
              onClick={fetchProducts}
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
              }}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition"
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
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
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
                      <div className="flex items-center text-xs text-indigo-600 font-semibold mb-1">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{product.vendor_name || 'Independent Merchant'}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition line-clamp-1">
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
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Cart & universal checkout available in Stage 5"
                          className="px-3.5 py-2 bg-slate-900/80 text-white text-xs font-semibold rounded-lg opacity-60 cursor-not-allowed flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Add
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
