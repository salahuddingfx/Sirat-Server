const Coupon = require("../models/coupon.model");

const createCoupon = async (couponData) => {
  return await Coupon.create(couponData);
};

const getAllCoupons = async () => {
  return await Coupon.find().sort({ createdAt: -1 });
};

const validateCoupon = async (code, totalAmount) => {
  const coupon = await Coupon.findOne({ code, isActive: true });
  
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
    discountAmount
  };
};

const updateCoupon = async (id, couponData) => {
  return await Coupon.findByIdAndUpdate(id, couponData, { new: true });
};

const deleteCoupon = async (id) => {
  return await Coupon.findByIdAndDelete(id);
};

module.exports = {
  createCoupon,
  getAllCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon,
};