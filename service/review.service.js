const { prisma } = require("../config/db.config");

const createReview = async (reviewData) => {
  return await prisma.review.create({
    data: {
      userId: reviewData.user,
      name: reviewData.name,
      productId: reviewData.product,
      rating: reviewData.rating,
      comment: reviewData.comment,
      isApproved: reviewData.isApproved || false,
    },
  });
};

const getProductReviews = async (productId) => {
  return await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
  });
};

const getAllApprovedReviews = async () => {
  return await prisma.review.findMany({
    where: { isApproved: true },
    include: {
      product: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getAllReviews = async () => {
  return await prisma.review.findMany({
    include: {
      product: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const updateReviewApproval = async (id, isApproved) => {
  return await prisma.review.update({
    where: { id },
    data: { isApproved },
  });
};

const deleteReview = async (id) => {
  return await prisma.review.delete({
    where: { id },
  });
};

module.exports = {
  createReview,
  getProductReviews,
  getAllApprovedReviews,
  getAllReviews,
  updateReviewApproval,
  deleteReview,
};