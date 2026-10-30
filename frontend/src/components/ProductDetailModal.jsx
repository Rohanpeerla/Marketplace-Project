import { useState } from 'react';

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!isOpen || !product) return null;

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.primary_image
    ? [{ id: 'primary', image_url: product.primary_image, is_primary: true }]
    : [];

  const activeImageUrl = selectedImage || (images[0]?.image_url) || null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              {product.category_name || 'General Product'}
            </span>
            <span className="text-xs text-slate-400">ID: {product.id.substring(0, 8)}...</span>
          </div>
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xl font-bold"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col gap-3">
            <div className="aspect-square rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
              {activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800';
                  }}
                />
              ) : (
                <div className="text-6xl text-slate-300">📦</div>
              )}

              {/* Stock badge overlay */}
              <div className="absolute top-3 right-3">
                {isOutOfStock ? (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-rose-500 text-white rounded-full shadow-sm">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-white rounded-full shadow-sm">
                    Only {product.stock} left!
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white rounded-full shadow-sm">
                    {product.stock} In Stock
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 transition ${
                      activeImageUrl === img.image_url
                        ? 'border-indigo-600 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Vendor Details */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              {/* Vendor Attribution */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  🏪
                </div>
                <div className="flex-1 truncate">
                  <span className="font-semibold text-slate-900 block truncate">
                    {product.vendor_name || 'Verified Marketplace Vendor'}
                  </span>
                  <span className="text-slate-500 text-[11px] block truncate">
                    {product.vendor_email || 'Contact via MarketHub'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Verified
                </span>
              </div>

              {/* Title & Price */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                  {product.name}
                </h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">Free standard delivery</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
                  {product.description || 'No description provided for this item.'}
                </p>
              </div>

              {/* Category Info */}
              {product.category_description && (
                <div className="text-xs text-slate-500 italic">
                  Category: {product.category_name} &bull; {product.category_description}
                </div>
              )}
            </div>

            {/* Stage 4 Notice & Add to Cart Placeholder */}
            <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="text-base shrink-0">ℹ️</span>
                <div>
                  <strong className="font-semibold block">Stage 4 Product Browsing Active</strong>
                  Cart, universal checkout, and payment processing will be implemented in subsequent project milestones.
                </div>
              </div>

              <button
                type="button"
                disabled
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-200 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Add to Cart (Coming in Stage 5)
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
