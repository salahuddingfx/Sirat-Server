const Coupon = require("../models/coupon.model");

const formatCoupon = (c) => {
  if (!c) return null;
  const obj = c.toObject ? c.toObject() : c;
  obj.id = obj._id;
  return obj;
};

const createCoupon = async (couponData) => {
  const formattedData = { ...couponData };
  if (formattedData.code) {
    formattedData.code = formattedData.code.toUpperCase();
  }
  if (formattedData.expiryDate) {
    formattedData.expiryDate = new Date(formattedData.expiryDate);
  }

  const created = await Coupon.create(formattedData);
  return formatCoupon(created);
};

const getAllCoupons = async () => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return coupons.map(formatCoupon);
};

const validateCoupon = async (code, totalAmount) => {
  const foundCoupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
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

  const updated = await Coupon.findByIdAndUpdate(
    id,
    { $set: formattedData },
    { new: true }
  );
  return formatCoupon(updated);
};

const deleteCoupon = async (id) => {
  const deleted = await Coupon.findByIdAndDelete(id);
  return formatCoupon(deleted);
};

module.exports = {
  createCoupon,
  getAllCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon,
};