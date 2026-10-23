import { useState } from 'react';

const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: 'Wireless Noise-Cancelling Headphones',
    category: 'Electronics',
    vendor: 'Aura Sound Lab',
    price: 149.99,
    rating: 4.8,
    reviews: 124,
    badge: 'Best Seller',
    imageBg: 'from-blue-500 to-indigo-600',
    icon: '🎧',
  },
  {
    id: 2,
    name: 'Handcrafted Minimalist Leather Wallet',
    category: 'Accessories',
    vendor: 'Heritage Leather Co.',
    price: 49.00,
    rating: 4.9,
    reviews: 86,
    badge: 'Artisan',
    imageBg: 'from-amber-600 to-orange-700',
    icon: '👛',
  },
  {
    id: 3,
    name: 'Ergonomic Mechanical Keyboard (Hot-Swap)',
    category: 'Electronics',
    vendor: 'KeyCrafters Studio',
    price: 119.50,
    rating: 4.7,
    reviews: 210,
    badge: 'Popular',
    imageBg: 'from-emerald-500 to-teal-700',
    icon: '⌨️',
  },
  {
    id: 4,
    name: 'Organic Ceramic Pour-Over Coffee Set',
    category: 'Home & Living',
    vendor: 'Clay & Bean Co.',
    price: 38.00,
    rating: 4.9,
    reviews: 54,
    badge: 'New Arrival',
    imageBg: 'from-rose-500 to-pink-600',
    icon: '☕',
  },
  {
    id: 5,
    name: 'Waterproof All-Weather Commuter Backpack',
    category: 'Fashion',
    vendor: 'Nomad Gear Goods',
    price: 89.00,
    rating: 4.6,
    reviews: 97,
    badge: 'Top Vendor',
    imageBg: 'from-slate-700 to-slate-900',
    icon: '🎒',
  },
  {
    id: 6,
    name: 'Smart Ambient Desk Lamp with App Control',
    category: 'Electronics',
    vendor: 'LumenTech Innovations',
    price: 59.99,
    rating: 4.8,
    reviews: 142,
    badge: 'Featured',
    imageBg: 'from-violet-600 to-purple-800',
    icon: '💡',
  },
];

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Accessories', 'Home & Living'];

export default function ProductSection() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts = selectedCategory === 'All'
    ? SAMPLE_PRODUCTS
    : SAMPLE_PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <section id="products" className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Marketplace Catalog
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Vendor Products
            </h2>
            <p className="mt-2 text-slate-600 text-sm max-w-xl">
              Explore authentic products delivered directly by verified independent vendors across our network.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-6 md:mt-0 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Product Visual Container */}
              <div className={`h-48 bg-gradient-to-br ${product.imageBg} relative flex items-center justify-center p-6 text-white`}>
                <span className="text-6xl drop-shadow-md transform group-hover:scale-110 transition duration-300">
                  {product.icon}
                </span>

                {/* Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {product.badge}
                </div>

                {/* Category Tag */}
                <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded">
                  {product.category}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Vendor Attribution */}
                  <div className="flex items-center text-xs text-indigo-600 font-medium mb-1">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{product.vendor}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition line-clamp-1">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  <div className="mt-2 flex items-center space-x-1.5 text-xs text-slate-500">
                    <span className="text-amber-400 font-bold">★</span>
                    <span className="font-semibold text-slate-700">{product.rating}</span>
                    <span>({product.reviews} reviews)</span>
                  </div>
                </div>

                {/* Price & Add to Cart */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Price</span>
                    <span className="text-xl font-bold text-slate-900">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Added "${product.name}" from ${product.vendor} to cart!`)}
                    className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Cart
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Catalog Note */}
        <div className="mt-12 text-center p-6 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">
            Showing placeholder marketplace products for Stage 1. Full dynamic product catalog with PostgreSQL pagination will be integrated in subsequent milestones.
          </p>
        </div>

      </div>
    </section>
  );
}
