const Review = require("../models/review.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");

const formatReview = (r) => {
  if (!r) return null;
  const obj = r.toObject ? r.toObject() : r;
  obj.id = obj._id;
  return obj;
};

const enrichWithProductAndAuthor = (reviews) => {
  return reviews.map((r) => {
    const obj = r.toObject ? r.toObject() : r;
    obj.id = obj._id;
    
    // Map product
    const prod = obj.productId;
    obj.product = prod && typeof prod === "object" ? {
      name: prod.name,
      slug: prod.slug,
      images: (prod.images || []).map((img) => typeof img === "string" ? { url: img } : img),
    } : null;
    
    // Map author
    const author = obj.userId;
    obj.author = author && typeof author === "object" ? {
      avatar: author.avatar || null,
    } : { avatar: null };

    // Ensure database keys exist for flat fields
    obj.productId = prod && typeof prod === "object" ? prod._id : obj.productId;
    obj.userId = author && typeof author === "object" ? author._id : obj.userId;
    
    return obj;
  });
};

const createReview = async (reviewData) => {
  const created = await Review.create({
    userId: reviewData.user,
    name: reviewData.name,
    productId: reviewData.product,
    rating: reviewData.rating,
    comment: reviewData.comment,
    isApproved: reviewData.isApproved || false,
  });

  return formatReview(created);
};

const getProductReviews = async (productId) => {
  const reviews = await Review.find({
    productId: productId,
    isApproved: true
  }).sort({ createdAt: -1 });

  return reviews.map(formatReview);
};

const getAllApprovedReviews = async () => {
  const reviews = await Review.find({ isApproved: true })
    .populate("productId")
    .populate("userId")
    .sort({ createdAt: -1 });

  return enrichWithProductAndAuthor(reviews);
};

const getAllReviews = async () => {
  const reviews = await Review.find()
    .populate("productId")
    .populate("userId")
    .sort({ createdAt: -1 });

  return enrichWithProductAndAuthor(reviews);
};

const updateReviewApproval = async (id, isApproved) => {
  const updated = await Review.findByIdAndUpdate(
    id,
    { $set: { isApproved } },
    { new: true }
  );
  return formatReview(updated);
};

const deleteReview = async (id) => {
  const deleted = await Review.findByIdAndDelete(id);
  return formatReview(deleted);
};

module.exports = {
  createReview,
  getProductReviews,
  getAllApprovedReviews,
  getAllReviews,
  updateReviewApproval,
  deleteReview,
};