import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { reviewApi } from '../services/api';

export default function ProductDetailModal({ product, isOpen, onClose, onOpenCart, onOpenAuthModal }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Reviews state
  const [reviewsData, setReviewsData] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);

  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isOpen && product?.id) {
      loadReviews(product.id);
    } else {
      setReviewsData(null);
      setReviewFeedback(null);
      setReviewComment('');
      setReviewRating(5);
    }
  }, [isOpen, product?.id]);

  const loadReviews = async (pid) => {
    try {
      setLoadingReviews(true);
      const res = await reviewApi.getProductReviews(pid);
      setReviewsData(res.data);
    } catch (err) {
      console.warn('Could not load product reviews:', err.message);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onClose();
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    try {
      setSubmittingReview(true);
      setReviewFeedback(null);
      await reviewApi.createReview({
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewFeedback({ type: 'success', text: 'Thank you! Your verified purchase review has been posted.' });
      setReviewComment('');
      await loadReviews(product.id);
    } catch (err) {
      setReviewFeedback({ type: 'error', text: err.message || 'Could not submit review.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewApi.deleteReview(reviewId);
      await loadReviews(product.id);
    } catch (err) {
      alert(err.message || 'Could not delete review');
    }
  };

  if (!isOpen || !product) return null;

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.primary_image
    ? [{ id: 'primary', image_url: product.primary_image, is_primary: true }]
    : [];

  const activeImageUrl = selectedImage || (images[0]?.image_url) || null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const aggregates = reviewsData?.aggregates || {
    average_rating: product.average_rating || 0,
    total_reviews: product.review_count || 0,
    rating_5: 0,
    rating_4: 0,
    rating_3: 0,
    rating_2: 0,
    rating_1: 0,
  };

  const reviewsList = reviewsData?.reviews || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
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

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Top Section: Product Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            {/* Right Column: Product Info & Cart Actions */}
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

                {/* Title, Rating badge, & Price */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                    {product.name}
                  </h2>

                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-amber-500 font-bold flex items-center gap-0.5">
                      ★ {Number(aggregates.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-slate-400">
                      ({aggregates.total_reviews} {aggregates.total_reviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-3">
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
              </div>

              {/* Cart Actions */}
              <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                {justAdded ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <span>✓</span>
                      <span>Added {quantity} to cart!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenCart) onOpenCart();
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                      >
                        View Cart
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {!isOutOfStock && (
                      <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1 || isAdding}
                          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-xl text-sm font-bold disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-slate-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                          disabled={quantity >= product.stock || isAdding}
                          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-xl text-sm font-bold disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isOutOfStock || isAdding}
                      onClick={async () => {
                        if (!isAuthenticated) {
                          onClose();
                          if (onOpenAuthModal) onOpenAuthModal('login');
                          return;
                        }
                        if (user?.role !== 'customer') {
                          setErrorMsg('Only customer accounts can add items to cart.');
                          return;
                        }
                        setIsAdding(true);
                        setErrorMsg(null);
                        try {
                          await addToCart(product.id, quantity);
                          setJustAdded(true);
                          setTimeout(() => setJustAdded(false), 3000);
                        } catch (err) {
                          setErrorMsg(err.message);
                        } finally {
                          setIsAdding(false);
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                        isOutOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>
                        {isOutOfStock ? 'Out of Stock' : isAdding ? 'Adding to Cart...' : `Add to Cart &bull; $${(product.price * quantity).toFixed(2)}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Customer Reviews & Ratings */}
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>⭐ Customer Reviews & Ratings</span>
                <span className="text-xs font-normal text-slate-500">
                  ({aggregates.total_reviews} verified rating{aggregates.total_reviews !== 1 ? 's' : ''})
                </span>
              </h3>
            </div>

            {/* Ratings Overview Cards */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="text-center sm:border-r sm:border-slate-200 sm:pr-4">
                <div className="text-4xl font-black text-slate-900">
                  {Number(aggregates.average_rating || 0).toFixed(1)}
                </div>
                <div className="text-amber-400 text-base my-1">
                  {'★'.repeat(Math.round(aggregates.average_rating || 0))}
                  {'☆'.repeat(5 - Math.round(aggregates.average_rating || 0))}
                </div>
                <div className="text-[11px] text-slate-500">Out of 5 stars</div>
              </div>

              {/* Progress Bars */}
              <div className="sm:col-span-2 space-y-1 text-xs">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = aggregates[`rating_${star}`] || 0;
                  const pct = aggregates.total_reviews > 0 ? (count / aggregates.total_reviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-slate-600">
                      <span className="w-12 text-[11px] font-medium">{star} stars</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[11px] text-slate-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write a Review Box */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Write a Verified Purchase Review
              </h4>

              {reviewFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    reviewFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {reviewFeedback.text}
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Your Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-xl transition ${
                          star <= reviewRating ? 'text-amber-400 scale-110' : 'text-slate-300 hover:text-amber-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700 ml-1">({reviewRating}/5)</span>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share how this product met your expectations (verified purchase required)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    🛡️ Verified customer reviews only
                  </span>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {submittingReview ? 'Posting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Reviews List */}
            <div className="space-y-3">
              {loadingReviews ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading reviews...</div>
              ) : reviewsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No reviews submitted for this item yet. Be the first verified customer to share feedback!
                </div>
              ) : (
                reviewsList.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rev.user_name || 'Customer'}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Verified Buyer
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                        {(user?.id === rev.user_id || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-bold ml-1"
                            title="Delete Review"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    {rev.comment && <p className="text-slate-700 leading-relaxed">{rev.comment}</p>}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
