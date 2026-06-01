const Review = require("../models/review.model");

const createReview = async (reviewData) => {
  return await Review.create(reviewData);
};

const getProductReviews = async (productId) => {
  return await Review.find({ product: productId, isApproved: true }).sort({ createdAt: -1 });
};

const getAllApprovedReviews = async () => {
  return await Review.find({ isApproved: true }).populate("product", "name").sort({ createdAt: -1 });
};

const getAllReviews = async () => {
  return await Review.find().populate("product", "name").sort({ createdAt: -1 });
};

const updateReviewApproval = async (id, isApproved) => {
  return await Review.findByIdAndUpdate(id, { isApproved }, { new: true });
};

const deleteReview = async (id) => {
  return await Review.findByIdAndDelete(id);
};

module.exports = {
  createReview,
  getProductReviews,
  getAllReviews,
  updateReviewApproval,
  deleteReview,
};