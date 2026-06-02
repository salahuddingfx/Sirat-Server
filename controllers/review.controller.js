const reviewService = require("../service/review.service");
const cache = require("../config/cache.config");

const createReview = async (req, res) => {
  try {
    const reviewData = { ...req.body };
    if (req.user) {
      reviewData.user = req.user.id;
    }
    const review = await reviewService.createReview(reviewData);
    cache.invalidateNamespace("reviews");
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const reviews = await cache.getOrSet(
      cache.buildKey("reviews", `product:${req.params.productId}`),
      () => reviewService.getProductReviews(req.params.productId),
      60
    );
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllApprovedReviews = async (req, res) => {
  try {
    const reviews = await cache.getOrSet(
      cache.buildKey("reviews", "approved"),
      () => reviewService.getAllApprovedReviews(),
      60
    );
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetAllReviews = async (req, res) => {
  try {
    const reviews = await cache.getOrSet(
      cache.buildKey("reviews", "all"),
      () => reviewService.getAllReviews(),
      30
    );
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminUpdateReviewApproval = async (req, res) => {
  try {
    const review = await reviewService.updateReviewApproval(req.params.id, req.body.isApproved);
    cache.invalidateNamespace("reviews");
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteReview = async (req, res) => {
  try {
    await reviewService.deleteReview(req.params.id);
    cache.invalidateNamespace("reviews");
    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getAllApprovedReviews,
  adminGetAllReviews,
  adminUpdateReviewApproval,
  adminDeleteReview,
};

const getProductReviews = async (req, res) => {
  try {
    const reviews = await reviewService.getProductReviews(req.params.productId);
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllApprovedReviews = async (req, res) => {
  try {
    const reviews = await reviewService.getAllApprovedReviews();
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetAllReviews = async (req, res) => {
  try {
    const reviews = await reviewService.getAllReviews();
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminUpdateReviewApproval = async (req, res) => {
  try {
    const review = await reviewService.updateReviewApproval(req.params.id, req.body.isApproved);
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteReview = async (req, res) => {
  try {
    await reviewService.deleteReview(req.params.id);
    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getAllApprovedReviews,
  adminGetAllReviews,
  adminUpdateReviewApproval,
  adminDeleteReview,
};
