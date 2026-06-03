const { prisma } = require("../config/db.config");

const createCoupon = async (couponData) => {
  return await prisma.coupon.create({
    data: couponData,
  });
};

const getAllCoupons = async () => {
  return await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const validateCoupon = async (code, totalAmount) => {
  const coupon = await prisma.coupon.findFirst({
    where: { code: code.toUpperCase(), isActive: true },
  });

  if (!coupon) {
    throw new Error("Invalid or inactive coupon code.");
  }

  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    throw new Error("Coupon has expired.");
  }

  if (totalAmount < coupon.minPurchase) {
    throw new Error(`Minimum purchase of ${coupon.minPurchase} required for this coupon.`);
  }

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (totalAmount * coupon.discountValue) / 100;
  } else {
    discountAmount = coupon.discountValue;
  }

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
  };
};

const updateCoupon = async (id, couponData) => {
  return await prisma.coupon.update({
    where: { id },
    data: couponData,
  });
};

const deleteCoupon = async (id) => {
  return await prisma.coupon.delete({
    where: { id },
  });
};

module.exports = {
  createCoupon,
  getAllCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon,
};