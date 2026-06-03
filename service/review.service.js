const { db } = require("../config/db.config");
const { review } = require("../db/schema");
const { eq, and, desc } = require("drizzle-orm");
const crypto = require("crypto");

const createReview = async (reviewData) => {
  const reviewId = crypto.randomUUID();
  await db.insert(review).values({
    id: reviewId,
    userId: reviewData.user,
    name: reviewData.name,
    productId: reviewData.product,
    rating: reviewData.rating,
    comment: reviewData.comment,
    isApproved: reviewData.isApproved || false,
  });
  return await db.query.review.findFirst({
    where: eq(review.id, reviewId),
  });
};

const getProductReviews = async (productId) => {
  return await db.query.review.findMany({
    where: and(
      eq(review.productId, productId),
      eq(review.isApproved, true)
    ),
    orderBy: [desc(review.createdAt)],
  });
};

const getAllApprovedReviews = async () => {
  return await db.query.review.findMany({
    where: eq(review.isApproved, true),
    with: {
      product: {
        columns: { name: true },
      },
    },
    orderBy: [desc(review.createdAt)],
  });
};

const getAllReviews = async () => {
  return await db.query.review.findMany({
    with: {
      product: {
        columns: { name: true },
      },
    },
    orderBy: [desc(review.createdAt)],
  });
};

const updateReviewApproval = async (id, isApproved) => {
  await db.update(review)
    .set({ isApproved })
    .where(eq(review.id, id));
  return await db.query.review.findFirst({
    where: eq(review.id, id),
  });
};

const deleteReview = async (id) => {
  const deleted = await db.query.review.findFirst({
    where: eq(review.id, id),
  });
  if (deleted) {
    await db.delete(review).where(eq(review.id, id));
  }
  return deleted;
};

module.exports = {
  createReview,
  getProductReviews,
  getAllApprovedReviews,
  getAllReviews,
  updateReviewApproval,
  deleteReview,
};