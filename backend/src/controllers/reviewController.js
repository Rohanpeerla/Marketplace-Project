const reviewService = require('../services/reviewService');

class ReviewController {
  async createReview(req, res, next) {
    try {
      const { productId, rating, comment } = req.body;
      const result = await reviewService.createReview(req.user.id, { productId, rating, comment });
      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductReviews(req, res, next) {
    try {
      const { productId } = req.params;
      const result = await reviewService.getProductReviews(productId, req.query);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async updateReview(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const result = await reviewService.updateReview(req.user.id, id, { rating, comment });
      return res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      const result = await reviewService.deleteReview(req.user.id, req.user.role, id);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReviewController();
