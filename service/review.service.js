const { db } = require("../config/db.config");
const { review, product, user } = require("../db/schema");
const { eq, and, desc } = require("drizzle-orm");
const crypto = require("crypto");

const reviewSelect = {
  id: review.id,
  userId: review.userId,
  name: review.name,
  productId: review.productId,
  rating: review.rating,
  comment: review.comment,
  isApproved: review.isApproved,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  product: {
    name: product.name,
    slug: product.slug,
    images: product.images,
  },
  author: {
    avatar: user.avatar,
  },
};

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

  const [created] = await db.select().from(review).where(eq(review.id, reviewId)).limit(1);
  return created;
};

const getProductReviews = async (productId) => {
  return await db.select()
    .from(review)
    .where(and(
      eq(review.productId, productId),
      eq(review.isApproved, true)
    ))
    .orderBy(desc(review.createdAt));
};

const getAllApprovedReviews = async () => {
  const rows = await db.select(reviewSelect)
    .from(review)
    .leftJoin(product, eq(review.productId, product.id))
    .leftJoin(user, eq(review.userId, user.id))
    .where(eq(review.isApproved, true))
    .orderBy(desc(review.createdAt));

  return rows;
};

const getAllReviews = async () => {
  const rows = await db.select(reviewSelect)
    .from(review)
    .leftJoin(product, eq(review.productId, product.id))
    .leftJoin(user, eq(review.userId, user.id))
    .orderBy(desc(review.createdAt));

  return rows;
};

const updateReviewApproval = async (id, isApproved) => {
  await db.update(review)
    .set({ isApproved })
    .where(eq(review.id, id));

  const [updated] = await db.select().from(review).where(eq(review.id, id)).limit(1);
  return updated;
};

const deleteReview = async (id) => {
  const [deleted] = await db.select().from(review).where(eq(review.id, id)).limit(1);
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