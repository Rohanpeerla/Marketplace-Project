const reviewModel = require('../models/reviewModel');
const productModel = require('../models/productModel');
const { AppError } = require('../utils/appError');

class ReviewService {
  /**
   * Submit a new review
   */
  async createReview(userId, { productId, rating, comment }) {
    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new AppError('Rating must be an integer between 1 and 5', 400);
    }

    // Verify product exists
    const product = await productModel.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if user has already reviewed this product
    const existingReview = await reviewModel.findByUserAndProduct(userId, productId);
    if (existingReview) {
      throw new AppError('You have already submitted a review for this product', 409);
    }

    // Verify purchase
    const purchase = await reviewModel.checkUserPurchasedProduct(userId, productId);
    if (!purchase) {
      throw new AppError('Only verified purchasers of this product can submit a review', 403);
    }

    const review = await reviewModel.create({
      userId,
      productId,
      orderId: purchase.order_id,
      rating: numRating,
      comment: comment ? comment.trim() : null
    });

    const aggregates = await reviewModel.getProductAggregates(productId);

    return { review, aggregates };
  }

  /**
   * Get reviews and aggregates for a product
   */
  async getProductReviews(productId, query = {}) {
    const product = await productModel.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;

    const [reviewsData, aggregates] = await Promise.all([
      reviewModel.findByProductId(productId, { page, limit }),
      reviewModel.getProductAggregates(productId)
    ]);

    return {
      productId,
      aggregates,
      ...reviewsData
    };
  }

  /**
   * Update review
   */
  async updateReview(userId, reviewId, { rating, comment }) {
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.user_id !== userId) {
      throw new AppError('You are not authorized to update this review', 403);
    }

    let numRating = undefined;
    if (rating !== undefined) {
      numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        throw new AppError('Rating must be an integer between 1 and 5', 400);
      }
    }

    const updated = await reviewModel.update(reviewId, {
      rating: numRating,
      comment: comment !== undefined ? (comment ? comment.trim() : null) : undefined
    });

    const aggregates = await reviewModel.getProductAggregates(review.product_id);

    return { review: updated, aggregates };
  }

  /**
   * Delete review (owner or admin)
   */
  async deleteReview(userId, userRole, reviewId) {
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    const isOwner = review.user_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('You are not authorized to delete this review', 403);
    }

    await reviewModel.delete(reviewId);
    const aggregates = await reviewModel.getProductAggregates(review.product_id);

    return {
      message: 'Review deleted successfully',
      aggregates
    };
  }
}

module.exports = new ReviewService();

