const { db } = require("../config/db.config");
const { coupon } = require("../db/schema");
const { eq, and, desc } = require("drizzle-orm");
const crypto = require("crypto");

const createCoupon = async (couponData) => {
  const couponId = crypto.randomUUID();
  // Ensure the code is stored in uppercase
  const formattedData = {
    ...couponData,
    id: couponId,
  };
  if (formattedData.code) {
    formattedData.code = formattedData.code.toUpperCase();
  }
  if (formattedData.expiryDate) {
    formattedData.expiryDate = new Date(formattedData.expiryDate);
  }

  await db.insert(coupon).values(formattedData);
  return await db.query.coupon.findFirst({
    where: eq(coupon.id, couponId),
  });
};

const getAllCoupons = async () => {
  return await db.query.coupon.findMany({
    orderBy: [desc(coupon.createdAt)],
  });
};

const validateCoupon = async (code, totalAmount) => {
  const foundCoupon = await db.query.coupon.findFirst({
    where: and(
      eq(coupon.code, code.toUpperCase()),
      eq(coupon.isActive, true)
    ),
  });

  if (!foundCoupon) {
    throw new Error("Invalid or inactive coupon code.");
  }

  if (foundCoupon.expiryDate && new Date() > new Date(foundCoupon.expiryDate)) {
    throw new Error("Coupon has expired.");
  }

  if (totalAmount < foundCoupon.minPurchase) {
    throw new Error(`Minimum purchase of ${foundCoupon.minPurchase} required for this coupon.`);
  }

  let discountAmount = 0;
  if (foundCoupon.discountType === "percentage") {
    discountAmount = (totalAmount * foundCoupon.discountValue) / 100;
  } else {
    discountAmount = foundCoupon.discountValue;
  }

  return {
    code: foundCoupon.code,
    discountType: foundCoupon.discountType,
    discountValue: foundCoupon.discountValue,
    discountAmount,
  };
};

const updateCoupon = async (id, couponData) => {
  const formattedData = { ...couponData };
  if (formattedData.code) {
    formattedData.code = formattedData.code.toUpperCase();
  }
  if (formattedData.expiryDate) {
    formattedData.expiryDate = new Date(formattedData.expiryDate);
  }

  await db.update(coupon)
    .set(formattedData)
    .where(eq(coupon.id, id));

  return await db.query.coupon.findFirst({
    where: eq(coupon.id, id),
  });
};

const deleteCoupon = async (id) => {
  const deleted = await db.query.coupon.findFirst({
    where: eq(coupon.id, id),
  });
  if (deleted) {
    await db.delete(coupon).where(eq(coupon.id, id));
  }
  return deleted;
};

module.exports = {
  createCoupon,
  getAllCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon,
};